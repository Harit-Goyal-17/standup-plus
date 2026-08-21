import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../standup.db');

async function migrate() {
  const SQL = await initSqlJs();
  let buffer;
  try {
    buffer = fs.readFileSync(dbPath);
  } catch (e) {
    console.error('DB file not found.');
    process.exit(1);
  }
  const db = new SQL.Database(buffer);

  console.log('Running profile migration on DB:', dbPath);

  // 1. Create profiles table
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      profile_id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT,
      avatar_url TEXT
    )
  `);
  console.log('Created profiles table');

  // 2. Fetch all existing users
  const stmt = db.prepare('SELECT user_id, username, avatar_url FROM users');
  const users = [];
  while(stmt.step()) {
    users.push(stmt.getAsObject());
  }
  stmt.free();

  // 3. Create a default profile for each user if one doesn't exist
  let profileCount = 0;
  for (const user of users) {
    const existingProfile = db.exec(`SELECT * FROM profiles WHERE user_id = '${user.user_id}'`);
    if (existingProfile.length === 0) {
      const profileId = user.user_id + '-default-profile';
      db.run('INSERT INTO profiles (profile_id, user_id, name, avatar_url) VALUES (?, ?, ?, ?)', [
        profileId,
        user.user_id,
        user.username || 'Main Profile',
        user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
      ]);
      
      // Update favorites, watch_history, and user_ratings to point to this new profile
      db.run('UPDATE favorites SET user_id = ? WHERE user_id = ?', [profileId, user.user_id]);
      db.run('UPDATE watch_history SET user_id = ? WHERE user_id = ?', [profileId, user.user_id]);
      db.run('UPDATE user_ratings SET user_id = ? WHERE user_id = ?', [profileId, user.user_id]);
      
      profileCount++;
    }
  }

  console.log(`Created ${profileCount} default profiles and migrated existing user data.`);

  console.log('Migration complete. Saving...');
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('Done.');
}

migrate().catch(console.error);
