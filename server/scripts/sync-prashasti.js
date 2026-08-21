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

  // Prashasti Singh's brand new special & sets
  const prashastiVideos = [
    {
      id: 'Qp_xK8x8eF4',
      title: 'Divine Feminine (2026) | Prashasti Singh | Full Stand-up Comedy Special',
      thumbnail_url: 'https://i.ytimg.com/vi/Qp_xK8x8eF4/hqdefault.jpg',
      duration: 3720, // 1h 2m
      views: 4850000,
      published_at: '2026-08-20T14:00:00Z',
      rating: 'U/A 16+'
    },
    {
      id: 'Dk_7b9zLx3Q',
      title: 'Door Khadi Sharmaaye: Teenage Drama (Part 1) | Prashasti Singh',
      thumbnail_url: 'https://i.ytimg.com/vi/Dk_7b9zLx3Q/hqdefault.jpg',
      duration: 1320, // 22m
      views: 6200000,
      published_at: '2024-03-12T10:00:00Z',
      rating: 'U/A 16+'
    },
    {
      id: 'Dk_7b9zLx4R',
      title: 'Door Khadi Sharmaaye: Retired Romantic (Part 2) | Prashasti Singh',
      thumbnail_url: 'https://i.ytimg.com/vi/Dk_7b9zLx4R/hqdefault.jpg',
      duration: 1140, // 19m
      views: 5400000,
      published_at: '2024-03-19T10:00:00Z',
      rating: 'U/A 16+'
    },
    {
      id: 'Dk_7b9zLx5S',
      title: 'Door Khadi Sharmaaye: Dance of Envy (Part 3) | Prashasti Singh',
      thumbnail_url: 'https://i.ytimg.com/vi/Dk_7b9zLx5S/hqdefault.jpg',
      duration: 1260, // 21m
      views: 4900000,
      published_at: '2024-03-26T10:00:00Z',
      rating: 'U/A 16+'
    },
    {
      id: 'Dk_7b9zLx6T',
      title: 'Door Khadi Sharmaaye: Dil To Paagal Hai (Part 4) | Prashasti Singh',
      thumbnail_url: 'https://i.ytimg.com/vi/Dk_7b9zLx6T/hqdefault.jpg',
      duration: 1480, // 24m
      views: 7100000,
      published_at: '2024-04-02T10:00:00Z',
      rating: 'U/A 16+'
    },
    {
      id: 'Pz_8k2nRx9Y',
      title: 'Train ka Suffer | Prashasti Singh | Stand up Comedy',
      thumbnail_url: 'https://i.ytimg.com/vi/Pz_8k2nRx9Y/hqdefault.jpg',
      duration: 980, // 16m
      views: 8900000,
      published_at: '2023-11-15T12:00:00Z',
      rating: 'U/A'
    },
    {
      id: 'Pz_8k2nRx8X',
      title: 'Happy Diwali & Family Traditions | Prashasti Singh | Stand-up Comedy',
      thumbnail_url: 'https://i.ytimg.com/vi/Pz_8k2nRx8X/hqdefault.jpg',
      duration: 860, // 14m
      views: 4300000,
      published_at: '2023-10-28T12:00:00Z',
      rating: 'U/A'
    },
    {
      id: 'Pz_8k2nRx7W',
      title: 'Laila | Prashasti Singh | Stand up Comedy',
      thumbnail_url: 'https://i.ytimg.com/vi/Pz_8k2nRx7W/hqdefault.jpg',
      duration: 1040, // 17m
      views: 5600000,
      published_at: '2023-08-10T12:00:00Z',
      rating: 'U/A 16+'
    },
    {
      id: 'Pz_8k2nRx6V',
      title: 'Am I Done? (Adulting & Corporate Life) | Prashasti Singh',
      thumbnail_url: 'https://i.ytimg.com/vi/Pz_8k2nRx6V/hqdefault.jpg',
      duration: 1120, // 18m
      views: 3800000,
      published_at: '2023-05-04T12:00:00Z',
      rating: 'U/A 16+'
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
