const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const initSqlJs = require('sql.js');

dotenv.config({ path: path.join(__dirname, '../.env') });
const API_KEY = process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.trim() : '';

if (!API_KEY) {
  console.error('ERROR: YOUTUBE_API_KEY not set in server/.env');
  process.exit(1);
}

const SHOW_SEARCHES = [
  { query: 'RelationSh!t Advice Raunaq Rajani full episode', comedianId: 478 },
  { query: 'Relationshit Advice Raunaq Rajani episode', comedianId: 478 },
  { query: 'Judge Me If You Can Ashish Solanki episode', comedianId: 130 },
  { query: 'Pretty Good Roast Ashish Solanki episode', comedianId: 130 },
  { query: 'BroCode Roast Ashish Solanki', comedianId: 130 },
  { query: 'Lie Hard Gaurav Kapoor episode', comedianId: 132 },
  { query: 'Akal Ke Ghode Kaustubh Agarwal episode', comedianId: 204 },
  { query: 'Pitch Please Rahul Dua episode', comedianId: 112 },
  { query: "India's Got Latent Samay Raina episode", comedianId: 171 },
  { query: 'Who Let The Drunks Out Swati Sachdeva', comedianId: 400 },
  { query: 'Madhur Model Madhur Virli', comedianId: 2 },
  { query: 'Loose Emotions Vidit Sharma', comedianId: 268 },
  { query: 'Andha Pyaar Vivek Samtani episode', comedianId: 474 },
  { query: 'Gaurav Kapoor stand up comedy new', comedianId: 132 },
  { query: 'Aashish Solanki stand up comedy new', comedianId: 130 },
  { query: 'Raunaq Rajani stand up comedy new', comedianId: 478 },
  { query: 'Kaustubh Agarwal stand up comedy new', comedianId: 204 },
  { query: 'Anubhav Singh Bassi stand up comedy new', comedianId: 61 },
  { query: 'Abhishek Upmanyu stand up comedy', comedianId: 44 },
  { query: 'Zakir Khan stand up comedy special', comedianId: 21 },
  { query: 'Harsh Gujral stand up comedy new', comedianId: 48 },
  { query: 'Samay Raina stand up comedy', comedianId: 171 },
  { query: 'Swati Sachdeva stand up comedy', comedianId: 400 },
  { query: 'Prashasti Singh stand up comedy', comedianId: 482 },
  { query: 'Gurleen Pannu stand up comedy', comedianId: 528 },
  { query: 'Ravi Gupta stand up comedy', comedianId: 105 }
];

const NEGATIVE_KEYWORDS = [
  'gaming', 'propnight', 'chess', 'gta', 'minecraft', 'vlog', 'unboxing',
  'reaction', 'podcast', 'simple ken', 'shorts', 'reels', '#shorts', 'promo',
  'trailer', 'behind the scenes', 'interview only', 'song', 'music video'
];

function isStandup(title, desc = '') {
  const text = (title + ' ' + desc).toLowerCase();
  for (const n of NEGATIVE_KEYWORDS) {
    if (text.includes(n)) return false;
  }
  return true;
}

function detectContentType(title) {
  const lower = title.toLowerCase();
  if (lower.includes('full special') || lower.includes('special') || lower.includes('full show')) return 'full_special';
  if (
    lower.includes('lie hard') || lower.includes('akal ke ghode') || lower.includes('relationsh') ||
    lower.includes('judge me') || lower.includes('pretty good roast') || lower.includes('brocode') ||
    lower.includes('pitch please') || lower.includes('got latent') || lower.includes('latent') ||
    lower.includes('who let the drunks out') || lower.includes('madhur model') ||
    lower.includes('andha pyaar') || lower.includes('loose emotions') || lower.includes('ep')
  ) {
    return 'episode';
  }
  if (lower.includes('roast')) return 'roast';
  if (lower.includes('crowd work') || lower.includes('crowdwork')) return 'crowd_work';
  return 'standup_bit';
}

function detectRating(title) {
  const lower = title.toLowerCase();
  if (lower.includes('roast') || lower.includes('latent') || lower.includes('drunks') || lower.includes('madhur')) return '18+';
  if (lower.includes('lie hard') || lower.includes('relationsh') || lower.includes('andha pyaar') || lower.includes('pitch please')) return '16+';
  return 'U/A';
}

// Parse ISO 8601 duration (e.g. PT24M13S) into seconds
function parseDuration(pt) {
  if (!pt) return 1200;
  const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 1200;
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  return (h * 3600) + (m * 60) + s;
}

async function fetchYouTube(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  params.key = API_KEY;
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`YouTube API ${res.status}: ${txt}`);
  }
  return res.json();
}

async function run() {
  console.log('📡 Starting Comprehensive Live YouTube Ingestion...');
  const SQL = await initSqlJs();
  const dbPath = path.resolve(__dirname, '../../standup.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  const query = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };

  const runSql = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
  };

  let totalAdded = 0;

  for (const target of SHOW_SEARCHES) {
    try {
      console.log(`\n🔍 Searching: "${target.query}"`);
      const searchData = await fetchYouTube('search', {
        part: 'snippet',
        q: target.query,
        type: 'video',
        order: 'date',
        maxResults: '15'
      });

      const videoIds = (searchData.items || []).map(it => it.id.videoId).filter(Boolean);
      if (videoIds.length === 0) continue;

      // Fetch full content details (duration, statistics)
      const detailsData = await fetchYouTube('videos', {
        part: 'snippet,contentDetails,statistics',
        id: videoIds.join(',')
      });

      for (const item of detailsData.items || []) {
        const vidId = item.id;
        const snippet = item.snippet || {};
        const title = snippet.title || '';
        const desc = snippet.description || '';
        const publishedAt = snippet.publishedAt || new Date().toISOString();
        const thumb = snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
        const durationSec = parseDuration(item.contentDetails?.duration);
        const views = parseInt(item.statistics?.viewCount || '100000');
        const likes = parseInt(item.statistics?.likeCount || '5000');

        if (!isStandup(title, desc)) {
          console.log(`  ⏩ Skipping non-standup: ${title}`);
          continue;
        }

        // Check if exists
        const exists = query(`SELECT video_id FROM videos WHERE video_id = ?`, [vidId]);
        const contentType = detectContentType(title);
        const rating = detectRating(title);

        if (exists.length === 0) {
          runSql(`
            INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, like_count, published_at, suggested_rating, content_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [vidId, title, target.comedianId, thumb, durationSec, views, likes, publishedAt, rating, contentType]);

          totalAdded++;
          console.log(`  ✨ Added: [${vidId}] "${title}" (${durationSec}s, ${views} views)`);
        } else {
          // Update view count and details
          runSql(`
            UPDATE videos SET view_count = ?, like_count = ?, thumbnail_url = ?, duration_seconds = ?, content_type = ?
            WHERE video_id = ?
          `, [views, likes, thumb, durationSec, contentType, vidId]);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Error querying "${target.query}":`, err.message);
    }
  }

  console.log(`\n🎉 Total new videos added: ${totalAdded}`);
  const totalCount = query(`SELECT COUNT(*) as c FROM videos`)[0].c;
  console.log(`📊 Total videos now in database: ${totalCount}`);

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log(`💾 Saved updated standup.db`);
}

run().catch(err => {
  console.error('Fatal fetch error:', err);
});
