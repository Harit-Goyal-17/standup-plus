import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  { handle: 'TandonAmit', comedianId: 1, name: 'Amit Tandon' },
  { handle: 'vaibhavkarn', comedianId: 530, name: 'Vaibhav Karn' },
  { handle: 'trishapathakcomedy', comedianId: 531, name: 'Trisha Pathak' }
];

const MIN_DURATION = 240; // 4 minutes minimum - strictly exclude shorts/reels

const NEGATIVE_KEYWORDS = [
  'gaming', 'propnight', 'chess', 'gta', 'minecraft', 'vlog', 'unboxing',
  'reaction', 'podcast', 'simple ken', 'shorts', 'reels', '#shorts', '#short', '#reels', 'promo',
  'trailer', 'behind the scenes', 'interview only', 'song', 'music video', 'teaser'
];

function isStandup(title, desc = '', duration = 1200) {
  if (duration < MIN_DURATION) return false;
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
  if (lower.includes('crowd work') || lower.includes('crowdwork')) return 'crowd_work';
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

export async function syncComedianVideos(db, saveDb) {
  if (!API_KEY) {
    console.log('[YouTubeSync] No YOUTUBE_API_KEY found, skipping automated sync.');
    return { synced: 0, message: 'No API key configured' };
  }

  console.log('[YouTubeSync] 🔄 Starting automated channel uploads sync from YouTube...');
  let totalNewVideos = 0;

  const dbGet = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  };

  const dbRun = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
  };

  for (const c of COMEDIAN_HANDLES) {
    try {
      const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${c.handle}&key=${API_KEY}`);
      if (!chRes.ok) continue;
      const chData = await chRes.json();
      
      if (!chData.items || chData.items.length === 0) continue;
      const uploadsId = chData.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsId) continue;

      const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsId}&maxResults=15&key=${API_KEY}`);
      if (!plRes.ok) continue;
      const plData = await plRes.json();

      if (!plData.items || plData.items.length === 0) continue;

      const videoIds = plData.items.map(it => it.snippet?.resourceId?.videoId).filter(Boolean);
      if (videoIds.length === 0) continue;

      const detRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds.join(',')}&key=${API_KEY}`);
      if (!detRes.ok) continue;
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

        if (duration < MIN_DURATION || !isStandup(title, desc, duration)) {
          // If a short video was previously ingested, clean it up
          dbRun('DELETE FROM videos WHERE video_id = ? AND duration_seconds < ?', [vidId, MIN_DURATION]);
          continue;
        }

        const exists = dbGet('SELECT video_id FROM videos WHERE video_id = ?', [vidId]);
        const contentType = detectContentType(title);
        const rating = detectRating(title);

        if (!exists) {
          dbRun(`
            INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, like_count, published_at, suggested_rating, content_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [vidId, title, c.comedianId, thumb, duration, views, likes, publishedAt, rating, contentType]);

          totalNewVideos++;
          console.log(`[YouTubeSync] ✨ Ingested new video: [${vidId}] "${title}" (${c.name})`);
        } else {
          dbRun(`
            UPDATE videos SET view_count = ?, like_count = ?, thumbnail_url = ?, duration_seconds = ?, content_type = ?
            WHERE video_id = ?
          `, [views, likes, thumb, duration, contentType, vidId]);
        }
      }
    } catch (err) {
      console.warn(`[YouTubeSync] Sync note for ${c.name}:`, err.message);
    }
  }

  if (totalNewVideos > 0 && typeof saveDb === 'function') {
    saveDb();
    console.log(`[YouTubeSync] ✅ Database updated and saved. Total new uploads: ${totalNewVideos}`);
  }

  return { synced: totalNewVideos, success: true };
}

export function startPeriodicSync(db, saveDb) {
  setTimeout(() => {
    syncComedianVideos(db, saveDb).catch((err) => {
      console.warn('[YouTubeSync] Initial sync note:', err.message);
    });
  }, 15000);

  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    syncComedianVideos(db, saveDb).catch((err) => {
      console.warn('[YouTubeSync] Recurring sync note:', err.message);
    });
  }, SIX_HOURS);

  console.log('[YouTubeSync] 🕒 Automated background channel sync scheduled (every 6 hours).');
}
