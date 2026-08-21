import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../standup.db');

const comedianImages = {
  'Zakir Khan': 'https://upload.wikimedia.org/wikipedia/commons/2/26/Zakir_Khan_in_2024.jpg',
  'Samay Raina': 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Samay_Raina.jpg',
  'Munawar Faruqui': 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Munawar_Faruqui_%28cropped%29.jpg',
  'Anubhav Singh Bassi': 'https://upload.wikimedia.org/wikipedia/commons/0/07/Anubhav_Singh_Bassi_2022.jpg',
  'Abhishek Upmanyu': 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Abhishek_Upmanyu.jpg',
  'Vir Das': 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Vir_Das_in_2017.jpg',
  'Aakash Gupta': 'https://images.hindustantimes.com/rf/image_size_960x540/HT/p2/2020/07/28/Pictures/_326d97f2-d0cf-11ea-ab8b-9602521c37b4.png',
  'Rahul Subramanian': 'https://rollingstoneindia.com/wp-content/uploads/2023/03/Rahul-Subramanian.jpg'
};

async function run() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  const res = db.exec("SELECT comedian_id, name FROM comedians");
  if (!res[0]) return;
  
  const comedians = res[0].values;
  for (const [id, name] of comedians) {
    let url = comedianImages[name];
    if (!url) {
      // Fallback to high-quality UI Avatar with initials
      const encName = encodeURIComponent(name);
      url = `https://ui-avatars.com/api/?name=${encName}&background=random&color=fff&size=150&bold=true`;
    }
    db.run("UPDATE comedians SET profile_image_url = ? WHERE comedian_id = ?", [url, id]);
  }
  
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log("Updated comedian images successfully!");
}
run();
