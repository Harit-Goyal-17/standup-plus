// Quick DB stats checker
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
  
  const videoCount = db.exec("SELECT COUNT(*) FROM videos")[0].values[0][0];
  const comedianCount = db.exec("SELECT COUNT(*) FROM comedians")[0].values[0][0];
  const comedians = db.exec("SELECT comedian_id, name FROM comedians ORDER BY name");
  
  console.log(`Videos: ${videoCount}, Comedians: ${comedianCount}`);
  console.log('\nAll comedians:');
  for (const row of comedians[0].values) {
    const vCount = db.exec(`SELECT COUNT(*) FROM videos WHERE comedian_id = ${row[0]}`)[0].values[0][0];
    console.log(`  [${row[0]}] ${row[1]} — ${vCount} videos`);
  }
}
run();
