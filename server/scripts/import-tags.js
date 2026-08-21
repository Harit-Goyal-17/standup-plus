import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../standup.db');

const tagSuggestionsFile = path.resolve(__dirname, '../../tag_suggestions.csv');

function parseCSV(content) {
  const rows = [];
  let row = [];
  let inQuotes = false;
  let val = '';
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (inQuotes && content[i+1] === '"') {
        val += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(val);
      val = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && content[i+1] === '\n') i++;
      row.push(val);
      if (row.length > 0 && row.some(x => x !== '')) {
        rows.push(row);
      }
      row = [];
      val = '';
    } else {
      val += c;
    }
  }
  if (val || row.length > 0) {
    row.push(val);
    rows.push(row);
  }
  return rows;
}

async function run() {
  const SQL = await initSqlJs();
  let buffer;
  try {
    buffer = fs.readFileSync(dbPath);
  } catch (e) {
    console.error('DB file not found!');
    process.exit(1);
  }
  const db = new SQL.Database(buffer);

  function dbGet(sqlStr, params = []) {
    const stmt = db.prepare(sqlStr);
    stmt.bind(params);
    let row = null;
    if(stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }

  console.log('Importing tags to DB:', dbPath);

  function getOrInsertTag(tagName, tagType) {
    if (!tagName) return null;
    tagName = tagName.trim();
    if (!tagName) return null;
    
    let row = dbGet('SELECT tag_id FROM tags WHERE tag_name = ? AND tag_type = ?', [tagName, tagType]);
    if (!row) {
      db.run('INSERT INTO tags (tag_name, tag_type) VALUES (?, ?)', [tagName, tagType]);
      row = dbGet('SELECT tag_id FROM tags WHERE tag_name = ? AND tag_type = ?', [tagName, tagType]);
    }
    return row.tag_id;
  }

  if (fs.existsSync(tagSuggestionsFile)) {
    const fileContent = fs.readFileSync(tagSuggestionsFile, 'utf-8');
    const parsedRows = parseCSV(fileContent);
    
    if (parsedRows.length < 2) {
      console.log('No data found in tag_suggestions.csv');
      return;
    }

    const headers = parsedRows[0].map(h => h.trim());
    const dataRows = parsedRows.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = r[i] || '';
      });
      return obj;
    });

    console.log(`Read ${dataRows.length} rows from tag_suggestions.csv`);

    // Using explicit transaction with db.run
    db.run('BEGIN TRANSACTION');

    try {
      for (const row of dataRows) {
        const videoId = row.video_id;
        if (!videoId) continue;
        
        const styles = (row.style_tags || '').split(';').map(s => s.trim()).filter(Boolean);
        const tones = (row.tone_tags || '').split(';').map(s => s.trim()).filter(Boolean);
        const themes = (row.theme_tags || '').split(';').map(s => s.trim()).filter(Boolean);
        const rating = row.suggested_rating || null;
        const contentType = row.content_type || 'standup';

        if (rating) {
          db.run('UPDATE videos SET suggested_rating = ?, content_type = ? WHERE video_id = ?', [rating, contentType, videoId]);
        }

        const processTags = (tagList, type) => {
          for (const t of tagList) {
            const tid = getOrInsertTag(t, type);
            if (tid) {
              db.run('INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)', [videoId, tid]);
            }
          }
        };

        processTags(styles, 'style');
        processTags(tones, 'tone');
        processTags(themes, 'theme');
      }
      db.run('COMMIT');
    } catch(e) {
      db.run('ROLLBACK');
      throw e;
    }

    console.log('Import finished. Saving DB...');
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
  } else {
    console.log('tag_suggestions.csv not found at', tagSuggestionsFile);
  }
}

run().catch(console.error);
