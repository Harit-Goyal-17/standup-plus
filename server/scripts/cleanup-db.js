/**
 * cleanup-db.js
 * 
 * Removes junk from the database:
 * 1. Reaction/clip/compilation channels that aren't official comedians
 * 2. Reaction videos identified by title
 * 3. Duplicate videos (keeps the one with higher views)
 * 4. Non-comedy content from random channels
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
  console.log(`🧹 StandupStream Database Cleanup`);
  console.log(`==================================`);
  console.log(`Videos before cleanup: ${beforeCount}\n`);

  let totalRemoved = 0;

  // =============================================
  // STEP 1: Remove junk/reaction/clip channels
  // =============================================
  console.log('STEP 1: Removing junk channels...');

  // Channels that are clearly not comedian channels
  const junkChannelKeywords = [
    'reaction', 'react', 'clips', 'compilation', 'best of', 'highlights',
    'daily dose', 'top 10', 'viral', 'buzz', 'talks', 'update yourself',
    'news', 'empire', 'powerhouse', 'how to', 'learn', 'education',
    'tutorial', 'chart master', 'comedy by copy', 'uplift', 'pundank',
    'joke wrld', 'crowd crushers', 'laugh society', 'magic flicks',
    'real life comedy', 'spicy', 'haste raho', 'funflix', 'blockbuster',
    'standup central', 'comedy club', 'comedy time', 'cleantones',
    'minty', 'dark comedy cuts', 'cracked comedy', 'documentary',
    'dave chappelle documentary', 'chappelle stand up', 'dave bananamic',
    'chappelle\'s show', 'chappelle\'s comedy', 'cronotrig',
    'cuộc sống', 'روتيناتي', 'cakeorder', 'viento', 'sml movie',
    'entertainment', 'gorilla', 'dave chappelle stand up',
    'haku gore', 'true reactors', 'its', 'panchline', 'respect (standup',
    'our stupid reactions', 'viral khabar', 'reactions by',
    'khan talks', 's2 life', 'testing acadmy', 'beats 28',
    'solox', 'hasi_unlimited', 'chalchitra', 'cinedesi',
    'chalchitra talks',
  ];

  // Get all comedians
  const allComedians = db.exec("SELECT comedian_id, name FROM comedians");
  if (!allComedians[0]) { console.log('No comedians found'); return; }

  const junkComedianIds = [];
  for (const [id, name] of allComedians[0].values) {
    const nameLower = (name || '').toLowerCase();
    if (junkChannelKeywords.some(kw => nameLower.includes(kw))) {
      junkComedianIds.push(id);
    }
  }

  if (junkComedianIds.length > 0) {
    const placeholders = junkComedianIds.map(() => '?').join(',');
    const countResult = db.exec(
      `SELECT COUNT(*) FROM videos WHERE comedian_id IN (${placeholders})`,
      junkComedianIds
    );
    const count = countResult[0]?.values[0][0] || 0;
    
    // Delete videos from junk channels
    db.run(`DELETE FROM videos WHERE comedian_id IN (${placeholders})`, junkComedianIds);
    // Delete the junk comedians themselves
    db.run(`DELETE FROM comedians WHERE comedian_id IN (${placeholders})`, junkComedianIds);
    
    console.log(`  Removed ${count} videos from ${junkComedianIds.length} junk channels`);
    totalRemoved += count;
  }

  // =============================================
  // STEP 2: Remove reaction videos by title
  // =============================================
  console.log('\nSTEP 2: Removing reaction videos by title...');

  const reactionResult = db.exec(`
    SELECT COUNT(*) FROM videos 
    WHERE LOWER(title) LIKE '%reaction%' 
       OR LOWER(title) LIKE '%react to%'
       OR LOWER(title) LIKE '%reacting to%'
       OR LOWER(title) LIKE '%watching%reacts%'
       OR LOWER(title) LIKE '%reviewed by%'
       OR LOWER(title) LIKE '%review video%'
  `);
  const reactionCount = reactionResult[0].values[0][0];

  db.run(`
    DELETE FROM videos 
    WHERE LOWER(title) LIKE '%reaction%' 
       OR LOWER(title) LIKE '%react to%'
       OR LOWER(title) LIKE '%reacting to%'
       OR LOWER(title) LIKE '%watching%reacts%'
       OR LOWER(title) LIKE '%reviewed by%'
       OR LOWER(title) LIKE '%review video%'
  `);
  console.log(`  Removed ${reactionCount} reaction/review videos`);
  totalRemoved += reactionCount;

  // =============================================
  // STEP 3: Remove duplicate videos
  // =============================================
  console.log('\nSTEP 3: Removing duplicate videos...');

  // Find duplicate titles and keep the one with highest views
  const duplicates = db.exec(`
    SELECT title, COUNT(*) as cnt FROM videos 
    GROUP BY title HAVING cnt > 1
  `);
  
  let dupRemoved = 0;
  if (duplicates[0]) {
    for (const [title, cnt] of duplicates[0].values) {
      // Keep the one with highest views, delete the rest
      const vids = db.exec(
        `SELECT video_id, view_count FROM videos WHERE title = ? ORDER BY view_count DESC`,
        [title]
      );
      if (vids[0] && vids[0].values.length > 1) {
        // Keep first (highest views), delete rest
        const toDelete = vids[0].values.slice(1).map(r => r[0]);
        for (const vid of toDelete) {
          db.run("DELETE FROM videos WHERE video_id = ?", [vid]);
          dupRemoved++;
        }
      }
    }
  }
  console.log(`  Removed ${dupRemoved} duplicate videos`);
  totalRemoved += dupRemoved;

  // =============================================
  // STEP 4: Remove non-comedy content
  // =============================================
  console.log('\nSTEP 4: Removing non-comedy content by title...');

  const nonComedy = db.exec(`
    SELECT COUNT(*) FROM videos 
    WHERE LOWER(title) LIKE '%gaming%'
       OR LOWER(title) LIKE '%minecraft%'
       OR LOWER(title) LIKE '%fortnite%'
       OR LOWER(title) LIKE '%chess%stream%'
       OR LOWER(title) LIKE '%unboxing%'
       OR LOWER(title) LIKE '%recipe%'
       OR LOWER(title) LIKE '%cooking%'
       OR LOWER(title) LIKE '%workout%'
       OR LOWER(title) LIKE '%full movie%'
       OR LOWER(title) LIKE '%official trailer%'
       OR LOWER(title) LIKE '%music video%'
       OR LOWER(title) LIKE '%lyrical%'
       OR LOWER(title) LIKE '%meditation%'
       OR LOWER(title) LIKE '%asmr%'
  `);
  const nonComedyCount = nonComedy[0].values[0][0];

  db.run(`
    DELETE FROM videos 
    WHERE LOWER(title) LIKE '%gaming%'
       OR LOWER(title) LIKE '%minecraft%'
       OR LOWER(title) LIKE '%fortnite%'
       OR LOWER(title) LIKE '%chess%stream%'
       OR LOWER(title) LIKE '%unboxing%'
       OR LOWER(title) LIKE '%recipe%'
       OR LOWER(title) LIKE '%cooking%'
       OR LOWER(title) LIKE '%workout%'
       OR LOWER(title) LIKE '%full movie%'
       OR LOWER(title) LIKE '%official trailer%'
       OR LOWER(title) LIKE '%music video%'
       OR LOWER(title) LIKE '%lyrical%'
       OR LOWER(title) LIKE '%meditation%'
       OR LOWER(title) LIKE '%asmr%'
  `);
  console.log(`  Removed ${nonComedyCount} non-comedy videos`);
  totalRemoved += nonComedyCount;

  // =============================================
  // STEP 5: Remove orphan comedians (no videos)
  // =============================================
  console.log('\nSTEP 5: Removing orphan comedians with no videos...');
  
  const orphanResult = db.exec(`
    SELECT COUNT(*) FROM comedians c 
    WHERE NOT EXISTS (SELECT 1 FROM videos v WHERE v.comedian_id = c.comedian_id)
  `);
  const orphanCount = orphanResult[0].values[0][0];
  
  db.run(`
    DELETE FROM comedians 
    WHERE comedian_id NOT IN (SELECT DISTINCT comedian_id FROM videos)
  `);
  console.log(`  Removed ${orphanCount} orphan comedians`);

  // =============================================
  // STEP 6: Classify content types for new videos
  // =============================================
  console.log('\nSTEP 6: Classifying content types...');
  
  // Full specials
  db.run(`UPDATE videos SET content_type = 'full_special' WHERE content_type IS NULL AND (LOWER(title) LIKE '%full special%' OR LOWER(title) LIKE '%comedy special%' OR LOWER(title) LIKE '%one hour%' OR LOWER(title) LIKE '%1 hour%') AND duration_seconds > 2400`);
  // Crowd work
  db.run(`UPDATE videos SET content_type = 'crowd_work' WHERE content_type IS NULL AND (LOWER(title) LIKE '%crowd work%' OR LOWER(title) LIKE '%crowdwork%' OR LOWER(title) LIKE '%crowd interaction%')`);
  // Show episodes
  db.run(`UPDATE videos SET content_type = 'episode' WHERE content_type IS NULL AND (LOWER(title) LIKE '%episode%' OR LOWER(title) LIKE '% ep %' OR LOWER(title) LIKE '% ep.%' OR LOWER(title) LIKE '%full episode%' OR LOWER(title) LIKE '%| ep%')`);
  // Roasts
  db.run(`UPDATE videos SET content_type = 'roast' WHERE content_type IS NULL AND LOWER(title) LIKE '%roast%'`);
  // Default standup_set for anything still null
  db.run(`UPDATE videos SET content_type = 'standup_set' WHERE content_type IS NULL`);
  console.log('  Content types classified');

  // =============================================
  // Save & Report
  // =============================================
  console.log('\n💾 Saving database...');
  fs.writeFileSync(dbPath, Buffer.from(db.export()));

  const afterCount = db.exec("SELECT COUNT(*) FROM videos")[0].values[0][0];
  const comedianCount = db.exec("SELECT COUNT(*) FROM comedians")[0].values[0][0];

  console.log('\n==================================');
  console.log(`✅ Cleanup complete!`);
  console.log(`   Videos removed: ${totalRemoved}`);
  console.log(`   Videos remaining: ${afterCount}`);
  console.log(`   Comedians remaining: ${comedianCount}`);
  console.log('==================================\n');
}

run().catch(console.error);
