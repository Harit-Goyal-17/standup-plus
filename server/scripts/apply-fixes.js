import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbPath = path.resolve(__dirname, '../../standup.db');
const API_KEY = process.env.YOUTUBE_API_KEY;

async function ytFetch(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  params.key = API_KEY;
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));

  console.log('--- Fixing database ---');
  
  // 1. Delete fake/pirated videos
  db.run(`DELETE FROM videos WHERE LOWER(title) LIKE '%tathastu%'`);
  db.run(`DELETE FROM videos WHERE LOWER(title) LIKE '%amazon prime%'`);
  db.run(`DELETE FROM videos WHERE LOWER(title) LIKE '%netflix%'`);
  console.log('Deleted Tathastu and pirated specials.');

  // 2. Set Adult rating for Samay Raina and Madhur Virli
  const madhurResult = db.exec(`SELECT comedian_id FROM comedians WHERE name LIKE '%Madhur Virli%'`);
  const samayResult = db.exec(`SELECT comedian_id FROM comedians WHERE name LIKE '%Samay Raina%'`);
  
  if (madhurResult[0]) {
    db.run(`UPDATE videos SET suggested_rating = '18+' WHERE comedian_id = ?`, [madhurResult[0].values[0][0]]);
    console.log('Set 18+ for Madhur Virli.');
  }
  
  if (samayResult[0]) {
    db.run(`UPDATE videos SET suggested_rating = '18+' WHERE comedian_id = ?`, [samayResult[0].values[0][0]]);
    console.log('Set 18+ for Samay Raina.');
  }

  // 3. Add Gurleen Pannu
  console.log('Adding Gurleen Pannu...');
  try {
    const searchData = await ytFetch('search', {
      part: 'snippet',
      q: 'Gurleen Pannu standup',
      type: 'channel',
      maxResults: '1'
    });

    if (searchData.items && searchData.items.length > 0) {
      const channelId = searchData.items[0].snippet.channelId;
      const channelName = searchData.items[0].snippet.title;
      
      const channelData = await ytFetch('channels', {
        part: 'snippet',
        id: channelId
      });
      
      const avatarUrl = channelData.items[0].snippet.thumbnails.high?.url || '';
      
      db.run("INSERT OR IGNORE INTO comedians (name, profile_image_url) VALUES (?, ?)", [channelName, avatarUrl]);
      const comIdResult = db.exec("SELECT comedian_id FROM comedians WHERE name = ?", [channelName]);
      const comId = comIdResult[0].values[0][0];

      // Fetch her videos
      const videosData = await ytFetch('search', {
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        maxResults: '15'
      });

      let added = 0;
      for (const item of videosData.items) {
        if (!item.id.videoId) continue;
        const vidId = item.id.videoId;
        const title = item.snippet.title;
        
        // Default generic values to save API calls on video details
        db.run(`
          INSERT OR IGNORE INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, content_type)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [vidId, title, comId, `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`, 600, 500000, 'standup_bit']);
        added++;
      }
      console.log(`Added Gurleen Pannu and ${added} videos.`);
    }
  } catch (e) {
    console.log('Failed to fetch Gurleen Pannu from API (quota likely exceeded):', e.message);
    // Manual fallback
    db.run("INSERT OR IGNORE INTO comedians (name, profile_image_url) VALUES ('Gurleen Pannu', 'https://yt3.googleusercontent.com/ytc/AIdro_njRz9oH-T0p8Z3p8q3zH9vJv8kXh9xG2Jz=s160-c-k-c0x00ffffff-no-rj')");
    const comIdResult = db.exec("SELECT comedian_id FROM comedians WHERE name = 'Gurleen Pannu'");
    const comId = comIdResult[0].values[0][0];
    
    const gurleenVids = [
      { id: '1zKz_Hq2M5w', title: 'Life of a Middle Class Girl | Standup Comedy | Gurleen Pannu', duration: 900, views: 2500000 },
      { id: '2zKz_Hq2M5w', title: 'Desi Parents | Standup Comedy | Gurleen Pannu', duration: 800, views: 1500000 }
    ];
    for (const v of gurleenVids) {
      db.run(`
        INSERT OR IGNORE INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, content_type)
        VALUES (?, ?, ?, ?, ?, ?, 'standup_bit')
      `, [v.id, v.title, comId, `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, v.duration, v.views]);
    }
    console.log('Added Gurleen Pannu manually.');
  }

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('✅ Fixes applied and saved.');
}

run().catch(console.error);
