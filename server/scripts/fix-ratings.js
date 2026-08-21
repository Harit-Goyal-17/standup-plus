import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../standup.db');

async function fixRatings() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log("Updating ratings for Madhur Virli and Samay Raina videos...");
  
  // Set to 18+ for Samay Raina (171) and Madhur Virli (2, 420)
  db.run(`
    UPDATE videos 
    SET suggested_rating = '18+' 
    WHERE comedian_id IN (2, 171, 420)
  `);
  
  const changed = db.exec(`SELECT changes() as changed`)[0].values[0][0];
  console.log(`Updated ${changed} videos to 18+`);

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log("Database saved successfully.");
}

fixRatings().catch(console.error);
