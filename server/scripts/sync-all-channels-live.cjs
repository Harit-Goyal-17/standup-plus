const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const initSqlJs = require('sql.js');

dotenv.config({ path: path.join(__dirname, '../.env') });
const API_KEY = process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.trim() : '';

const COMEDIAN_HANDLES = [
  { handle: 'raunaqrajani', comedianId: 478, name: 'Raunaq Rajani' },
  { handle: 'AshishSolanki', comedianId: 130, name: 'Aashish Solanki' },
  { handle: 'gauravkapoor', comedianId: 132, name: 'Gaurav Kapoor' },
  { handle: 'ComicKaustubhAgarwal', comedianId: 204, name: 'Kaustubh Agarwal' },
  { handle: 'SamayRainaOfficial', comedianId: 171, name: 'Samay Raina' },
  { handle: 'TheRahulDua', comedianId: 112, name: 'Rahul Dua' },
  { handle: 'swatisachdeva95', comedianId: 400, name: 'Swati Sachdeva' },
  { handle: 'viditsharmaaa', comedianId: 268, name: 'Vidit Sharma' },
  { handle: 'VivekSamtani', comedianId: 474, name: 'Vivek Samtani' },
  { handle: 'beabassi', comedianId: 61, name: 'Anubhav Singh Bassi' },
  { handle: 'abhishekupmanyu', comedianId: 44, name: 'Abhishek Upmanyu' },
  { handle: 'ZakirKhan', comedianId: 21, name: 'Zakir Khan' },
  { handle: 'HarshGujral', comedianId: 48, name: 'Harsh Gujral' },
  { handle: 'AakashGupta', comedianId: 15, name: 'Aakash Gupta' },
  { handle: 'RahulSubramanian', comedianId: 11, name: 'Rahul Subramanian' },
  { handle: 'NishantSuri11', comedianId: 209, name: 'Nishant Suri' },
  { handle: 'KennySebastian', comedianId: 261, name: 'Kenny Sebastian' },
  { handle: 'sapanv', comedianId: 233, name: 'Sapan Verma' },
  { handle: 'JaspreetSinghComedy', comedianId: 4, name: 'Jaspreet Singh' },
  { handle: 'madhurvirliraw', comedianId: 2, name: 'Madhur Virli' },
  { handle: 'PrashastiSinghStandup', comedianId: 482, name: 'Prashasti Singh' },
  { handle: 'pannugurleen', comedianId: 528, name: 'Gurleen Pannu' },
  { handle: 'ChiragPanjwani', comedianId: 3, name: 'Chirag Panjwani' },
  { handle: 'raviguptacomedy', comedianId: 105, name: 'Ravi Gupta' },
  { handle: 'TandonAmit', comedianId: 1, name: 'Amit Tandon' }
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
    lower.includes('andha pyaar') || lower.includes('loose emotions') || lower.includes('ep ') || lower.includes('ep.') || lower.includes('episode')
  ) {
    return 'episode';
  }
  if (lower.includes('roast')) return 'roast';
  if (lower.includes('crowd work') || lower.includes('crowdwork') || lower.includes('audience')) return 'crowd_work';
  return 'standup_bit';
}

function detectRating(title) {
  const lower = title.toLowerCase();
  if (lower.includes('roast') || lower.includes('latent') || lower.includes('drunks') || lower.includes('madhur')) return '18+';
  if (lower.includes('lie hard') || lower.includes('relationsh') || lower.includes('andha pyaar') || lower.includes('pitch please')) return '16+';
  return 'U/A';
}

function parseDuration(pt) {
  if (!pt) return 1200;
  const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 1200;
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  return (h * 3600) + (m * 60) + s;
}

async function run() {
  console.log('🚀 Fetching channel uploads for all top comedians...');
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

  let totalNew = 0;

  for (const c of COMEDIAN_HANDLES) {
    try {
      console.log(`\n🎭 Looking up handle @${c.handle} (${c.name})...`);
      const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${c.handle}&key=${API_KEY}`);
      const chData = await chRes.json();
      
      if (!chData.items || chData.items.length === 0) {
        console.warn(`  Handle @${c.handle} not found`);
        continue;
      }

      const uploadsId = chData.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsId) continue;

      const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=30&key=${API_KEY}`);
      const plData = await plRes.json();

      if (!plData.items || plData.items.length === 0) continue;

      const videoIds = plData.items.map(it => it.snippet?.resourceId?.videoId).filter(Boolean);

      // Fetch video details in batch
      const detRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${API_KEY}`);
      const detData = await detRes.json();

      for (const item of detData.items || []) {
        const vidId = item.id;
        const snippet = item.snippet || {};
        const title = snippet.title || '';
        const desc = snippet.description || '';
        const publishedAt = snippet.publishedAt || new Date().toISOString();
        const thumb = snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
        const duration = parseDuration(item.contentDetails?.duration);
        const views = parseInt(item.statistics?.viewCount || '100000');
        const likes = parseInt(item.statistics?.likeCount || '5000');

        if (!isStandup(title, desc)) continue;

        const exists = query(`SELECT video_id FROM videos WHERE video_id = ?`, [vidId]);
        const contentType = detectContentType(title);
        const rating = detectRating(title);

        if (exists.length === 0) {
          runSql(`
            INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, like_count, published_at, suggested_rating, content_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [vidId, title, c.comedianId, thumb, duration, views, likes, publishedAt, rating, contentType]);

          totalNew++;
          console.log(`  ✨ Added: [${vidId}] "${title}" (${duration}s)`);
        } else {
          runSql(`
            UPDATE videos SET view_count = ?, like_count = ?, thumbnail_url = ?, duration_seconds = ?, content_type = ?
            WHERE video_id = ?
          `, [views, likes, thumb, duration, contentType, vidId]);
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Error syncing ${c.name}:`, err.message);
    }
  }

  console.log(`\n🎉 Ingestion finished! Added ${totalNew} brand new videos directly from YouTube channels.`);
  const count = query('SELECT COUNT(*) as c FROM videos')[0].c;
  console.log(`📊 Total genuine videos in database: ${count}`);

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('💾 Database successfully saved to disk.');
}

run().catch(err => {
  console.error('Fatal sync error:', err);
});
