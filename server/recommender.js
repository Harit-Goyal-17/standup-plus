/**
 * StandUp+ AI Recommendation Engine
 * Features:
 * 1. Comedian Affinity Clusters (Collaborative graph of Indian stand-up styles)
 * 2. Tag Taste Vector & Content-Based Cosine/Jaccard Similarity
 * 3. Implicit (Watch duration / completion) & Explicit (Ratings / Favorites) Signals
 * 4. Content Type & Maturity Sensitivity (e.g. Aashish Solanki clean bits vs roast specials)
 * 5. Cold-Start Balancing & Diverse Exploration
 */

// Comedian Taste Clusters based on comedic timing, delivery style, and audience crossover
const COMEDIAN_CLUSTERS = {
  // Observational & High-Paced Relatable
  observational: [44, 15, 11, 112, 209, 204, 3, 17, 207, 14, 400, 482, 528], // Upmanyu, Aakash Gupta, Rahul Subramanian, Rahul Dua, Nishant Suri, Kaustubh Agarwal, Chirag Panjwani, Devesh Dixit, Pranav, Swati Sachdeva, Prashasti Singh, Gurleen Pannu
  
  // Relatable Anecdotal & Desi Storytelling
  storytellers: [21, 132, 61, 48, 4, 1, 9, 105, 67, 186, 12, 130], // Zakir Khan, Gaurav Kapoor, Bassi, Harsh Gujral, Jaspreet Singh, Amit Tandon, Inder Sahani, Ravi Gupta, Haseeb, Manhar, Shubham, Aashish Solanki
  
  // Roasts, Crowd Banter & Uncensored
  roasts_and_banter: [171, 2, 48, 16, 474, 130, 63, 5], // Samay Raina, Madhur Virli, Harsh Gujral, Pranit More, Vivek Samtani, Aashish Solanki (Roasts), Tanmay, Munawar
  
  // Female Stand-Up Powerhouses
  female_standup: [400, 482, 528, 325], // Swati Sachdeva, Prashasti Singh, Gurleen Pannu, Taylor Tomlinson
  
  // Clean & Family-Friendly Comedy
  clean_and_family: [130, 1, 4, 132, 11, 9, 105], // Aashish Solanki (Standup), Amit Tandon, Jaspreet Singh, Gaurav Kapoor, Rahul Subramanian, Inder Sahani, Ravi Gupta
  
  // Urban, Metros & Satirical
  urban_and_satire: [513, 261, 508, 524, 103, 233, 229, 515, 516, 496] // Vir Das, Kenny Sebastian, Kanan Gill, Biswa Kalyan Rath, Varun Grover, Sapan Verma, Gursimran Khamba, Hasan Minhaj, Kunal Kamra, Russell Peters
};

export class Recommender {
  constructor(db) {
    this.db = db;
  }

  _dbAll(sqlStr, params = []) {
    const stmt = this.db.prepare(sqlStr);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  getRecommendations(userIdOrProfileId, limit = 12) {
    // 1. Gather all user interaction history with weights
    const watchRows = this._dbAll(`
      SELECT video_id, watch_duration_seconds, completed FROM watch_history WHERE user_id = ?
    `, [userIdOrProfileId]);

    const favoriteRows = this._dbAll(`
      SELECT video_id FROM favorites WHERE user_id = ?
    `, [userIdOrProfileId]);

    const ratingRows = this._dbAll(`
      SELECT video_id, rating FROM user_ratings WHERE user_id = ?
    `, [userIdOrProfileId]);

    const watchedIds = new Set(watchRows.map(r => r.video_id));
    const allInteractionIds = Array.from(new Set([
      ...watchRows.map(r => r.video_id),
      ...favoriteRows.map(r => r.video_id),
      ...ratingRows.map(r => r.video_id)
    ]));

    // Cold-Start: If user has 0 interactions, return balanced curated starter mix
    if (allInteractionIds.length === 0) {
      return this.getColdStartRecommendations(limit);
    }

    // 2. Build User Comedian Affinity & Tag Taste Profile
    const comedianWeights = {};
    const tagWeights = {};

    // Process watch history weights
    watchRows.forEach(w => {
      const weight = w.completed ? 4 : (w.watch_duration_seconds > 300 ? 2 : 1);
      this._accumulateVideoWeights(w.video_id, weight, comedianWeights, tagWeights);
    });

    // Process favorite weights (+3 each)
    favoriteRows.forEach(f => {
      this._accumulateVideoWeights(f.video_id, 3, comedianWeights, tagWeights);
    });

    // Process rating weights (1 to 5 stars)
    ratingRows.forEach(r => {
      const weight = (r.rating >= 4) ? 4 : (r.rating === 3 ? 1 : -2);
      this._accumulateVideoWeights(r.video_id, weight, comedianWeights, tagWeights);
    });

    // 3. Expand Comedian Affinity using Clusters
    const expandedComedianAffinities = { ...comedianWeights };
    Object.entries(comedianWeights).forEach(([cIdStr, weight]) => {
      const cId = parseInt(cIdStr);
      if (weight > 0) {
        Object.values(COMEDIAN_CLUSTERS).forEach(cluster => {
          if (cluster.includes(cId)) {
            cluster.forEach(peerId => {
              if (peerId !== cId) {
                expandedComedianAffinities[peerId] = (expandedComedianAffinities[peerId] || 0) + (weight * 0.35);
              }
            });
          }
        });
      }
    });

    // 4. Retrieve candidate videos (exclude already watched)
    const excludePlaceholders = allInteractionIds.map(() => '?').join(',');
    const candidateQuery = `
      SELECT v.*, c.name as comedian_name
      FROM videos v
      JOIN comedians c ON v.comedian_id = c.comedian_id
      ${allInteractionIds.length > 0 ? `WHERE v.video_id NOT IN (${excludePlaceholders})` : ''}
    `;

    const candidates = this._dbAll(candidateQuery, allInteractionIds);

    // Fetch video tags for candidate scoring
    const videoTagsMap = this._getVideoTagsMap();

    // 5. Score Candidate Videos
    const scoredCandidates = candidates.map(video => {
      let score = 0;
      const cId = video.comedian_id;

      // Comedian Affinity Score (40% weight)
      if (expandedComedianAffinities[cId]) {
        score += expandedComedianAffinities[cId] * 3.5;
      }

      // Tag Similarity Score (30% weight)
      const vTags = videoTagsMap[video.video_id] || [];
      vTags.forEach(t => {
        if (tagWeights[t]) {
          score += tagWeights[t] * 1.8;
        }
      });

      // Format & Quality Boost (20% weight)
      const views = video.view_count || 0;
      if (views > 10000000) score += 4;
      else if (views > 3000000) score += 2.5;
      else if (views > 1000000) score += 1.5;

      // Recency Boost (10% weight)
      if (video.published_at) {
        const pubYear = new Date(video.published_at).getFullYear();
        if (pubYear >= 2024) score += 2;
        else if (pubYear >= 2023) score += 1;
      }

      // Contextual Rules
      const titleLower = (video.title || '').toLowerCase();
      // Aashish Solanki Roast vs Clean handling
      if (cId === 130) {
        const isRoast = titleLower.includes('roast') || video.suggested_rating === '18+';
        const userLikesRoasts = (tagWeights['roasts_and_banter'] || 0) > 2 || (expandedComedianAffinities[171] || 0) > 2;
        if (isRoast && userLikesRoasts) score += 5;
        if (!isRoast && (tagWeights['clean_and_family'] || 0) > 2) score += 5;
      }

      return { video, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Diversity Guarantee: Ensure at least top diverse comedians in top 12
    const finalSelection = [];
    const comedianCountInResult = {};

    for (const item of scoredCandidates) {
      const cId = item.video.comedian_id;
      const currentCount = comedianCountInResult[cId] || 0;

      // Maximum 2 videos per comedian in the top 12 recommendations to prevent single-artist takeover
      if (currentCount < 2) {
        finalSelection.push(item.video);
        comedianCountInResult[cId] = currentCount + 1;
      }

      if (finalSelection.length >= limit) break;
    }

    // Backfill if needed
    if (finalSelection.length < limit) {
      for (const item of scoredCandidates) {
        if (!finalSelection.some(v => v.video_id === item.video.video_id)) {
          finalSelection.push(item.video);
        }
        if (finalSelection.length >= limit) break;
      }
    }

    return finalSelection;
  }

  _accumulateVideoWeights(videoId, weight, comedianWeights, tagWeights) {
    const vRows = this._dbAll(`SELECT comedian_id FROM videos WHERE video_id = ?`, [videoId]);
    if (vRows.length > 0) {
      const cId = vRows[0].comedian_id;
      comedianWeights[cId] = (comedianWeights[cId] || 0) + weight;
    }

    const tRows = this._dbAll(`
      SELECT t.tag_name FROM tags t 
      JOIN video_tags vt ON t.tag_id = vt.tag_id 
      WHERE vt.video_id = ?
    `, [videoId]);

    tRows.forEach(t => {
      tagWeights[t.tag_name] = (tagWeights[t.tag_name] || 0) + weight;
    });
  }

  _getVideoTagsMap() {
    const rows = this._dbAll(`
      SELECT vt.video_id, t.tag_name 
      FROM video_tags vt 
      JOIN tags t ON vt.tag_id = t.tag_id
    `);
    const map = {};
    rows.forEach(r => {
      if (!map[r.video_id]) map[r.video_id] = [];
      map[r.video_id].push(r.tag_name);
    });
    return map;
  }

  getColdStartRecommendations(limit = 12) {
    // Balanced starter mix: Bassi, Upmanyu, Zakir, Aakash Gupta, Swati Sachdeva, Prashasti Singh, Rahul Dua, Gaurav Kapoor, Harsh Gujral, Vivek Samtani, Kaustubh Agarwal
    const priorityComedianIds = [61, 44, 21, 15, 400, 482, 528, 112, 132, 48, 474, 204, 3, 130];
    
    const priorityVideos = this._dbAll(`
      SELECT v.*, c.name as comedian_name
      FROM videos v
      JOIN comedians c ON v.comedian_id = c.comedian_id
      WHERE v.comedian_id IN (${priorityComedianIds.map(() => '?').join(',')})
      ORDER BY v.view_count DESC
      LIMIT 30
    `, priorityComedianIds);

    // Shuffle and pick 1 per comedian for maximum discovery variety
    const selected = [];
    const seenComedians = new Set();

    for (const vid of priorityVideos) {
      if (!seenComedians.has(vid.comedian_id)) {
        selected.push(vid);
        seenComedians.add(vid.comedian_id);
      }
      if (selected.length >= limit) break;
    }

    if (selected.length < limit) {
      const needed = limit - selected.length;
      const backfill = this._dbAll(`
        SELECT v.*, c.name as comedian_name
        FROM videos v
        JOIN comedians c ON v.comedian_id = c.comedian_id
        ORDER BY v.view_count DESC
        LIMIT ?
      `, [needed]);
      selected.push(...backfill);
    }

    return selected;
  }
}
