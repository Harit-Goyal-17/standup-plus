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

  getRecommendations(userId, limit = 10) {
    const userHistory = this._dbAll(`
      SELECT video_id FROM watch_history WHERE user_id = ?
      UNION
      SELECT video_id FROM favorites WHERE user_id = ?
      UNION
      SELECT video_id FROM user_ratings WHERE user_id = ? AND rating >= 3
    `, [userId, userId, userId]).map(r => r.video_id);

    if (userHistory.length === 0) {
      return this.getColdStartRecommendations(limit);
    }

    // Find the user's top comedians based on their history
    const topComedians = this._dbAll(`
      SELECT comedian_id, COUNT(*) as interaction_count
      FROM videos
      WHERE video_id IN (${userHistory.map(() => '?').join(',')})
      GROUP BY comedian_id
      ORDER BY interaction_count DESC
      LIMIT 3
    `, [...userHistory]);

    if (topComedians.length === 0) {
      return this.getColdStartRecommendations(limit);
    }

    const topComedianIds = topComedians.map(c => c.comedian_id);

    // Get newest and most popular videos from those top comedians, excluding watched
    const recommended = this._dbAll(`
      SELECT v.video_id, v.title, v.view_count, v.thumbnail_url, v.duration_seconds, v.suggested_rating, c.name as comedian_name
      FROM videos v
      JOIN comedians c ON v.comedian_id = c.comedian_id
      WHERE v.comedian_id IN (${topComedianIds.map(() => '?').join(',')})
        AND v.video_id NOT IN (${userHistory.map(() => '?').join(',')})
      ORDER BY v.published_at DESC, v.view_count DESC
      LIMIT ?
    `, [...topComedianIds, ...userHistory, limit]);

    // If we didn't find enough, backfill with top videos overall (excluding history)
    if (recommended.length < limit) {
      const needed = limit - recommended.length;
      const alreadyRecommended = recommended.map(v => v.video_id);
      const excludeList = [...userHistory, ...alreadyRecommended];
      
      const backfill = this._dbAll(`
        SELECT v.video_id, v.title, v.view_count, v.thumbnail_url, v.duration_seconds, v.suggested_rating, c.name as comedian_name
        FROM videos v
        JOIN comedians c ON v.comedian_id = c.comedian_id
        WHERE v.video_id NOT IN (${excludeList.length > 0 ? excludeList.map(() => '?').join(',') : "''"})
        ORDER BY v.view_count DESC
        LIMIT ?
      `, [...excludeList, needed]);
      
      return [...recommended, ...backfill];
    }

    return recommended;
  }

  getColdStartRecommendations(limit) {
    return this._dbAll(`
      SELECT v.*, c.name as comedian_name
      FROM videos v
      JOIN comedians c ON v.comedian_id = c.comedian_id
      ORDER BY v.view_count DESC
      LIMIT ?
    `, [limit]);
  }
}
