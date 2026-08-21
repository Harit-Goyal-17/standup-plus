/**
 * deep-cleanup.js
 * 
 * Aggressively filters the database to ONLY keep actual standup comedy content.
 * Removes: podcasts, vlogs, chess streams, KBC appearances, interviews,
 * behind-the-scenes, Q&As, gaming, reactions, news, etc.
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

  const beforeCount = db.exec("SELECT COUNT(*) FROM videos")[0].values[0][0];
  console.log(`🧹 Deep Comedy-Only Cleanup`);
  console.log(`============================`);
  console.log(`Videos before: ${beforeCount}\n`);

  let totalRemoved = 0;

  // =============================================
  // STEP 1: Remove non-comedy content by title keywords
  // =============================================
  console.log('STEP 1: Removing non-comedy content by title...');

  // Things that are NOT standup comedy
  const removePatterns = [
    // Podcasts & interviews
    '%podcast%', '%vlog%', '%vlogging%', '%q&a%', '%q & a%',
    '%interview%', '%behind the scenes%', '%bts%',
    '%day in my life%', '%routine%', '%morning routine%',
    '%get ready with%', '%grwm%',
    
    // Gaming & chess
    '%chess%stream%', '%chess%tournament%', '%playing chess%',
    '%gaming%', '%minecraft%', '%fortnite%', '%gta%', '%pubg%',
    '%valorant%', '%among us%',
    
    // TV show appearances (not standup)
    '%kaun banega%', '%kbc%', '%bigg boss%', '%big boss%',
    '%kapil sharma show%', '%tkss%',
    '%shark tank%', '%koffee with%',
    
    // Music & songs
    '%official music%', '%music video%', '%song%lyric%',
    '%rap%battle%', '%singing%',
    
    // Food & travel vlogs
    '%food%review%', '%restaurant%review%', '%mukbang%',
    '%travel%vlog%', '%hotel%review%', '%room tour%',
    
    // Reactions & commentary
    '%reaction%', '%reacting%', '%react to%',
    '%roasting%comments%', '%reading comments%',
    '%replying to%',
    
    // News & politics (not comedy)
    '%news%update%', '%breaking news%',
    
    // Unboxing & tech
    '%unboxing%', '%setup tour%', '%tech%review%',
    '%phone%review%',
    
    // Fitness
    '%workout%', '%gym%routine%', '%fitness%',
    
    // Cooking
    '%recipe%', '%cooking%', '%baking%',
    
    // Personal/lifestyle
    '%wedding%', '%marriage%ceremony%',
    '%birthday%party%', '%celebration%',
    '%house tour%', '%car%tour%',
    '%haul%', '%shopping%',
    
    // Shorts compilations (not original content)
    '%shorts%compilation%', '%tiktok%compilation%',
    '%meme%compilation%', '%best memes%',
    
    // Live streams (non-comedy)
    '%live stream%chess%', '%playing%live%',
    '%stream%highlights%',
    
    // Movies & trailers
    '%full movie%', '%trailer%', '%teaser%',
    '%movie review%', '%film review%',
    
    // Meditation/ASMR
    '%meditation%', '%asmr%', '%sleep%sounds%',
  ];

  for (const pattern of removePatterns) {
    const countResult = db.exec(`SELECT COUNT(*) FROM videos WHERE LOWER(title) LIKE '${pattern}'`);
    const count = countResult[0].values[0][0];
    if (count > 0) {
      db.run(`DELETE FROM videos WHERE LOWER(title) LIKE '${pattern}'`);
      totalRemoved += count;
      console.log(`  Removed ${count} videos matching "${pattern}"`);
    }
  }

  // =============================================
  // STEP 2: Keep ONLY videos that look like standup comedy
  // For channels with mixed content (Samay Raina, Tanmay Bhat, etc.)
  // =============================================
  console.log('\nSTEP 2: Filtering mixed-content channels...');

  // Channels known to have lots of non-comedy content
  const mixedContentChannels = [
    'Samay Raina',       // Has chess, podcasts, vlogs
    'Tanmay Bhat',       // Has vlogs, podcasts, reactions
    'Gursimran Khamba',  // Has vlogs, podcasts
    'Gaurav Kapoor',     // Has vlogs mixed in
    'Vivek Samtani',     // May have non-comedy
    'Kenny Sebastian',   // Has vlogs, music
    'Vir Das COMEDY',    // Mostly comedy but check
    'Biswa Kalyan Rath', // Has some non-comedy
    'Rahul Dua',         // Has vlogs
    'Sapan Verma',       // Has vlogs
    'Chirag Panjwani',   // May have mixed
    'Inder Sahani',      // May have mixed
    'Amit Tandon',       // May have mixed
    'Varun Grover',      // Has music, poetry
    'Naman Jain',        // May have mixed
    'Jaspreet Singh',    // May have mixed
  ];

  // Comedy-positive keywords in titles
  const comedyKeywords = [
    'standup', 'stand-up', 'stand up', 'comedy', 'comedian',
    'funny', 'jokes', 'joke', 'humor', 'humour', 'laugh',
    'crowd work', 'crowdwork', 'roast', 'roasting',
    'open mic', 'set', 'bit', 'special', 'full special',
    'hasi', 'hasya', 'haste', 'mazak', 'mazaak',
    'comicstaan', 'latent', 'one mic',
    'lie hard', 'bro code', 'pretty good', 'judge me',
    'akal ke ghode', 'nation wants', 'madhur model',
    'andha pyaar', 'loose emotions', 'who gets the booze',
    'punchline', 'comic', 'improv', 'sketch',
    'stage', 'audience', 'live show', 'show',
    'ep ', 'ep.', 'episode', 'season',
    'feat', 'ft.', 'ft ', 'featuring',
    '| stand', '- stand',
  ];

  for (const channelName of mixedContentChannels) {
    const comedian = db.exec(`SELECT comedian_id FROM comedians WHERE name = ?`, [channelName]);
    if (!comedian[0] || comedian[0].values.length === 0) continue;
    
    const comedianId = comedian[0].values[0][0];
    
    // Get all videos from this channel
    const videos = db.exec(`SELECT video_id, title, duration_seconds FROM videos WHERE comedian_id = ?`, [comedianId]);
    if (!videos[0]) continue;

    let removed = 0;
    for (const [videoId, title, duration] of videos[0].values) {
      const titleLower = (title || '').toLowerCase();
      
      // Check if it has any comedy keyword
      const isComedy = comedyKeywords.some(kw => titleLower.includes(kw));
      
      // If it doesn't look like comedy AND is not a typical standup duration (5-120 min)
      // Be more strict: remove if no comedy keywords found
      if (!isComedy) {
        // Give benefit of doubt to videos 10-90 minutes long (typical standup set)
        if (duration >= 600 && duration <= 5400) {
          // Could be standup, keep it
          continue;
        }
        db.run("DELETE FROM videos WHERE video_id = ?", [videoId]);
        removed++;
        totalRemoved++;
      }
    }
    if (removed > 0) {
      console.log(`  ${channelName}: removed ${removed} non-comedy videos`);
    }
  }

  // =============================================
  // STEP 3: Remove duplicates (keep highest views)
  // =============================================
  console.log('\nSTEP 3: Removing duplicate titles...');
  
  const duplicates = db.exec(`
    SELECT title, COUNT(*) as cnt FROM videos 
    GROUP BY title HAVING cnt > 1
  `);
  
  let dupRemoved = 0;
  if (duplicates[0]) {
    for (const [title] of duplicates[0].values) {
      const vids = db.exec(
        `SELECT video_id FROM videos WHERE title = ? ORDER BY view_count DESC`,
        [title]
      );
      if (vids[0] && vids[0].values.length > 1) {
        const toDelete = vids[0].values.slice(1).map(r => r[0]);
        for (const vid of toDelete) {
          db.run("DELETE FROM videos WHERE video_id = ?", [vid]);
          dupRemoved++;
          totalRemoved++;
        }
      }
    }
  }
  console.log(`  Removed ${dupRemoved} duplicate videos`);

  // =============================================
  // STEP 4: Classify content types properly
  // =============================================
  console.log('\nSTEP 4: Re-classifying content types...');
  
  // Reset all content types first
  db.run("UPDATE videos SET content_type = NULL");
  
  // Full specials (40+ min, keywords)
  db.run(`UPDATE videos SET content_type = 'full_special' WHERE 
    (LOWER(title) LIKE '%full special%' OR LOWER(title) LIKE '%comedy special%' 
     OR LOWER(title) LIKE '%one hour%' OR LOWER(title) LIKE '%1 hour%'
     OR LOWER(title) LIKE '%full show%' OR LOWER(title) LIKE '%full set%')
    AND duration_seconds > 2400`);
  
  // Also mark long videos (40+ min) with "full" or "special" in title
  db.run(`UPDATE videos SET content_type = 'full_special' WHERE content_type IS NULL
    AND duration_seconds > 2400
    AND (LOWER(title) LIKE '%full%' OR LOWER(title) LIKE '%special%' OR LOWER(title) LIKE '%complete%')`);
  
  // Crowd work
  db.run(`UPDATE videos SET content_type = 'crowd_work' WHERE content_type IS NULL
    AND (LOWER(title) LIKE '%crowd work%' OR LOWER(title) LIKE '%crowdwork%' 
     OR LOWER(title) LIKE '%crowd interaction%' OR LOWER(title) LIKE '%audience%interaction%')`);
  
  // Show episodes
  db.run(`UPDATE videos SET content_type = 'episode' WHERE content_type IS NULL
    AND (LOWER(title) LIKE '%episode%' OR LOWER(title) LIKE '% ep %' 
     OR LOWER(title) LIKE '% ep.%' OR LOWER(title) LIKE '%full episode%'
     OR LOWER(title) LIKE '%| ep%'
     OR LOWER(title) LIKE '%lie hard%' OR LOWER(title) LIKE '%bro code%'
     OR LOWER(title) LIKE '%pretty good roast%' OR LOWER(title) LIKE '%judge me if you can%'
     OR LOWER(title) LIKE '%akal ke ghode%' OR LOWER(title) LIKE '%nation wants%'
     OR LOWER(title) LIKE '%madhur model%' OR LOWER(title) LIKE '%andha pyaar%'
     OR LOWER(title) LIKE '%loose emotions%' OR LOWER(title) LIKE '%who gets the booze%'
     OR LOWER(title) LIKE '%india%got%latent%' OR LOWER(title) LIKE '%comicstaan%')`);
  
  // Roasts
  db.run(`UPDATE videos SET content_type = 'roast' WHERE content_type IS NULL
    AND (LOWER(title) LIKE '%roast%' AND LOWER(title) NOT LIKE '%roasting%comment%')`);
  
  // Standup bits (default for remaining, 3-40 min)
  db.run(`UPDATE videos SET content_type = 'standup_bit' WHERE content_type IS NULL
    AND duration_seconds BETWEEN 180 AND 2400`);
  
  // Long form standup for anything else over 40 min
  db.run(`UPDATE videos SET content_type = 'full_special' WHERE content_type IS NULL
    AND duration_seconds > 2400`);
  
  // Catch-all
  db.run(`UPDATE videos SET content_type = 'standup_bit' WHERE content_type IS NULL`);
  
  // Count by type
  const typeCounts = db.exec(`SELECT content_type, COUNT(*) as cnt FROM videos GROUP BY content_type ORDER BY cnt DESC`);
  if (typeCounts[0]) {
    for (const [type, count] of typeCounts[0].values) {
      console.log(`  ${type}: ${count} videos`);
    }
  }

  // =============================================
  // STEP 5: Clean up orphan comedians
  // =============================================
  console.log('\nSTEP 5: Removing orphan comedians...');
  const orphanCount = db.exec(`SELECT COUNT(*) FROM comedians WHERE comedian_id NOT IN (SELECT DISTINCT comedian_id FROM videos)`)[0].values[0][0];
  db.run(`DELETE FROM comedians WHERE comedian_id NOT IN (SELECT DISTINCT comedian_id FROM videos)`);
  console.log(`  Removed ${orphanCount} orphan comedians`);

  // =============================================
  // Save
  // =============================================
  console.log('\n💾 Saving...');
  fs.writeFileSync(dbPath, Buffer.from(db.export()));

  const afterCount = db.exec("SELECT COUNT(*) FROM videos")[0].values[0][0];
  const comedianCount = db.exec("SELECT COUNT(*) FROM comedians")[0].values[0][0];

  console.log(`\n============================`);
  console.log(`✅ Deep cleanup complete!`);
  console.log(`   Videos removed: ${totalRemoved}`);
  console.log(`   Videos remaining: ${afterCount}`);
  console.log(`   Comedians remaining: ${comedianCount}`);
  console.log(`============================\n`);
}

run().catch(console.error);
