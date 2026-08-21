import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_KEY = process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.trim() : '';

/**
 * Fetch latest stand-up uploads for all comedians from YouTube Data API v3
 */
export async function syncComedianVideos(db, saveDb) {
  if (!API_KEY) {
    console.log('[YouTubeSync] No YOUTUBE_API_KEY found in .env, skipping automatic sync.');
    return { synced: 0, message: 'No API key configured' };
  }

  console.log('[YouTubeSync] Starting automated YouTube sync for comedians...');

  try {
    // Get all comedians with names
    const stmt = db.prepare('SELECT comedian_id, name FROM comedians ORDER BY comedian_id ASC LIMIT 40');
    const comedians = [];
    while (stmt.step()) {
      comedians.push(stmt.getAsObject());
    }
    stmt.free();

    let totalNewVideos = 0;

    for (const comedian of comedians) {
      try {
        const query = `${comedian.name} Stand up Comedy`;
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.append('key', API_KEY);
        url.searchParams.append('part', 'snippet');
        url.searchParams.append('q', query);
        url.searchParams.append('type', 'video');
        url.searchParams.append('order', 'date');
        url.searchParams.append('maxResults', '5');

        const res = await fetch(url.toString());
        if (!res.ok) continue;
        const data = await res.json();

        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            const vidId = item.id.videoId;
            const title = item.snippet.title;
            const thumb = item.snippet.thumbnails.high?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;
            const publishedAt = item.snippet.publishedAt;

            // Check if already in database
            const checkStmt = db.prepare('SELECT video_id FROM videos WHERE video_id = ?');
            checkStmt.bind([vidId]);
            const exists = checkStmt.step();
            checkStmt.free();

            if (!exists) {
              db.run(`
                INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, published_at, suggested_rating, content_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'U/A 16+', 'standup_bit')
              `, [vidId, title, comedian.comedian_id, thumb, 960, 500000, publishedAt]);
              totalNewVideos++;
            }
          }
        }
      } catch (err) {
        console.warn(`[YouTubeSync] Failed sync for ${comedian.name}:`, err.message);
      }
    }

    if (totalNewVideos > 0 && typeof saveDb === 'function') {
      saveDb();
    }

    console.log(`[YouTubeSync] Automated sync complete. Added ${totalNewVideos} new videos.`);
    return { synced: totalNewVideos, success: true };
  } catch (err) {
    console.error('[YouTubeSync] Sync error:', err);
    return { synced: 0, error: err.message };
  }
}

/**
 * Initialize background timer to run every 6 hours
 */
export function startPeriodicSync(db, saveDb) {
  // Run on startup after 30 seconds
  setTimeout(() => {
    syncComedianVideos(db, saveDb).catch(() => {});
  }, 30000);

  // Repeat every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    syncComedianVideos(db, saveDb).catch(() => {});
  }, SIX_HOURS);

  console.log('[YouTubeSync] Background recurring sync scheduled (every 6 hours).');
}
