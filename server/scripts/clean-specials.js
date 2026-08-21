import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../standup.db');

async function cleanCategories() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log("Recategorizing incorrectly tagged videos...");

  const updates = [
    { type: 'podcast', keywords: ['podcast', 'ep ', 'ep0', 'episode', 'pitch please', 'suri namaskar', 'simple ken', 'that\'s just how we talk', 'tatti talks', 'chaar yaar'] },
    { type: 'gaming', keywords: ['chess', 'propnight', 'crab game', 'gamerfleet', 'board', 'gaming', 'squid royale'] },
    { type: 'stream', keywords: ['stream', 'live', 'watch party', 'chill', 'review'] }
  ];

  let totalChanged = 0;

  for (const group of updates) {
    for (const kw of group.keywords) {
      db.run(`
        UPDATE videos 
        SET content_type = ? 
        WHERE LOWER(title) LIKE ? AND content_type = 'full_special'
      `, [group.type, `%${kw}%`]);
      totalChanged += db.exec(`SELECT changes() as changed`)[0].values[0][0];
    }
  }

  console.log(`Updated ${totalChanged} videos out of 'full_special'.`);

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log("Database saved successfully.");
}

cleanCategories().catch(console.error);
