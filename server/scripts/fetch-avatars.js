import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbPath = path.resolve(__dirname, '../../standup.db');
const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  console.error("No YOUTUBE_API_KEY in .env");
  process.exit(1);
}

async function run() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // Get all comedians
  const comedians = [];
  const stmt = db.prepare("SELECT comedian_id, name, profile_image_url FROM comedians WHERE profile_image_url IS NULL");
  while (stmt.step()) {
    comedians.push(stmt.getAsObject());
  }
  stmt.free();

  console.log(`Found ${comedians.length} comedians without avatars.`);

  if (comedians.length === 0) return;

  // For each comedian, get ONE video_id
  const comedianVideos = [];
  for (const c of comedians) {
    const vStmt = db.prepare("SELECT video_id FROM videos WHERE comedian_id = ? LIMIT 1");
    vStmt.bind([c.comedian_id]);
    if (vStmt.step()) {
      comedianVideos.push({ comedian_id: c.comedian_id, name: c.name, video_id: vStmt.getAsObject().video_id });
    }
    vStmt.free();
  }

  console.log(`Found video references for ${comedianVideos.length} comedians.`);

  // Chunk video_ids into groups of 50
  const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
  
  const videoChunks = chunkArray(comedianVideos, 50);
  
  const channelMapping = {}; // channelId -> { comedian_id }

  // Step 1: Fetch channelId for each video
  for (const chunk of videoChunks) {
    const ids = chunk.map(c => c.video_id).join(',');
    console.log(`Fetching channel IDs for ${chunk.length} videos...`);
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}&key=${API_KEY}`);
    const data = await res.json();
    
    if (data.items) {
      for (const item of data.items) {
        const vidId = item.id;
        const channelId = item.snippet.channelId;
        // Find which comedian this belongs to
        const cv = chunk.find(c => c.video_id === vidId);
        if (cv) {
          channelMapping[channelId] = { comedian_id: cv.comedian_id, name: cv.name, channelId };
        }
      }
    }
  }

  const uniqueChannels = Object.values(channelMapping);
  console.log(`Found ${uniqueChannels.length} unique channels to fetch avatars for.`);

  const channelChunks = chunkArray(uniqueChannels, 50);

  let updatedCount = 0;

  // Step 2: Fetch avatars for channels
  for (const chunk of channelChunks) {
    const ids = chunk.map(c => c.channelId).join(',');
    console.log(`Fetching avatars for ${chunk.length} channels...`);
    const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${ids}&key=${API_KEY}`);
    const data = await res.json();
    
    if (data.items) {
      for (const item of data.items) {
        const cId = item.id;
        const avatarUrl = item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url;
        const mapped = channelMapping[cId];
        
        if (mapped && avatarUrl) {
          // Update database
          db.run("UPDATE comedians SET profile_image_url = ? WHERE comedian_id = ?", [avatarUrl, mapped.comedian_id]);
          console.log(`Updated ${mapped.name}`);
          updatedCount++;
        }
      }
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
    console.log(`Successfully updated and saved ${updatedCount} avatars.`);
  } else {
    console.log("No avatars updated.");
  }
}

run().catch(console.error);
