const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function inspect() {
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

  const comedians = query(`SELECT comedian_id, name, profile_image_url, video_count FROM comedians ORDER BY name`);
  console.log(`Total Comedians in DB: ${comedians.length}`);
  
  const targetNames = ['Taylor Tomlinson', 'Ravi Gupta', 'Harsh Gujral', 'Gaurav Kapoor', 'Vivek Samtani', 'Vidit Sharma', 'Kaustubh Agarwal', 'Anubhav Singh Bassi', 'Swati Sachdeva', 'Raunaq Rajani', 'Max Amini', 'Trevor Noah', 'Hasan Minhaj'];
  
  for (const name of targetNames) {
    const found = comedians.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
    if (found) {
      const vids = query(`SELECT video_id, title, duration_seconds, view_count, thumbnail_url FROM videos WHERE comedian_id = ?`, [found.comedian_id]);
      console.log(`\n--- ${found.name} (ID: ${found.comedian_id}, Img: ${found.profile_image_url}) ---`);
      console.log(`Video Count: ${vids.length}`);
      vids.slice(0, 5).forEach(v => console.log(`  - [${v.video_id}] ${v.title} (${Math.round(v.duration_seconds/60)}m, ${v.view_count} views, thumb: ${v.thumbnail_url})`));
    } else {
      console.log(`\n--- ${name}: NOT FOUND IN DB ---`);
    }
  }
}

inspect();
