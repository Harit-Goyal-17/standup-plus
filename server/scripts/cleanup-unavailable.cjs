const fs = require('fs');
const path = require('path');
const https = require('https');
const initSqlJs = require('sql.js');

function checkOEmbed(videoId) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
      // 200 = available, 400/401/404 = private, deleted, or unavailable
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(true)); // On network error, don't mistakenly delete
    req.on('timeout', () => { req.destroy(); resolve(true); });
  });
}

async function runCleanup() {
  console.log('🚀 Starting Database & Video Cleanup...');
  const SQL = await initSqlJs();
  const dbPath = path.resolve(__dirname, '../../standup.db');
  if (!fs.existsSync(dbPath)) {
    console.error('standup.db not found at', dbPath);
    return;
  }
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

  // 1. Fix mis-tagged standup specials
  console.log('1. Fixing mis-tagged content types...');
  run(`UPDATE videos SET content_type = 'full_special' WHERE LOWER(title) LIKE '%still alive%' AND LOWER(title) LIKE '%samay%'`);
  run(`UPDATE videos SET content_type = 'full_special' WHERE LOWER(title) LIKE '%act your age%' AND LOWER(title) LIKE '%russell peters%'`);
  run(`UPDATE videos SET content_type = 'episode' WHERE LOWER(title) LIKE '%pitch please%'`);

  // 2. Remove gaming, chess streams, podcast clutter (Simple Ken)
  console.log('2. Removing gaming streams & non-standup podcast clutter...');
  const nonStandupTitles = [
    '%propnight%',
    '%#iqooraidnights%',
    '%chess grind%',
    '%good afternoon chess%',
    '%epic live simul%',
    '%comedians over the board%',
    '%chilling with chat%',
    '%simple ken%',
    '%24 stuns in propnight%',
    '%reaching 1900%'
  ];

  for (const pattern of nonStandupTitles) {
    const matched = query(`SELECT video_id, title FROM videos WHERE LOWER(title) LIKE ?`, [pattern]);
    for (const row of matched) {
      console.log(`🗑️ Deleting non-standup: [${row.video_id}] ${row.title}`);
      run(`DELETE FROM videos WHERE video_id = ?`, [row.video_id]);
      run(`DELETE FROM video_tags WHERE video_id = ?`, [row.video_id]);
    }
  }

  // Also remove remaining content_type = 'gaming'
  const gamingVideos = query(`SELECT video_id, title FROM videos WHERE content_type = 'gaming'`);
  for (const row of gamingVideos) {
    console.log(`🗑️ Deleting gaming video: [${row.video_id}] ${row.title}`);
    run(`DELETE FROM videos WHERE video_id = ?`, [row.video_id]);
    run(`DELETE FROM video_tags WHERE video_id = ?`, [row.video_id]);
  }

  // 3. Verify availability of all videos against YouTube oEmbed
  const allVideos = query(`SELECT v.video_id, v.title, c.name as comedian_name FROM videos v JOIN comedians c ON v.comedian_id = c.comedian_id`);
  console.log(`3. Checking availability of ${allVideos.length} remaining videos via oEmbed...`);

  let deletedCount = 0;
  const batchSize = 15;
  for (let i = 0; i < allVideos.length; i += batchSize) {
    const batch = allVideos.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (v) => {
      const isAvailable = await checkOEmbed(v.video_id);
      return { ...v, isAvailable };
    }));

    for (const r of results) {
      if (!r.isAvailable) {
        deletedCount++;
        console.log(`❌ Dead / Unavailable Video: [${r.video_id}] "${r.title}" (${r.comedian_name})`);
        run(`DELETE FROM videos WHERE video_id = ?`, [r.video_id]);
        run(`DELETE FROM video_tags WHERE video_id = ?`, [r.video_id]);
      }
    }

    if ((i + batchSize) % 150 === 0 || i + batchSize >= allVideos.length) {
      console.log(`   Checked ${Math.min(i + batchSize, allVideos.length)}/${allVideos.length} videos...`);
    }
  }

  console.log(`\nCleanup complete! Deleted ${deletedCount} unavailable videos.`);
  const remaining = query(`SELECT COUNT(*) as count FROM videos`)[0].count;
  console.log(`Remaining valid videos: ${remaining}`);

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log(`Saved updated database to ${dbPath}`);
}

runCleanup().catch(err => {
  console.error('Error during cleanup:', err);
});
