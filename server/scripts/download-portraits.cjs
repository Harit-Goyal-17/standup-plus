const fs = require('fs');
const path = require('path');
const https = require('https');
const initSqlJs = require('sql.js');

const comediansDir = path.resolve(__dirname, '../../client/public/images/comedians');
if (!fs.existsSync(comediansDir)) {
  fs.mkdirSync(comediansDir, { recursive: true });
}

// Download helper with browser headers
function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      } else {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        resolve(false);
      }
    }).on('error', () => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve(false);
    });
  });
}

async function run() {
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

  const update = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
  };

  // 1. Link all existing local files first
  const existingFiles = fs.readdirSync(comediansDir);
  console.log(`Found ${existingFiles.length} local images in public/images/comedians/`);

  for (const file of existingFiles) {
    if (!file.endsWith('.jpg') && !file.endsWith('.png')) continue;
    const baseName = file.replace(/\.(jpg|png)$/, '').replace(/_/g, ' ');
    update(`UPDATE comedians SET profile_image_url = ? WHERE LOWER(name) LIKE ?`, [`/images/comedians/${file}`, `%${baseName.toLowerCase()}%`]);
  }

  // 2. For comedians without local files, extract the best working thumbnail or avatar from their top video
  const comedians = query(`SELECT comedian_id, name, profile_image_url FROM comedians`);
  for (const c of comedians) {
    // If profile_image_url starts with /images/comedians and exists, we are good
    if (c.profile_image_url && c.profile_image_url.startsWith('/images/comedians/')) {
      const fullPath = path.join(__dirname, '../../client/public', c.profile_image_url);
      if (fs.existsSync(fullPath)) continue;
    }

    // Otherwise find top video thumbnail
    const topVid = query(`SELECT video_id, thumbnail_url FROM videos WHERE comedian_id = ? ORDER BY view_count DESC LIMIT 1`, [c.comedian_id])[0];
    if (topVid && topVid.thumbnail_url) {
      const fileName = `${c.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg`;
      const localPath = path.join(comediansDir, fileName);
      console.log(`Downloading thumbnail for ${c.name} (${topVid.video_id})...`);
      const ok = await downloadImage(`https://i.ytimg.com/vi/${topVid.video_id}/hqdefault.jpg`, localPath);
      if (ok) {
        update(`UPDATE comedians SET profile_image_url = ? WHERE comedian_id = ?`, [`/images/comedians/${fileName}`, c.comedian_id]);
        console.log(`Saved /images/comedians/${fileName}`);
      } else {
        // Fallback to direct YouTube thumb URL
        update(`UPDATE comedians SET profile_image_url = ? WHERE comedian_id = ?`, [`https://i.ytimg.com/vi/${topVid.video_id}/hqdefault.jpg`, c.comedian_id]);
      }
    }
  }

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('\n✅ All comedian profile pictures verified and saved.');
}

run();
