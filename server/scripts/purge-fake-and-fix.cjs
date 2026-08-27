const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function purgeAndFix() {
  console.log('🚀 Starting Complete Purge of Fake Video IDs & Non-Standup Content...');
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

  // 1. All fabricated/mock video IDs to purge permanently
  const fakeVideoIds = [
    // Taylor Tomlinson fake IDs
    '8O8v-VwvxK4', 'hJm88TmxUC0', 'B5oW6d7AJ78', 'lml26vJH_Nw', 'oF32NqXdpBM',
    'lyq1S-MR7rg', 'LFf4ZFln5ic', 'VOc7Ky-c78U', 'yJkWX2qR0g4', 'Z_rQ0m7K8wI',
    'kJ8m9V_0qLk', 'mG5n0kL8_yU', 'pQ7n8vK5_xL', 'l-5SVa_JWUM', 'Bp29wwaZIYo',
    // Ravi Gupta fake IDs
    'xGj4R8_66I0', 'FvWk4z_01J0', 'K37J_hQ1kL0', 'wO7n7nK7x2k', '5Uo_806R3j4',
    // Swati Sachdeva fake IDs
    'LqYwZ0zZz-Y', '8m_bBf8XwE4',
    // Raunaq Rajani fake IDs
    'qK9n8x_01mY', 'mP7k8_0vL9X', 'kL8m0v_1qYw',
    // Madhur Virli fake IDs
    '1zKz_Hq2M5w', 'oGkM1a4Hh1o', 't2_oY_W81w0', 'Y_5-K_Xg_P4', 'PPjYWaqCffQ', 'X035AnATXfQ'
  ];

  console.log(`1. Deleting ${fakeVideoIds.length} known fake video IDs...`);
  for (const id of fakeVideoIds) {
    run(`DELETE FROM videos WHERE video_id = ?`, [id]);
    run(`DELETE FROM video_tags WHERE video_id = ?`, [id]);
    run(`DELETE FROM watch_history WHERE video_id = ?`, [id]);
    run(`DELETE FROM favorites WHERE video_id = ?`, [id]);
    run(`DELETE FROM user_ratings WHERE video_id = ?`, [id]);
  }

  // 2. Delete Taylor Tomlinson completely from database
  console.log('2. Removing Taylor Tomlinson from catalog...');
  const taylor = query(`SELECT comedian_id FROM comedians WHERE name LIKE '%Taylor%'`);
  for (const t of taylor) {
    run(`DELETE FROM videos WHERE comedian_id = ?`, [t.comedian_id]);
    run(`DELETE FROM comedians WHERE comedian_id = ?`, [t.comedian_id]);
  }

  // 3. Remove non-standup podcasts and talk shows
  console.log('3. Removing podcasts and talk shows...');
  const nonStandupPatterns = [
    '%that’s just how we talk%',
    '%that\'s just how we talk%',
    '%cob gangwar%',
    '%challenging garry kasparov%',
    '%reddit because i didn\'t%',
    '%training gm abish%',
    '%making our dao%',
    '%diving into cryptocurrency%',
    '%you made it weird%',
    '%the process is the punishment%',
    '%watching stuff with chat%',
    '%i\'m back ft. sagar shah%'
  ];

  for (const pat of nonStandupPatterns) {
    const matched = query(`SELECT video_id, title FROM videos WHERE LOWER(title) LIKE ?`, [pat]);
    for (const m of matched) {
      console.log(`  Deleting talk/stream: [${m.video_id}] ${m.title}`);
      run(`DELETE FROM videos WHERE video_id = ?`, [m.video_id]);
      run(`DELETE FROM video_tags WHERE video_id = ?`, [m.video_id]);
      run(`DELETE FROM watch_history WHERE video_id = ?`, [m.video_id]);
      run(`DELETE FROM favorites WHERE video_id = ?`, [m.video_id]);
      run(`DELETE FROM user_ratings WHERE video_id = ?`, [m.video_id]);
    }
  }

  // 4. Clean orphan records in watch_history, favorites, user_ratings
  console.log('4. Cleaning orphan user records...');
  run(`DELETE FROM watch_history WHERE video_id NOT IN (SELECT video_id FROM videos)`);
  run(`DELETE FROM favorites WHERE video_id NOT IN (SELECT video_id FROM videos)`);
  run(`DELETE FROM user_ratings WHERE video_id NOT IN (SELECT video_id FROM videos)`);
  run(`DELETE FROM video_tags WHERE video_id NOT IN (SELECT video_id FROM videos)`);

  // 5. Verify Top 10 Specials
  console.log('\n--- VERIFYING TOP 10 SPECIALS TODAY ---');
  const topSpecials = query(`
    SELECT v.video_id, v.title, c.name, v.duration_seconds, v.view_count
    FROM videos v
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE v.duration_seconds >= 3600 AND (v.content_type = 'full_special' OR LOWER(v.title) LIKE '%special%' OR LOWER(v.title) LIKE '%full%')
    ORDER BY v.view_count DESC
    LIMIT 10
  `);
  topSpecials.forEach((v, i) => console.log(`  ${i+1}. [${v.video_id}] ${v.title} (${v.name})`));

  console.log('\n--- VERIFYING RECENTLY ADDED ---');
  const newVideos = query(`
    SELECT v.video_id, v.title, c.name, v.published_at
    FROM videos v
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE v.duration_seconds >= 300
    ORDER BY v.published_at DESC
    LIMIT 10
  `);
  newVideos.forEach((v, i) => console.log(`  ${i+1}. [${v.video_id}] ${v.published_at} - ${v.title} (${v.name})`));

  const totalVideos = query(`SELECT COUNT(*) as count FROM videos`)[0].count;
  const totalComedians = query(`SELECT COUNT(*) as count FROM comedians`)[0].count;
  console.log(`\n✅ Database Cleaned! Total genuine videos: ${totalVideos}, Total comedians: ${totalComedians}`);

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log(`Saved clean database to ${dbPath}`);
}

purgeAndFix().catch(err => {
  console.error('Error during purge:', err);
});
