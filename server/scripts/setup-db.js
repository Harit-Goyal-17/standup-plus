import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../standup.db');

async function setup() {
  const SQL = await initSqlJs();
  let buffer;
  try {
    buffer = fs.readFileSync(dbPath);
  } catch (e) {
    console.warn('DB file not found, creating a new one.');
  }
  const db = new SQL.Database(buffer);

  console.log('Running setup on DB:', dbPath);

  const addVideoCols = [
    'ALTER TABLE videos ADD COLUMN content_type TEXT;',
    'ALTER TABLE videos ADD COLUMN suggested_rating TEXT;',
    'ALTER TABLE videos ADD COLUMN is_official_channel INTEGER DEFAULT 0;',
    'ALTER TABLE videos ADD COLUMN comment_count INTEGER DEFAULT 0;'
  ];
  for (const q of addVideoCols) {
    try { db.run(q); console.log(`Added column to videos`); } catch(e) { console.log(e.message) }
  }

  const addComedianCols = [
    'ALTER TABLE comedians ADD COLUMN bio TEXT;',
    'ALTER TABLE comedians ADD COLUMN profile_image_url TEXT;',
    'ALTER TABLE comedians ADD COLUMN nationality TEXT;'
  ];
  for (const q of addComedianCols) {
    try { db.run(q); console.log(`Added column to comedians`); } catch(e) { console.log(e.message) }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      avatar_url TEXT,
      created_at TEXT
    )
  `);
  console.log('Created users table');

  db.run(`
    CREATE TABLE IF NOT EXISTS watch_history (
      user_id TEXT,
      video_id TEXT,
      watched_at TEXT,
      watch_duration_seconds INTEGER,
      completed INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, video_id)
    )
  `);
  console.log('Created watch_history table');

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT,
      video_id TEXT,
      added_at TEXT,
      PRIMARY KEY (user_id, video_id)
    )
  `);
  console.log('Created favorites table');

  db.run(`
    CREATE TABLE IF NOT EXISTS user_ratings (
      user_id TEXT,
      video_id TEXT,
      rating INTEGER,
      rated_at TEXT,
      PRIMARY KEY (user_id, video_id)
    )
  `);
  console.log('Created user_ratings table');

  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
        tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_name TEXT,
        tag_type TEXT,
        UNIQUE(tag_name, tag_type)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS video_tags (
        video_id TEXT,
        tag_id INTEGER,
        PRIMARY KEY (video_id, tag_id)
    )
  `);
  console.log('Created tags and video_tags tables');

  console.log('Database setup complete. Saving...');
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('Done.');
}

setup().catch(console.error);
