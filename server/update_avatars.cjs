const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

const mappings = [
  { file: 'media_1787032232164.jpg', name: 'Gaurav Kapoor' },
  { file: 'media_1787032232166.jpg', name: 'Akaash Singh' },
  { file: 'media_1787032232167.jpg', name: 'Biswa Kalyan Rath' },
  { file: 'media_1787032232180.jpg', name: 'Abhishek Walia' },
  { file: 'media_1787032331149.jpg', name: 'Gianmarco Soresi' },
  { file: 'media_1787032331150.jpg', name: 'Gursimran Khamba' },
  { file: 'media_1787032331151.jpg', name: 'Kanan Gill' },
  { file: 'media_1787032369617.jpg', name: 'Kaneez Surka' },
  { file: 'media_1787032369645.jpg', name: 'Kenny Sebastian' },
  { file: 'media_1787032369646.jpg', name: 'Kunal Kamra' },
  { file: 'media_1787032369647.jpg', name: 'Munawar Faruqui' },
  { file: 'media_1787032388632.jpg', name: 'Pete Holmes' },
  { file: 'media_1787032388634.jpg', name: 'Russell Peters' },
  { file: 'media_1787032411671.jpg', name: 'Sapan Verma' },
  { file: 'media_1787032411672.jpg', name: 'Swati Sachdeva' },
  { file: 'media_1787032411673.jpg', name: 'Prashasti Singh' }
];

const sourceDir = '/Users/harit/.gemini/antigravity/brain/fcc561ef-a969-4b41-b141-4559848758c2/.user_uploaded';
const targetDir = '/Users/harit/Downloads/youtube_api_project/client/public/images/comedians';

async function run() {
  const SQL = await initSqlJs();
  const dbPath = '/Users/harit/Downloads/youtube_api_project/standup.db';
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  for (let m of mappings) {
    const ext = path.extname(m.file);
    const cleanName = m.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + ext;
    
    try {
      fs.copyFileSync(path.join(sourceDir, m.file), path.join(targetDir, cleanName));
      console.log(`Copied ${m.file} to ${cleanName}`);
      
      const imageUrl = `/images/comedians/${cleanName}`;
      
      const stmt = db.prepare(`UPDATE comedians SET profile_image_url = ? WHERE name LIKE ?`);
      stmt.run([imageUrl, `%${m.name.split(' ')[0]}%`]);
      stmt.free();
    } catch (err) {
      console.error(`Failed to process ${m.name}:`, err);
    }
  }

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log("Database updated successfully.");
}

run();
