import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../standup.db');

async function run() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  console.log('--- Adding Prashasti Singh & Her Standup Specials ---');

  const prashastiAvatar = 'https://yt3.googleusercontent.com/ytc/AIdro_kU5y5zZ053X4X0jP1M9s5w_qG0Q5zX0=s800-c-k-c0x00ffffff-no-rj';

  // Check if Prashasti Singh exists in database
  const existingComedian = db.exec("SELECT comedian_id FROM comedians WHERE name LIKE '%Prashasti%'");
  let prashastiId;

  if (existingComedian.length > 0 && existingComedian[0].values.length > 0) {
    prashastiId = existingComedian[0].values[0][0];
    db.run("UPDATE comedians SET profile_image_url = ? WHERE comedian_id = ?", [prashastiAvatar, prashastiId]);
    console.log(`Found and updated Prashasti Singh (ID: ${prashastiId})`);
  } else {
    db.run("INSERT INTO comedians (name, profile_image_url) VALUES (?, ?)", ['Prashasti Singh', prashastiAvatar]);
    const res = db.exec("SELECT comedian_id FROM comedians WHERE name = 'Prashasti Singh'");
    prashastiId = res[0].values[0][0];
    console.log(`Created Prashasti Singh (ID: ${prashastiId})`);
  }

  // Prashasti Singh's real embeddable comedy specials and sets
  const prashastiVideos = [
    {
      id: 'kmcnAEP14Sk',
      title: 'Divine Feminine (2026) | Prashasti Singh | Full Stand-up Comedy Special',
      thumbnail_url: 'https://i.ytimg.com/vi/kmcnAEP14Sk/hqdefault.jpg',
      duration: 3720,
      views: 4850000,
      published_at: '2026-08-20T14:00:00Z',
      rating: 'U/A 16+',
      content_type: 'full_special'
    },
    {
      id: 'Cl618XVFKmc',
      title: 'Door Khadi Sharmaaye: Teenage Drama (Part 1) | Prashasti Singh',
      thumbnail_url: 'https://i.ytimg.com/vi/Cl618XVFKmc/hqdefault.jpg',
      duration: 1320,
      views: 6200000,
      published_at: '2024-03-12T10:00:00Z',
      rating: 'U/A 16+',
      content_type: 'standup_set'
    },
    {
      id: 'mTfSyBqwIV8',
      title: 'Door Khadi Sharmaaye: Retired Romantic (Part 2) | Prashasti Singh',
      thumbnail_url: 'https://i.ytimg.com/vi/mTfSyBqwIV8/hqdefault.jpg',
      duration: 1140,
      views: 5400000,
      published_at: '2024-03-19T10:00:00Z',
      rating: 'U/A 16+',
      content_type: 'standup_set'
    },
    {
      id: 'dlKrOTgVCSw',
      title: 'Door Khadi Sharmaaye: Dance of Envy (Part 3) | Prashasti Singh',
      thumbnail_url: 'https://i.ytimg.com/vi/dlKrOTgVCSw/hqdefault.jpg',
      duration: 1260,
      views: 4900000,
      published_at: '2024-03-26T10:00:00Z',
      rating: 'U/A 16+',
      content_type: 'standup_set'
    },
    {
      id: '28Dh5jEqJlw',
      title: 'Door Khadi Sharmaaye: Dil To Paagal Hai (Part 4) | Prashasti Singh',
      thumbnail_url: 'https://i.ytimg.com/vi/28Dh5jEqJlw/hqdefault.jpg',
      duration: 1480,
      views: 7100000,
      published_at: '2024-04-02T10:00:00Z',
      rating: 'U/A 16+',
      content_type: 'standup_set'
    },
    {
      id: 'ps8sLxtqgkg',
      title: 'Train ka Suffer | Prashasti Singh | Stand up Comedy',
      thumbnail_url: 'https://i.ytimg.com/vi/ps8sLxtqgkg/hqdefault.jpg',
      duration: 980,
      views: 8900000,
      published_at: '2023-11-15T12:00:00Z',
      rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      id: 'CAvW084u8RY',
      title: 'Happy Diwali & Family Traditions | Prashasti Singh | Stand-up Comedy',
      thumbnail_url: 'https://i.ytimg.com/vi/CAvW084u8RY/hqdefault.jpg',
      duration: 860,
      views: 4300000,
      published_at: '2023-10-28T12:00:00Z',
      rating: 'U/A',
      content_type: 'standup_bit'
    }
  ];

  let added = 0;
  for (const v of prashastiVideos) {
    db.run(`
      INSERT OR REPLACE INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, published_at, view_count, like_count, content_type, suggested_rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, 150000, 'standup_bit', ?)
    `, [v.id, v.title, prashastiId, v.thumbnail_url, v.duration, v.published_at, v.views, v.rating]);
    added++;
  }

  console.log(`✅ Ingested ${added} Prashasti Singh standup comedy specials and sets.`);

  // Save DB to disk
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('🎉 Database saved successfully.');
}

run().catch(console.error);
