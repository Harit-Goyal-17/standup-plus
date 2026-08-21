/**
 * bulk-fetch-channels.js
 * 
 * Phase 2: Looks up comedian YouTube channels by name using the Search API,
 * then fetches ALL their uploads and imports standup content.
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_KEY = process.env.YOUTUBE_API_KEY;
const dbPath = path.resolve(__dirname, '../../standup.db');

if (!API_KEY) { console.error('ERROR: YOUTUBE_API_KEY not found'); process.exit(1); }

// Comedians to search for and fetch all uploads
const COMEDIANS = [
  'Gaurav Kapoor',
  'Aashish Solanki',
  'Kaustubh Agarwal',
  'Gursimran Khamba',
  'Madhur Virli',
  'Pranav Sharma comedian',
  'Vidit Sharma comedian',
  'Swati Sachdeva comedian',
  'Vivek Samtani comedian',
  'Samay Raina',
  'Zakir Khan',
  'Munawar Faruqui',
  'Anubhav Singh Bassi',
  'Abhishek Upmanyu',
  'Harsh Gujral',
  'Aakash Gupta standup',
  'Rahul Subramanian',
  'Rahul Dua comedian',
  'Nishant Suri standup',
  'Kenny Sebastian',
  'Tanmay Bhat',
  'Vir Das',
  'Sapan Verma',
  'Jaspreet Singh comedian',
  'Biswa Kalyan Rath',
  'Varun Grover standup',
  'Devesh Dixit standup',
  'Pranit More standup',
  'Comicstaan',
  'India Got Latent',
  'Naman Jain comedian',
  'Chirag Panjwani standup',
  'Amit Tandon comedian',
  'Inder Sahani standup',
  'Shubham Pujari standup',
];

async function ytFetch(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  params.key = API_KEY;
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YouTube API error (${res.status}): ${errText}`);
  }
  return res.json();
}

// Find a channel by searching for the comedian name
async function findChannel(query) {
  const data = await ytFetch('search', {
    part: 'snippet',
    q: query,
    type: 'channel',
    maxResults: '1'
  });
  if (data.items && data.items.length > 0) {
    return {
      channelId: data.items[0].snippet.channelId,
      channelTitle: data.items[0].snippet.channelTitle
    };
  }
  return null;
}

// Get uploads playlist for a channel
async function getUploadsPlaylist(channelId) {
  const data = await ytFetch('channels', {
    part: 'contentDetails',
    id: channelId
  });
  if (data.items && data.items.length > 0) {
    return data.items[0].contentDetails.relatedPlaylists.uploads;
  }
  return null;
}

// Get all video IDs from a playlist (paginated)
async function getPlaylistVideoIds(playlistId, maxVideos = 200) {
  let videoIds = [];
  let nextPageToken = null;
  
  do {
    const params = { part: 'snippet', playlistId, maxResults: '50' };
    if (nextPageToken) params.pageToken = nextPageToken;
    const data = await ytFetch('playlistItems', params);
    
    for (const item of (data.items || [])) {
      videoIds.push(item.snippet.resourceId.videoId);
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken && videoIds.length < maxVideos);
  
  return videoIds;
}

// Get full video details in batches of 50
async function getVideoDetails(videoIds) {
  const results = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await ytFetch('videos', {
      part: 'snippet,contentDetails,statistics',
      id: batch.join(',')
    });
    for (const item of (data.items || [])) {
      const dur = parseDuration(item.contentDetails.duration);
      if (dur < 180) continue; // Skip shorts
      results.push({
        video_id: item.id,
        title: item.snippet.title,
        channel_name: item.snippet.channelTitle,
        thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        duration_seconds: dur,
        published_at: item.snippet.publishedAt,
        view_count: parseInt(item.statistics.viewCount || '0'),
        like_count: parseInt(item.statistics.likeCount || '0'),
        comment_count: parseInt(item.statistics.commentCount || '0'),
        description: item.snippet.description || ''
      });
    }
  }
  return results;
}

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1]||'0'))*3600 + (parseInt(m[2]||'0'))*60 + (parseInt(m[3]||'0'));
}

function classifyContentType(title) {
  const t = title.toLowerCase();
  if (t.includes('full special') || t.includes('comedy special')) return 'full_special';
  if (t.includes('crowd work') || t.includes('crowdwork')) return 'crowd_work';
  if (t.includes('roast')) return 'roast';
  if (t.includes('compilation') || t.includes('best of')) return 'compilation';
  if (t.includes('episode') || t.includes('ep ') || t.includes('ep.')) return 'episode';
  return 'standup_set';
}

async function main() {
  console.log('🎤 StandupStream Channel Importer');
  console.log('===================================\n');
  
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  const existingVideos = new Set();
  const existingResult = db.exec("SELECT video_id FROM videos");
  if (existingResult[0]) {
    for (const row of existingResult[0].values) existingVideos.add(row[0]);
  }
  console.log(`Existing videos in DB: ${existingVideos.size}\n`);
  
  function getOrCreateComedian(name) {
    const stmt = db.prepare("SELECT comedian_id FROM comedians WHERE name = ?");
    stmt.bind([name]);
    if (stmt.step()) { const id = stmt.getAsObject().comedian_id; stmt.free(); return id; }
    stmt.free();
    db.run("INSERT INTO comedians (name) VALUES (?)", [name]);
    return db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  }
  
  function insertVideo(video, comedianId) {
    if (existingVideos.has(video.video_id)) return false;
    try {
      db.run(`INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds,
              published_at, view_count, like_count, comment_count, content_type)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [video.video_id, video.title, comedianId, video.thumbnail_url,
         video.duration_seconds, video.published_at, video.view_count,
         video.like_count, video.comment_count, classifyContentType(video.title)]);
      existingVideos.add(video.video_id);
      return true;
    } catch { return false; }
  }
  
  let totalNew = 0;
  
  for (const comedianQuery of COMEDIANS) {
    try {
      const cleanName = comedianQuery.replace(/ (comedian|standup|comedy)$/i, '');
      console.log(`🔎 Looking up channel: "${comedianQuery}"...`);
      
      const channel = await findChannel(comedianQuery);
      if (!channel) {
        console.log(`   ❌ Channel not found\n`);
        continue;
      }
      console.log(`   Found: "${channel.channelTitle}" (${channel.channelId})`);
      
      const uploadsPlaylist = await getUploadsPlaylist(channel.channelId);
      if (!uploadsPlaylist) {
        console.log(`   ❌ Could not get uploads playlist\n`);
        continue;
      }
      
      const videoIds = await getPlaylistVideoIds(uploadsPlaylist, 200);
      console.log(`   📹 Found ${videoIds.length} uploads`);
      
      if (videoIds.length === 0) { console.log(''); continue; }
      
      const details = await getVideoDetails(videoIds);
      console.log(`   🎬 ${details.length} videos after filtering shorts`);
      
      const comedianId = getOrCreateComedian(channel.channelTitle);
      let added = 0;
      for (const video of details) {
        if (insertVideo(video, comedianId)) added++;
      }
      
      totalNew += added;
      console.log(`   ✅ Added ${added} new videos\n`);
      
      // Rate limit
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
    }
  }
  
  console.log('\n💾 Saving database...');
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  
  const finalCount = db.exec("SELECT COUNT(*) FROM videos")[0].values[0][0];
  const comedianCount = db.exec("SELECT COUNT(*) FROM comedians")[0].values[0][0];
  
  console.log('\n===================================');
  console.log(`🎉 Channel import complete!`);
  console.log(`   New videos added: ${totalNew}`);
  console.log(`   Total videos now: ${finalCount}`);
  console.log(`   Total comedians:  ${comedianCount}`);
  console.log('===================================\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
