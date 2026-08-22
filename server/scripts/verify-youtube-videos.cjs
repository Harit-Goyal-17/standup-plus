const fs = require('fs');
const path = require('path');
const https = require('https');
const initSqlJs = require('sql.js');

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function verifyAll() {
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

  const run = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
  };

  const allVideos = query(`SELECT v.video_id, v.title, v.comedian_id, c.name as comedian_name FROM videos v JOIN comedians c ON v.comedian_id = c.comedian_id`);
  console.log(`Checking ${allVideos.length} videos in standup.db...`);

  let invalidCount = 0;
  for (let i = 0; i < allVideos.length; i++) {
    const v = allVideos[i];
    const thumbUrl = `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`;
    const isValid = await checkUrl(thumbUrl);
    if (!isValid) {
      invalidCount++;
      console.log(`❌ Dead video: [${v.video_id}] "${v.title}" (${v.comedian_name})`);
      run(`DELETE FROM videos WHERE video_id = ?`, [v.video_id]);
      run(`DELETE FROM video_tags WHERE video_id = ?`, [v.video_id]);
    }
  }

  console.log(`\nRemoved ${invalidCount} dead videos from database.`);
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log(`Database saved successfully.`);
}

verifyAll();
