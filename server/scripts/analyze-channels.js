/**
 * analyze-channels.js
 * Lists all channels with their video count and flags suspicious ones
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../standup.db');

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Get all comedians with their video counts and total views
  const results = db.exec(`
    SELECT c.comedian_id, c.name, COUNT(v.video_id) as video_count, 
           SUM(v.view_count) as total_views,
           AVG(v.view_count) as avg_views
    FROM comedians c 
    LEFT JOIN videos v ON c.comedian_id = v.comedian_id 
    GROUP BY c.comedian_id 
    ORDER BY video_count DESC
  `);

  if (!results[0]) { console.log('No data'); return; }

  // Known official comedian channels
  const officialComedians = new Set([
    'Gaurav Kapoor', 'Aashish Solanki', 'Kaustubh Agarwal', 'Gursimran Khamba',
    'Madhur Virli', 'Pranav Sharma', 'Vidit Sharma', 'Swati Sachdeva',
    'Vivek Samtani', 'Samay Raina', 'Zakir Khan', 'Munawar Faruqui',
    'Anubhav Singh Bassi', 'Abhishek Upmanyu', 'Harsh gujral', 'Harsh Gujral',
    'Aakash Gupta', 'Rahul Subramanian', 'Rahul Dua', 'Nishant Suri',
    'Kenny Sebastian', 'Tanmay Bhat', 'Vir Das', 'Vir Das COMEDY',
    'Sapan Verma', 'Jaspreet Singh', 'Biswa Kalyan Rath', 'Varun Grover',
    'Devesh Dixit', 'Pranit More Official', 'Naman Jain', 'Chirag Panjwani',
    'Amit Tandon', 'Inder Sahani', 'Shubham Pujari', 'Aakash Gupta',
    'Matt Rife', 'Jimmy Carr', 'Russell Howard', 'Taylor Tomlinson',
    'Aaditya Kulshreshth aka Kullu', 'Kaviraj Singh', 'Shashi Dhiman',
    'KuchBhiMehta', 'Jaspreet Singh', 'Hasnaat Khan', 'Haseeb Khan',
    'Max Amini', 'Gary Owen', 'Chris D\'Elia', 'Vaibhav Arora',
    'Son Of Abish', 'Naman Jain', 'Prakhar Gupta', 'Devesh Dixit',
    'Pranit More Official', 'Comic Arvind', 'Shamik Chakrabarti',
    'Netflix India', 'Netflix Is A Joke', 'Comedy Central Stand-Up',
    'Amazon Prime Video India', 'Madhur Virli - RAW', 'Pranav Sharma',
    'Vikas Kush Sharma', 'Gianmarco Soresi', 'Phil Hanley', 'Trevor Wallace',
    'Lucas Zelnick', 'Nate Jackson', 'Reuben Solo', 'Pete Holmes',
    'Lachlan Patterson', 'Kenny Sebastian', 'The Comedy Factory',
  ]);

  // Suspicious keywords in channel names
  const suspiciousKeywords = [
    'reaction', 'react', 'clips', 'compilation', 'best of', 'highlights',
    'daily dose', 'top 10', 'viral', 'buzz', 'talks', 'update', 'news',
    'empire', 'power', 'how to', 'learn', 'education', 'tutorial',
    'روتيناتي', 'cuộc', 'cakeorder', 'viento', 'sml movie',
    'chart master', 'copy', 'uplift', 'rays', 'pundank', 'joke wrld',
    'crowd crushers', 'laugh society', 'magic flicks', 'real life comedy',
    'entertainment', 'spicy', 'haste raho', 'funflix', 'blockbuster',
    'punchline powerhouse', 'standup central', 'comedy club', 'comedy time',
    'cleantones', 'minty', 'page', 'respect', 'tuple', 'haku', 'gorilla',
    'dark comedy cuts', 'cracked comedy', 'documentary',
  ];

  console.log('=== CHANNELS TO POTENTIALLY REMOVE ===\n');
  let removeCount = 0;
  let removeVideoCount = 0;
  
  for (const row of results[0].values) {
    const [id, name, videoCount, totalViews, avgViews] = row;
    const nameLower = (name || '').toLowerCase();
    
    const isOfficial = officialComedians.has(name);
    const isSuspicious = suspiciousKeywords.some(kw => nameLower.includes(kw));
    const isLowQuality = avgViews < 5000 && videoCount <= 2 && !isOfficial;
    
    if (isSuspicious || isLowQuality) {
      console.log(`  🗑️  [${id}] "${name}" — ${videoCount} videos, avg ${Math.round(avgViews)} views ${isSuspicious ? '(SUSPICIOUS NAME)' : '(LOW QUALITY)'}`);
      removeCount++;
      removeVideoCount += videoCount;
    }
  }
  
  console.log(`\n=== CHANNELS TO KEEP ===\n`);
  let keepCount = 0;
  let keepVideoCount = 0;
  
  for (const row of results[0].values) {
    const [id, name, videoCount, totalViews, avgViews] = row;
    const nameLower = (name || '').toLowerCase();
    
    const isOfficial = officialComedians.has(name);
    const isSuspicious = suspiciousKeywords.some(kw => nameLower.includes(kw));
    const isLowQuality = avgViews < 5000 && videoCount <= 2 && !isOfficial;
    
    if (!isSuspicious && !isLowQuality) {
      console.log(`  ✅ [${id}] "${name}" — ${videoCount} videos, avg ${Math.round(avgViews)} views`);
      keepCount++;
      keepVideoCount += videoCount;
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`  Channels to remove: ${removeCount} (${removeVideoCount} videos)`);
  console.log(`  Channels to keep:   ${keepCount} (${keepVideoCount} videos)`);
  
  // Also find reaction videos by title
  const reactionVids = db.exec(`
    SELECT COUNT(*) FROM videos 
    WHERE LOWER(title) LIKE '%reaction%' 
       OR LOWER(title) LIKE '%react to%'
       OR LOWER(title) LIKE '%reacting%'
       OR LOWER(title) LIKE '%watching%reacts%'
  `);
  console.log(`  Reaction videos by title: ${reactionVids[0].values[0][0]}`);
  
  const duplicateTitles = db.exec(`
    SELECT title, COUNT(*) as cnt FROM videos 
    GROUP BY title HAVING cnt > 1 
    ORDER BY cnt DESC LIMIT 20
  `);
  if (duplicateTitles[0]) {
    console.log(`\n=== DUPLICATE TITLES (top 20) ===`);
    for (const row of duplicateTitles[0].values) {
      console.log(`  "${row[0]}" — ${row[1]} copies`);
    }
  }
}
run();
