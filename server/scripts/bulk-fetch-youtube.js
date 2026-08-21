/**
 * bulk-fetch-youtube.js
 * 
 * Fetches standup comedy videos from YouTube Data API v3 and imports them
 * into the StandupStream SQLite database.
 * 
 * Usage: node scripts/bulk-fetch-youtube.js
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

if (!API_KEY) {
  console.error('ERROR: YOUTUBE_API_KEY not found in .env');
  process.exit(1);
}

// ============================================================
// CONFIGURATION: Shows, channels, and search queries to fetch
// ============================================================
const SHOW_PLAYLISTS = [
  // Format: { name, comedianName, playlistId OR channelSearchQuery }
  // We'll search by channel + show name to find episodes
];

const CHANNEL_IDS = [
  // Comedian channels to fetch ALL standup videos from
  { channelId: 'UCj9Yb7Mfk-PqGPbh2KAkfOA', name: 'Gaurav Kapoor' },         // Gaurav Kapoor
  { channelId: 'UCuUB6RVqfMxCd7kTfEXU3ew', name: 'Aashish Solanki' },       // Aashish Solanki
  { channelId: 'UCVPMjnkY3bMItGvSQnl4EOg', name: 'Kaustubh Agarwal' },      // Kaustubh Agarwal (Kaustabh)
  { channelId: 'UCLgjJGAQu3jDMqvqvyNwduA', name: 'Gursimran Khamba' },       // Gursimran Khamba
  { channelId: 'UCp1FMAR3eePyolSFyC_w2VA', name: 'Madhur Virli' },           // Madhur Virli
  { channelId: 'UCXr-WnBYUfSQPAgG8Z_yg3Q', name: 'Pranav Sharma' },         // Pranav Sharma
  { channelId: 'UCCf4LNwb8Ux6nYb3HcqDizg', name: 'Vidit Sharma' },          // Vidit Sharma
  { channelId: 'UCIStxWPz5S7pGIKFr29RHjg', name: 'Swati Sachdeva' },        // Swati Sachdeva
  { channelId: 'UC5I5XRf37ahWABz1oe_bh9g', name: 'Vivek Samtani' },         // Vivek Samtani (Vivek Samptani)
  { channelId: 'UCYJaHLUGWJPpLaZKn4sLR-g', name: 'Samay Raina' },           // Samay Raina
  { channelId: 'UCPFUzTO51mK4Gic1NRDRPHA', name: 'Zakir Khan' },            // Zakir Khan
  { channelId: 'UC_sSvmjyDheBkK8WR8OdLcg', name: 'Munawar Faruqui' },       // Munawar Faruqui
  { channelId: 'UC8BO_tCR0wPqxMq5rhDlkhQ', name: 'Anubhav Singh Bassi' },   // Bassi
  { channelId: 'UCYaT2MZ-jmT86Y1FbRjCMbw', name: 'Abhishek Upmanyu' },      // Abhishek Upmanyu
  { channelId: 'UCoxQ4Uu7lTRcCzLDxijrWfA', name: 'Harsh Gujral' },          // Harsh Gujral
  { channelId: 'UConc4sKCZ0uqOWN6wmNR2Lw', name: 'Aakash Gupta' },          // Aakash Gupta
  { channelId: 'UCcuBO_YUsTfL1lJZ-dK5uJQ', name: 'Rahul Subramanian' },     // Rahul Subramanian
  { channelId: 'UC7wk6qIHCxGl7_ICPO8xeCA', name: 'Rahul Dua' },             // Rahul Dua
  { channelId: 'UCNZtK2rPDhkeqwnJqAGJwvw', name: 'Nishant Suri' },          // Nishant Suri
  { channelId: 'UCvGPn_aMXsVQ4oiSWNhBBgg', name: 'Kenny Sebastian' },       // Kenny Sebastian
  { channelId: 'UC5c-DoCmQedyTdYgA_JLc3A', name: 'Tanmay Bhat' },           // Tanmay Bhat
  { channelId: 'UC-tT8rEnVahsGhwp-kCPp_A', name: 'Vir Das' },               // Vir Das
  { channelId: 'UC-cX00Qwbs3GPkfgZAr14fQ', name: 'Sapan Verma' },           // Sapan Verma
  { channelId: 'UCDCj-QkJJu0m11APqjHD_JQ', name: 'Jaspreet Singh' },        // Jaspreet Singh
  { channelId: 'UCBL7dX1tn95yv7p0CbTlbZw', name: 'KuchBhiMehta' },          // Biswa Kalyan Rath
  { channelId: 'UCVmUFJuXY8xNqj6K5d_FXNA', name: 'Varun Grover' },          // Varun Grover
  { channelId: 'UCDMy2-22e8LsiqZ5OyQO8AA', name: 'Devesh Dixit' },          // Devesh Dixit
  { channelId: 'UC3vIjgO6_NF-q13Ar5R49tw', name: 'Pranit More Official' },   // Pranit More
];

// Search queries to find specific shows and content
const SEARCH_QUERIES = [
  'Lie Hard Gaurav Kapoor full episode',
  'Bro Code Roast Ashish Solanki full episode',
  'Pretty Good Roast Ashish Solanki',
  'Judge Me If You Can Ashish Solanki',
  'Akal Ke Ghode Kaustubh Agarwal',
  'Nation Wants To Guess Gursimran Khamba full episode',
  'Madhur Model Madhur Virli full episode',
  'Andha Pyaar Vivek Samtani full episode',
  'Loose Emotions Vidit Sharma full episode',
  'Who Gets The Booze Swati Sachdeva full episode',
  'Pranav Sharma standup comedy',
  'India Got Latent full episode',
  'standup comedy special India 2024',
  'standup comedy special India 2025',
  'Hindi standup comedy full special',
  'Indian standup comedy crowd work',
  'best Indian standup comedy 2025',
  'Samay Raina comedy special',
  'Zakir Khan full comedy special',
  'Munawar Faruqui standup full',
  'Anubhav Singh Bassi full special',
  'Abhishek Upmanyu full standup',
  'Kenny Sebastian standup full',
  'Vir Das standup special',
  'Rahul Subramanian full standup',
  'Harsh Gujral standup full',
  'Aakash Gupta full standup comedy',
];

// ============================================================
// YouTube API helpers
// ============================================================

async function ytFetch(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  params.key = API_KEY;
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  
  const res = await fetch(url.toString());
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YouTube API error (${res.status}): ${errText}`);
  }
  return res.json();
}

// Get all video IDs from a channel's uploads playlist
async function getChannelUploads(channelId) {
  // First, get the uploads playlist ID
  const channelData = await ytFetch('channels', {
    part: 'contentDetails',
    id: channelId
  });
  
  if (!channelData.items || channelData.items.length === 0) {
    console.warn(`  Channel ${channelId} not found`);
    return [];
  }
  
  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
  
  // Paginate through all uploads
  let videoIds = [];
  let nextPageToken = null;
  
  do {
    const params = {
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: '50'
    };
    if (nextPageToken) params.pageToken = nextPageToken;
    
    const data = await ytFetch('playlistItems', params);
    
    for (const item of data.items || []) {
      videoIds.push(item.snippet.resourceId.videoId);
    }
    
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);
  
  return videoIds;
}

// Search YouTube and return video IDs
async function searchVideos(query, maxResults = 50) {
  let videoIds = [];
  let nextPageToken = null;
  let fetched = 0;
  
  do {
    const params = {
      part: 'id',
      q: query,
      type: 'video',
      videoDuration: 'long',        // > 20 minutes
      maxResults: String(Math.min(50, maxResults - fetched))
    };
    if (nextPageToken) params.pageToken = nextPageToken;
    
    const data = await ytFetch('search', params);
    
    for (const item of data.items || []) {
      videoIds.push(item.id.videoId);
      fetched++;
    }
    
    nextPageToken = data.nextPageToken;
  } while (nextPageToken && fetched < maxResults);
  
  return videoIds;
}

// Get full details for a batch of video IDs (max 50 at a time)
async function getVideoDetails(videoIds) {
  const results = [];
  
  // Process in batches of 50
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await ytFetch('videos', {
      part: 'snippet,contentDetails,statistics',
      id: batch.join(',')
    });
    
    for (const item of data.items || []) {
      const duration = parseDuration(item.contentDetails.duration);
      
      // Skip very short videos (< 3 minutes) - likely shorts/trailers
      if (duration < 180) continue;
      
      results.push({
        video_id: item.id,
        title: item.snippet.title,
        channel_name: item.snippet.channelTitle,
        channel_id: item.snippet.channelId,
        thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        duration_seconds: duration,
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

// Parse ISO 8601 duration (PT1H26M33S) to seconds
function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

// Filter: is this a standup comedy video?
function isStandupVideo(video) {
  const title = video.title.toLowerCase();
  const desc = video.description.toLowerCase();
  const combined = title + ' ' + desc;
  
  // Positive keywords
  const standupKeywords = [
    'standup', 'stand-up', 'stand up', 'comedy special', 'comedy show',
    'crowd work', 'crowdwork', 'roast', 'open mic', 'live comedy',
    'full special', 'comedy set', 'lie hard', 'bro code', 'pretty good roast',
    'judge me if you can', 'akal ke ghode', 'nation wants to guess',
    'madhur model', 'andha pyaar', 'loose emotions', 'who gets the booze',
    'india got latent', "india's got latent", 'latent', 'comicstaan',
    'one mic stand', 'amazon funnies', 'comedy premium league',
    'comedy nights', 'kapil sharma', 'the great indian laughter',
    'stand up comedy', 'jokes', 'funny', 'comedian', 'punchline',
    'hasi', 'hasya', 'laughter', 'comic'
  ];
  
  // Negative keywords (not standup)
  const negativeKeywords = [
    'gaming', 'minecraft', 'fortnite', 'unboxing', 'tutorial',
    'how to', 'recipe', 'cooking', 'workout', 'fitness',
    'news report', 'documentary', 'trailer', 'teaser', 'promo',
    'behind the scenes', 'vlog', 'haul', 'asmr', 'meditation',
    'music video', 'official music', 'lyrical', 'full movie'
  ];
  
  const hasPositive = standupKeywords.some(kw => combined.includes(kw));
  const hasNegative = negativeKeywords.some(kw => combined.includes(kw));
  
  // For channel videos, be more lenient - include if it's > 5 min and no negative keywords
  if (!hasNegative && video.duration_seconds > 300) return true;
  if (hasPositive && !hasNegative) return true;
  
  return false;
}

// Classify content type from title
function classifyContentType(title) {
  const t = title.toLowerCase();
  if (t.includes('full special') || t.includes('comedy special')) return 'full_special';
  if (t.includes('crowd work') || t.includes('crowdwork')) return 'crowd_work';
  if (t.includes('roast')) return 'roast';
  if (t.includes('compilation') || t.includes('best of')) return 'compilation';
  if (t.includes('episode') || t.includes('ep ') || t.includes('ep.')) return 'episode';
  if (t.includes('full episode')) return 'episode';
  return 'standup_set';
}

// ============================================================
// Database helpers
// ============================================================

async function main() {
  console.log('🎤 StandupStream Bulk Importer');
  console.log('==============================\n');
  
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  // Track existing video IDs to avoid duplicates
  const existingVideos = new Set();
  const existingResult = db.exec("SELECT video_id FROM videos");
  if (existingResult[0]) {
    for (const row of existingResult[0].values) {
      existingVideos.add(row[0]);
    }
  }
  console.log(`Existing videos in DB: ${existingVideos.size}\n`);
  
  // Get or create comedian by name
  function getOrCreateComedian(name) {
    const stmt = db.prepare("SELECT comedian_id FROM comedians WHERE name = ?");
    stmt.bind([name]);
    if (stmt.step()) {
      const id = stmt.getAsObject().comedian_id;
      stmt.free();
      return id;
    }
    stmt.free();
    
    db.run("INSERT INTO comedians (name) VALUES (?)", [name]);
    const result = db.exec("SELECT last_insert_rowid()");
    return result[0].values[0][0];
  }
  
  // Insert a video
  function insertVideo(video, comedianId) {
    if (existingVideos.has(video.video_id)) return false;
    
    try {
      db.run(`
        INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds,
                            published_at, view_count, like_count, comment_count, content_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        video.video_id, video.title, comedianId, video.thumbnail_url,
        video.duration_seconds, video.published_at, video.view_count,
        video.like_count, video.comment_count, classifyContentType(video.title)
      ]);
      existingVideos.add(video.video_id);
      return true;
    } catch (e) {
      // Duplicate or constraint error
      return false;
    }
  }
  
  let totalNew = 0;
  
  // ========================================
  // PHASE 1: Fetch from comedian channels
  // ========================================
  console.log('📺 PHASE 1: Fetching from comedian channels...\n');
  
  for (const channel of CHANNEL_IDS) {
    try {
      console.log(`  Fetching: ${channel.name} (${channel.channelId})...`);
      const videoIds = await getChannelUploads(channel.channelId);
      console.log(`    Found ${videoIds.length} uploads`);
      
      if (videoIds.length === 0) continue;
      
      const details = await getVideoDetails(videoIds);
      const standupVideos = details.filter(v => isStandupVideo(v));
      console.log(`    ${standupVideos.length} standup videos after filtering`);
      
      const comedianId = getOrCreateComedian(channel.name);
      let added = 0;
      
      for (const video of standupVideos) {
        if (insertVideo(video, comedianId)) added++;
      }
      
      console.log(`    ✅ Added ${added} new videos\n`);
      totalNew += added;
      
      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`    ❌ Error fetching ${channel.name}: ${err.message}\n`);
    }
  }
  
  // ========================================
  // PHASE 2: Search for specific shows
  // ========================================
  console.log('\n🔍 PHASE 2: Searching for specific shows...\n');
  
  for (const query of SEARCH_QUERIES) {
    try {
      console.log(`  Searching: "${query}"...`);
      const videoIds = await searchVideos(query, 20);
      console.log(`    Found ${videoIds.length} results`);
      
      if (videoIds.length === 0) continue;
      
      const details = await getVideoDetails(videoIds);
      let added = 0;
      
      for (const video of details) {
        // Use channel name as comedian name for search results
        const comedianId = getOrCreateComedian(video.channel_name);
        if (insertVideo(video, comedianId)) added++;
      }
      
      console.log(`    ✅ Added ${added} new videos\n`);
      totalNew += added;
      
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`    ❌ Error searching "${query}": ${err.message}\n`);
    }
  }
  
  // ========================================
  // Save and report
  // ========================================
  console.log('\n💾 Saving database...');
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  
  const finalCount = db.exec("SELECT COUNT(*) FROM videos")[0].values[0][0];
  const comedianCount = db.exec("SELECT COUNT(*) FROM comedians")[0].values[0][0];
  
  console.log('\n==============================');
  console.log(`🎉 Import complete!`);
  console.log(`   New videos added: ${totalNew}`);
  console.log(`   Total videos now: ${finalCount}`);
  console.log(`   Total comedians:  ${comedianCount}`);
  console.log('==============================\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
