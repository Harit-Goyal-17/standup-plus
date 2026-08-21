import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../standup.db');

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Insert Madhur Virli if not exists
  db.run("INSERT OR IGNORE INTO comedians (name, profile_image_url) VALUES ('Madhur Virli', 'https://yt3.googleusercontent.com/ytc/AIdro_kXh6N4m-h2N8p-Zg01kXh_lM5kF20ZzZ-22X3w=s160-c-k-c0x00ffffff-no-rj')");
  
  const comedianResult = db.exec("SELECT comedian_id FROM comedians WHERE name = 'Madhur Virli'");
  const comedianId = comedianResult[0].values[0][0];

  const madhurVideos = [
    { id: '1zKz_Hq2M5w', title: 'Madhur Model | Full Stand-Up Comedy Special | Madhur Virli', duration: 3200, views: 2500000, type: 'full_special' },
    { id: 'oGkM1a4Hh1o', title: 'My Ex-Girlfriend | Stand Up Comedy | Madhur Virli', duration: 800, views: 1200000, type: 'standup_bit' },
    { id: 't2_oY_W81w0', title: 'Dad\'s Operation | Stand Up Comedy | Madhur Virli', duration: 900, views: 1800000, type: 'standup_bit' },
    { id: 'Y_5-K_Xg_P4', title: 'Hostel Life | Stand Up Comedy | Madhur Virli', duration: 600, views: 900000, type: 'standup_bit' }
  ];

  for (const v of madhurVideos) {
    db.run(`
      INSERT OR IGNORE INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, content_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [v.id, v.title, comedianId, `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, v.duration, v.views, v.type]);
  }

  console.log('Added Madhur Virli and videos manually.');
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

run();
