import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import initSqlJs from 'sql.js';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { Recommender } from './recommender.js';
import { getShowsList, getShowDetails } from './shows.js';
import { startPeriodicSync, syncComedianVideos } from './services/youtubeSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const DB_PATH = process.env.DB_PATH || '../standup.db';
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendWelcomeEmail(toEmail, username) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email Notice] Welcome email to ${toEmail} queued. Email credentials not configured.`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"StandUp+ India" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '🎉 Welcome to StandUp+! Your Stand-Up Comedy Universe',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0a0a0f; color: #ffffff; padding: 40px 20px; text-align: center;">
          <div style="max-width: 540px; margin: 0 auto; background: #14141c; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
            <div style="font-size: 32px; font-weight: 900; color: #e50914; margin-bottom: 12px; font-family: sans-serif;">StandUp+</div>
            <h1 style="color: #ffffff; font-size: 22px; margin-bottom: 12px;">Welcome to StandUp+, ${username}! 🎤</h1>
            <p style="font-size: 15px; color: #a3a3a3; line-height: 1.6; margin-bottom: 24px;">
              Get ready for non-stop laughter! You now have access to India's top stand-up specials from Zakir Khan, Samay Raina, Bassi, Abhishek Upmanyu, and many more.
            </p>
            <a href="https://standup-plus.onrender.com" style="display: inline-block; padding: 14px 28px; background: #e50914; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 15px;">Start Watching Now</a>
            <p style="font-size: 12px; color: #666666; margin-top: 30px;">
              © 2026 StandUp+, Inc. All rights reserved.
            </p>
          </div>
        </div>
      `
    });
    console.log(`[Email Sent] Welcome email dispatched to ${toEmail}`);
  } catch (err) {
    console.error('Error sending welcome email:', err);
  }
}

const dbPathAbsolute = path.resolve(__dirname, DB_PATH);

let db;
let recommender;

function dbAll(sqlStr, params = []) {
  const stmt = db.prepare(sqlStr);
  stmt.bind(params);
  const rows = [];
  while(stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

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

function dbRun(sqlStr, params = []) {
  db.run(sqlStr, params);
}

function saveDb() {
  fs.writeFileSync(dbPathAbsolute, Buffer.from(db.export()));
}

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ====================
// PUBLIC ENDPOINTS
// ====================

app.get('/api/videos', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const sort = req.query.sort || 'view_count';
  const order = (req.query.order || 'desc').toUpperCase();

  const allowedSorts = ['view_count', 'like_count', 'published_at', 'duration_seconds'];
  const actualSort = allowedSorts.includes(sort) ? sort : 'view_count';
  const actualOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const videos = dbAll(`
    SELECT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id 
    ORDER BY v.${actualSort} ${actualOrder} 
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  const enriched = videos.map(video => {
    video.tags = dbAll('SELECT t.tag_name, t.tag_type FROM video_tags vt JOIN tags t ON vt.tag_id = t.tag_id WHERE vt.video_id = ?', [video.video_id]);
    return video;
  });

  const totalRow = dbGet('SELECT COUNT(*) as count FROM videos');
  const total = totalRow ? totalRow.count : 0;

  res.json({
    data: enriched,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

app.get('/api/videos/featured', asyncHandler(async (req, res) => {
  const videos = dbAll(`
    SELECT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id 
    WHERE v.duration_seconds >= 1800
    ORDER BY v.view_count DESC 
    LIMIT 10
  `);
  res.json(videos);
}));

app.get('/api/videos/filter', asyncHandler(async (req, res) => {
  let query = `
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
  `;
  const joins = [];
  const conditions = [];
  const params = [];

  const addTagFilter = (tagsStr, type, joinAlias) => {
    if (!tagsStr) return;
    const tags = tagsStr.split(',').map(t => t.trim());
    joins.push(`JOIN video_tags ${joinAlias} ON v.video_id = ${joinAlias}.video_id`);
    joins.push(`JOIN tags t_${joinAlias} ON ${joinAlias}.tag_id = t_${joinAlias}.tag_id`);
    conditions.push(`t_${joinAlias}.tag_type = ? AND t_${joinAlias}.tag_name IN (${tags.map(() => '?').join(',')})`);
    params.push(type, ...tags);
  };

  addTagFilter(req.query.style, 'style', 'vt_style');
  addTagFilter(req.query.tone, 'tone', 'vt_tone');
  addTagFilter(req.query.theme, 'theme', 'vt_theme');

  if (req.query.rating) {
    const ratings = req.query.rating.split(',').map(r => r.trim());
    conditions.push(`v.suggested_rating IN (${ratings.map(() => '?').join(',')})`);
    params.push(...ratings);
  }

  if (req.query.comedian) {
    const comedians = req.query.comedian.split(',').map(c => c.trim());
    conditions.push(`c.name IN (${comedians.map(() => '?').join(',')})`);
    params.push(...comedians);
  }

  if (req.query.minDuration) {
    conditions.push(`v.duration_seconds >= ?`);
    params.push(parseInt(req.query.minDuration));
  }
  if (req.query.maxDuration) {
    conditions.push(`v.duration_seconds <= ?`);
    params.push(parseInt(req.query.maxDuration));
  }

  if (joins.length > 0) query += ' ' + joins.join(' ');
  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');

  const sort = req.query.sort || 'view_count';
  const allowedSorts = ['view_count', 'like_count', 'published_at', 'duration_seconds'];
  const actualSort = allowedSorts.includes(sort) ? sort : 'view_count';
  query += ` ORDER BY v.${actualSort} DESC`;

  const videos = dbAll(query, params);
  res.json(videos);
}));

app.get('/api/videos/:id', asyncHandler(async (req, res) => {
  const video = dbGet(`
    SELECT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id 
    WHERE v.video_id = ?
  `, [req.params.id]);

  if (!video) return res.status(404).json({ error: 'Video not found' });

  const tags = dbAll(`
    SELECT t.tag_name, t.tag_type 
    FROM tags t 
    JOIN video_tags vt ON t.tag_id = vt.tag_id 
    WHERE vt.video_id = ?
  `, [req.params.id]);

  video.tags = tags;
  res.json(video);
}));

app.get('/api/videos/:id/related', asyncHandler(async (req, res) => {
  const currentVideo = dbGet(`
    SELECT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id 
    WHERE v.video_id = ?
  `, [req.params.id]);

  if (!currentVideo) return res.json([]);

  // Fetch candidate videos from same comedian, peer comedians, and top trending
  const candidates = dbAll(`
    SELECT v.*, c.name as comedian_name
    FROM videos v
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE v.video_id != ?
    ORDER BY 
      CASE WHEN v.comedian_id = ? THEN 1 ELSE 2 END,
      v.view_count DESC
    LIMIT 30
  `, [req.params.id, currentVideo.comedian_id]);

  // Attach tags & punchy Netflix-style synopses
  const result = candidates.map(v => {
    const vTags = dbAll(`
      SELECT t.tag_name, t.tag_type FROM tags t 
      JOIN video_tags vt ON t.tag_id = vt.tag_id 
      WHERE vt.video_id = ?
    `, [v.video_id]);
    
    // Generate punchy stand-up synopsis
    let synopsis = `A hit stand-up comedy set by ${v.comedian_name} packed with sharp timing, relatable observations, and live audience laughs.`;
    const titleLower = (v.title || '').toLowerCase();
    if (titleLower.includes('hostel') || titleLower.includes('college') || titleLower.includes('school') || titleLower.includes('cheating')) {
      synopsis = `Relive chaotic hostel memories, classroom nostalgia, and hilarious misadventures in this iconic performance.`;
    } else if (titleLower.includes('roast') || titleLower.includes('brocode') || v.suggested_rating === '18+') {
      synopsis = `An unfiltered, high-voltage comedy battle with savage one-liners, unscripted banter, and rapid-fire punchlines.`;
    } else if (titleLower.includes('crowd') || titleLower.includes('interaction')) {
      synopsis = `Spontaneous, high-energy crowd work with quick-witted comebacks and unexpected audience banter.`;
    } else if (titleLower.includes('relationship') || titleLower.includes('dating') || titleLower.includes('marriage') || titleLower.includes('breakup')) {
      synopsis = `A hilarious take on modern romance, awkward dates, arranged marriage expectations, and couples' quirks.`;
    } else if (titleLower.includes('delhi') || titleLower.includes('mumbai') || titleLower.includes('corporate') || titleLower.includes('job') || titleLower.includes('office')) {
      synopsis = `Sharp observational comedy taking on corporate office absurdities, city cultures, and everyday Indian life.`;
    } else if (v.duration_seconds >= 3000) {
      synopsis = `A full-length comedy special delivering masterclass storytelling, personal confessions, and non-stop punchlines.`;
    }

    return {
      ...v,
      tags: vTags,
      synopsis
    };
  });

  res.json(result);
}));

app.get('/api/comedians', asyncHandler(async (req, res) => {
  const comedians = dbAll(`
    SELECT c.*, 
           COUNT(v.video_id) as video_count,
           MAX(v.thumbnail_url) as thumbnail_url
    FROM comedians c 
    JOIN videos v ON c.comedian_id = v.comedian_id 
    GROUP BY c.comedian_id 
    HAVING COUNT(v.video_id) > 0
    ORDER BY video_count DESC
  `);
  res.json(comedians);
}));

app.get('/api/comedians/:id', asyncHandler(async (req, res) => {
  const comedian = dbGet('SELECT * FROM comedians WHERE comedian_id = ?', [req.params.id]);
  if (!comedian) return res.status(404).json({ error: 'Comedian not found' });

  const videos = dbAll('SELECT * FROM videos WHERE comedian_id = ?', [req.params.id]);
  comedian.videos = videos;
  res.json(comedian);
}));

app.get('/api/tags', asyncHandler(async (req, res) => {
  const tags = dbAll('SELECT * FROM tags');
  const grouped = { style: [], tone: [], theme: [] };
  tags.forEach(t => {
    if (grouped[t.tag_type]) grouped[t.tag_type].push(t.tag_name);
  });
  res.json(grouped);
}));

app.get('/api/search', asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const searchPattern = `%${q}%`;
  const videos = dbAll(`
    SELECT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id 
    WHERE v.title LIKE ? OR c.name LIKE ?
  `, [searchPattern, searchPattern]);
  res.json(videos);
}));

app.get('/api/shows', asyncHandler(async (req, res) => {
  const shows = getShowsList(dbAll);
  res.json(shows);
}));

app.get('/api/shows/:id', asyncHandler(async (req, res) => {
  const show = getShowDetails(req.params.id, dbAll);
  if (!show) return res.status(404).json({ error: 'Show not found' });
  res.json(show);
}));

app.get('/api/categories', asyncHandler(async (req, res) => {
  const categories = [];

  const getCategoryVideos = (query, params = []) => dbAll(query, params);

  const trendingVideos = getCategoryVideos(`
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE v.duration_seconds >= 1800
    ORDER BY v.view_count DESC
    LIMIT 10
  `);
  if (trendingVideos.length > 0) categories.push({ title: 'Trending Now', videos: trendingVideos });

  const newVideos = getCategoryVideos(`
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE v.duration_seconds >= 1800
    ORDER BY v.published_at DESC
    LIMIT 10
  `);
  if (newVideos.length > 0) categories.push({ title: 'Recently Added', videos: newVideos, isRecentlyAdded: true });

  const darkVideos = getCategoryVideos(`
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    JOIN video_tags vt ON v.video_id = vt.video_id
    JOIN tags t ON vt.tag_id = t.tag_id
    WHERE t.tag_name IN ('dark-and-cynical', 'sarcastic-and-biting') AND t.tag_type = 'tone' AND v.duration_seconds >= 1800
    ORDER BY RANDOM()
    LIMIT 10
  `);
  if (darkVideos.length > 0) categories.push({ title: 'Dark & Cynical', videos: darkVideos });

  const familyVideos = getCategoryVideos(`
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    JOIN video_tags vt ON v.video_id = vt.video_id
    JOIN tags t ON vt.tag_id = t.tag_id
    WHERE (
      (t.tag_name IN ('wholesome-and-lighthearted', 'nostalgic-and-warm') AND t.tag_type = 'tone')
      OR 
      (t.tag_name = 'family-and-upbringing' AND t.tag_type = 'theme' AND v.video_id IN (
        SELECT vt2.video_id FROM video_tags vt2 JOIN tags t2 ON vt2.tag_id = t2.tag_id 
        WHERE t2.tag_name IN ('wholesome-and-lighthearted', 'nostalgic-and-warm', 'self-deprecating-humor') AND t2.tag_type = 'tone'
      ))
    ) AND v.duration_seconds >= 1800
    ORDER BY RANDOM()
    LIMIT 10
  `);
  if (familyVideos.length > 0) categories.push({ title: 'Family & Wholesome', videos: familyVideos });

  const crowdVideos = getCategoryVideos(`
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    JOIN video_tags vt ON v.video_id = vt.video_id
    JOIN tags t ON vt.tag_id = t.tag_id
    WHERE t.tag_name = 'crowd-work-heavy' AND t.tag_type = 'style' AND v.duration_seconds >= 1800
    ORDER BY RANDOM()
    LIMIT 10
  `);
  if (crowdVideos.length > 0) categories.push({ title: 'Crowd Work Masters', videos: crowdVideos });

  const storytellerVideos = getCategoryVideos(`
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    JOIN video_tags vt ON v.video_id = vt.video_id
    JOIN tags t ON vt.tag_id = t.tag_id
    WHERE t.tag_name = 'anecdotal-storytelling' AND t.tag_type = 'style' AND v.duration_seconds >= 1800
    ORDER BY RANDOM()
    LIMIT 10
  `);
  if (storytellerVideos.length > 0) categories.push({ title: 'Storytellers', videos: storytellerVideos });

  const relationshipVideos = getCategoryVideos(`
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    JOIN video_tags vt ON v.video_id = vt.video_id
    JOIN tags t ON vt.tag_id = t.tag_id
    WHERE t.tag_name = 'romantic-relationships' AND t.tag_type = 'theme' AND v.duration_seconds >= 1800
    ORDER BY RANDOM()
    LIMIT 10
  `);
  if (relationshipVideos.length > 0) categories.push({ title: 'Relationship Comedy', videos: relationshipVideos });

  const corporateVideos = getCategoryVideos(`
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    JOIN video_tags vt ON v.video_id = vt.video_id
    JOIN tags t ON vt.tag_id = t.tag_id
    WHERE t.tag_name = 'corporate-and-work-life' AND t.tag_type = 'theme' AND v.duration_seconds >= 1800
    ORDER BY RANDOM()
    LIMIT 10
  `);
  if (corporateVideos.length > 0) categories.push({ title: 'Corporate Life', videos: corporateVideos });

  // ==============================
  // TOP 10 SECTIONS (Netflix-style)
  // ==============================

  // Comedy Series — series and episodes
  const topEpisodes = getCategoryVideos(`
    SELECT DISTINCT v.*, c.name as comedian_name 
    FROM videos v 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE v.content_type = 'episode'
    ORDER BY v.view_count DESC
    LIMIT 10
  `);
  if (topEpisodes.length > 0) categories.push({ title: 'Comedy Series', videos: topEpisodes, isTop10: true });

  // Top 10 Comedy Specials — full specials ranked by views
  const topSpecials = getCategoryVideos(`
    SELECT v.*, c.name as comedian_name
    FROM videos v
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE v.duration_seconds >= 3600 AND (v.content_type = 'full_special' OR LOWER(v.title) LIKE '%special%' OR LOWER(v.title) LIKE '%full%')
    ORDER BY v.view_count DESC
    LIMIT 10
  `);
  if (topSpecials.length > 0) categories.push({ title: topSpecials.length >= 10 ? 'Top 10 Specials Today' : 'Top Comedy Specials', videos: topSpecials, isTop10: true });

  // Top 10 Standup Bits — shorter popular standup sets (3-40 min)
  const topBits = getCategoryVideos(`
    SELECT v.*, c.name as comedian_name
    FROM videos v
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE (v.content_type IN ('standup_set', 'standup_bit') OR v.content_type IS NULL)
      AND v.duration_seconds BETWEEN 180 AND 2400
    ORDER BY v.view_count DESC
    LIMIT 10
  `);
  if (topBits.length > 0) categories.push({ title: 'Top 10 Standup Bits Today', videos: topBits, isTop10: true });

  // Top 10 Roasts
  const topRoasts = getCategoryVideos(`
    SELECT v.*, c.name as comedian_name
    FROM videos v
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE v.content_type = 'roast'
       OR LOWER(v.title) LIKE '%roast%'
    ORDER BY v.view_count DESC
    LIMIT 10
  `);
  if (topRoasts.length > 0) categories.push({ title: topRoasts.length >= 10 ? 'Top 10 Roasts' : 'Top Roasts', videos: topRoasts, isTop10: true });

  // Top 10 Crowd Work
  const topCrowdWork = getCategoryVideos(`
    SELECT v.*, c.name as comedian_name
    FROM videos v
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE v.content_type = 'crowd_work'
       OR LOWER(v.title) LIKE '%crowd%'
    ORDER BY v.view_count DESC
    LIMIT 10
  `);
  if (topCrowdWork.length > 0) categories.push({ title: topCrowdWork.length >= 10 ? 'Top 10 Crowd Work' : 'Top Crowd Work', videos: topCrowdWork, isTop10: true });

  res.json(categories);
}));

// ====================
// AUTH ENDPOINTS
// ====================

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim().toLowerCase();
  
  // RFC 5322 standard pattern
  const basicRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
  if (!basicRegex.test(clean)) return false;

  const parts = clean.split('@');
  if (parts.length !== 2) return false;
  const [localPart, domain] = parts;
  if (!localPart || !domain || localPart.length > 64) return false;

  // Catch common typo domains (e.g. gmail.cut, gmail.con, gamil.com)
  const typoDomainPatterns = [
    /^gmail\.(?!com$)[a-z]+$/,
    /^yahoo\.(?!com$|co\.in$|in$)[a-z.]+$/,
    /^outlook\.(?!com$|in$)[a-z.]+$/,
    /^hotmail\.(?!com$|co\.in$)[a-z.]+$/,
    /^icloud\.(?!com$)[a-z]+$/,
    /^gamil\./,
    /^gmial\./,
    /^gmaill\./,
    /^yaho\./,
    /^outlok\./,
    /^hotmial\./
  ];

  for (const pattern of typoDomainPatterns) {
    if (pattern.test(domain)) return false;
  }

  // Valid Top-Level Domains list
  const validTLDs = [
    'com', 'in', 'org', 'net', 'edu', 'gov', 'mil', 'co', 'io', 'ai', 'app', 'dev', 'me',
    'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'br', 'ru', 'ch', 'it', 'nl', 'se', 'no', 'es',
    'co.in', 'co.uk', 'ac.in', 'gov.in', 'org.in', 'net.in', 'edu.in'
  ];

  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  const tld = domainParts.slice(1).join('.');
  const lastPart = domainParts[domainParts.length - 1];

  if (!validTLDs.includes(tld) && !validTLDs.includes(lastPart)) {
    return false;
  }

  return true;
}

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim();

  // Strict Real Email Format & Typo Validation
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid, real email address (e.g. name@gmail.com).' });
  }

  // Validate Password Complexity
  const passRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passRegex.test(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters and include at least one letter, one number, and one special character.' 
    });
  }

  const existing = dbGet('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?', [cleanUsername.toLowerCase(), cleanEmail]);
  if (existing) return res.status(400).json({ error: 'An account with this username or email already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const userId = uuidv4();
  
  // 1. Create User
  dbRun(`
    INSERT INTO users (user_id, username, email, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [userId, cleanUsername, cleanEmail, hash, new Date().toISOString()]);

  // 2. Automatically create initial default profile with their chosen username and Classic Avatar
  const profileId = userId + '-' + Date.now();
  const defaultAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=red-bot&backgroundColor=e50914';
  dbRun(`
    INSERT INTO profiles (profile_id, user_id, name, avatar_url, is_locked)
    VALUES (?, ?, ?, ?, 0)
  `, [profileId, userId, cleanUsername, defaultAvatar]);

  saveDb();

  // 3. Send welcome email ONLY once on initial signup
  sendWelcomeEmail(cleanEmail, cleanUsername);

  const token = jwt.sign({ userId, username: cleanUsername }, JWT_SECRET);
  const defaultProfile = { profile_id: profileId, user_id: userId, name: cleanUsername, avatar_url: defaultAvatar, is_locked: 0 };

  res.json({ 
    token, 
    user: { userId, username: cleanUsername, email: cleanEmail }, 
    profile: defaultProfile,
    profiles: [defaultProfile]
  });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const cleanEmail = email.trim().toLowerCase();
  const user = dbGet('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Ensure user has at least one profile
  let userProfiles = dbAll('SELECT profile_id, user_id, name, avatar_url, is_locked FROM profiles WHERE user_id = ?', [user.user_id]);
  if (userProfiles.length === 0) {
    const profileId = user.user_id + '-' + Date.now();
    const defaultAvatar = user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=red-bot&backgroundColor=e50914';
    dbRun(`
      INSERT INTO profiles (profile_id, user_id, name, avatar_url, is_locked)
      VALUES (?, ?, ?, ?, 0)
    `, [profileId, user.user_id, user.username, defaultAvatar]);
    saveDb();
    userProfiles = [{ profile_id: profileId, user_id: user.user_id, name: user.username, avatar_url: defaultAvatar, is_locked: 0 }];
  }

  const token = jwt.sign({ userId: user.user_id, username: user.username }, JWT_SECRET);
  res.json({ 
    token, 
    user: { userId: user.user_id, username: user.username, email: user.email },
    profile: userProfiles[0],
    profiles: userProfiles
  });
}));

app.post('/api/auth/google', asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanName = (payload.name || payload.email.split('@')[0]).trim();
    const picture = payload.picture;

    let user = dbGet('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    let isNewUser = false;
    
    if (!user) {
      isNewUser = true;
      const userId = uuidv4();
      const randomPasswordHash = bcrypt.hashSync(uuidv4(), 10);
      dbRun(`
        INSERT INTO users (user_id, username, email, password_hash, avatar_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, cleanName, cleanEmail, randomPasswordHash, picture, new Date().toISOString()]);
      
      const profileId = userId + '-' + Date.now();
      const userAvatar = picture || 'https://api.dicebear.com/7.x/bottts/svg?seed=red-bot&backgroundColor=e50914';
      dbRun(`
        INSERT INTO profiles (profile_id, user_id, name, avatar_url, is_locked)
        VALUES (?, ?, ?, ?, 0)
      `, [profileId, userId, cleanName, userAvatar]);

      saveDb();
      
      // Welcome email ONLY on initial Google registration
      sendWelcomeEmail(cleanEmail, cleanName);
      
      user = { user_id: userId, username: cleanName, email: cleanEmail, avatar_url: picture };
    }

    let userProfiles = dbAll('SELECT profile_id, user_id, name, avatar_url, is_locked FROM profiles WHERE user_id = ?', [user.user_id]);
    if (userProfiles.length === 0) {
      const profileId = user.user_id + '-' + Date.now();
      const userAvatar = user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=red-bot&backgroundColor=e50914';
      dbRun(`
        INSERT INTO profiles (profile_id, user_id, name, avatar_url, is_locked)
        VALUES (?, ?, ?, ?, 0)
      `, [profileId, user.user_id, user.username, userAvatar]);
      saveDb();
      userProfiles = [{ profile_id: profileId, user_id: user.user_id, name: user.username, avatar_url: userAvatar, is_locked: 0 }];
    }

    const token = jwt.sign({ userId: user.user_id, username: user.username }, JWT_SECRET);
    res.json({ 
      token, 
      user: { userId: user.user_id, username: user.username, email: user.email, avatar_url: user.avatar_url },
      profile: userProfiles[0],
      profiles: userProfiles
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ error: `Google Auth Failed: ${err.message}` });
  }
}));

app.get('/api/auth/me', authenticate, asyncHandler(async (req, res) => {
  const user = dbGet('SELECT user_id, username, email, avatar_url, created_at FROM users WHERE user_id = ?', [req.user.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}));

// ====================
// PROTECTED ENDPOINTS
// ====================

// --- Profiles API ---
app.get('/api/profiles', authenticate, asyncHandler(async (req, res) => {
  const profiles = dbAll('SELECT profile_id, user_id, name, avatar_url, is_locked FROM profiles WHERE user_id = ?', [req.user.userId]);
  res.json(profiles);
}));

app.post('/api/profiles', authenticate, asyncHandler(async (req, res) => {
  const { name, avatar_url, pin, is_locked } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const profileId = req.user.userId + '-' + Date.now();
  const avatar = avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}&backgroundColor=e50914`;
  dbRun('INSERT INTO profiles (profile_id, user_id, name, avatar_url, is_locked, pin) VALUES (?, ?, ?, ?, ?, ?)', [
    profileId, 
    req.user.userId, 
    name, 
    avatar, 
    is_locked ? 1 : 0, 
    pin || null
  ]);
  saveDb();
  const profile = dbGet('SELECT profile_id, user_id, name, avatar_url, is_locked FROM profiles WHERE profile_id = ?', [profileId]);
  res.json(profile);
}));

app.put('/api/profiles/:id', authenticate, asyncHandler(async (req, res) => {
  const { name, avatar_url, is_locked, pin } = req.body;
  const current = dbGet('SELECT * FROM profiles WHERE profile_id = ? AND user_id = ?', [req.params.id, req.user.userId]);
  if (!current) return res.status(404).json({ error: 'Profile not found' });

  const updatedName = name !== undefined ? name : current.name;
  const updatedAvatar = avatar_url !== undefined ? avatar_url : current.avatar_url;
  const updatedLocked = is_locked !== undefined ? (is_locked ? 1 : 0) : (current.is_locked || 0);
  const updatedPin = pin !== undefined ? pin : current.pin;

  dbRun(`
    UPDATE profiles 
    SET name = ?, avatar_url = ?, is_locked = ?, pin = ? 
    WHERE profile_id = ? AND user_id = ?
  `, [updatedName, updatedAvatar, updatedLocked, updatedPin, req.params.id, req.user.userId]);
  saveDb();
  
  const profile = dbGet('SELECT profile_id, user_id, name, avatar_url, is_locked FROM profiles WHERE profile_id = ?', [req.params.id]);
  res.json(profile);
}));

app.post('/api/profiles/:id/verify-pin', authenticate, asyncHandler(async (req, res) => {
  const { pin } = req.body;
  const profile = dbGet('SELECT * FROM profiles WHERE profile_id = ? AND user_id = ?', [req.params.id, req.user.userId]);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  
  if (!profile.is_locked || profile.pin === pin || !profile.pin) {
    return res.json({ 
      success: true, 
      profile: {
        profile_id: profile.profile_id,
        user_id: profile.user_id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        is_locked: profile.is_locked
      } 
    });
  }
  
  res.status(400).json({ error: 'Incorrect PIN' });
}));

app.delete('/api/profiles/:id', authenticate, asyncHandler(async (req, res) => {
  // Prevent deleting the last profile
  const profiles = dbAll('SELECT * FROM profiles WHERE user_id = ?', [req.user.userId]);
  if (profiles.length <= 1) return res.status(400).json({ error: 'Cannot delete the last profile' });
  
  dbRun('DELETE FROM profiles WHERE profile_id = ? AND user_id = ?', [req.params.id, req.user.userId]);
  saveDb();
  res.json({ success: true });
}));

// --- User API (Using Profiles) ---

app.get('/api/user/favorites', authenticate, asyncHandler(async (req, res) => {
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  const favorites = dbAll(`
    SELECT v.*, c.name as comedian_name 
    FROM favorites f 
    JOIN videos v ON f.video_id = v.video_id 
    JOIN comedians c ON v.comedian_id = c.comedian_id
    WHERE f.user_id = ?
  `, [profileId]);
  res.json(favorites);
}));

app.post('/api/user/favorites', authenticate, asyncHandler(async (req, res) => {
  const { videoId } = req.body;
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  try {
    dbRun('INSERT INTO favorites (user_id, video_id, added_at) VALUES (?, ?, ?)', [profileId, videoId, new Date().toISOString()]);
    saveDb();
    res.json({ success: true });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.json({ success: true });
    }
    throw err;
  }
}));

app.delete('/api/user/favorites/:videoId', authenticate, asyncHandler(async (req, res) => {
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  dbRun('DELETE FROM favorites WHERE user_id = ? AND video_id = ?', [profileId, req.params.videoId]);
  saveDb();
  res.json({ success: true });
}));

app.get('/api/user/favorite-comedian', authenticate, asyncHandler(async (req, res) => {
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  const isDefaultProfile = profileId === req.user.userId || profileId.endsWith('-default-profile');
  const fav = isDefaultProfile 
    ? dbGet(`
        SELECT c.*, COUNT(v.video_id) as interact_count
        FROM (
          SELECT video_id FROM favorites WHERE user_id = ? OR user_id = ?
          UNION ALL
          SELECT video_id FROM watch_history WHERE user_id = ? OR user_id = ?
          UNION ALL
          SELECT video_id FROM user_ratings WHERE (user_id = ? OR user_id = ?) AND rating >= 4
        ) combined
        JOIN videos v ON combined.video_id = v.video_id
        JOIN comedians c ON v.comedian_id = c.comedian_id
        GROUP BY c.comedian_id
        ORDER BY interact_count DESC
        LIMIT 1
      `, [profileId, req.user.userId, profileId, req.user.userId, profileId, req.user.userId])
    : dbGet(`
        SELECT c.*, COUNT(v.video_id) as interact_count
        FROM (
          SELECT video_id FROM favorites WHERE user_id = ?
          UNION ALL
          SELECT video_id FROM watch_history WHERE user_id = ?
          UNION ALL
          SELECT video_id FROM user_ratings WHERE user_id = ? AND rating >= 4
        ) combined
        JOIN videos v ON combined.video_id = v.video_id
        JOIN comedians c ON v.comedian_id = c.comedian_id
        GROUP BY c.comedian_id
        ORDER BY interact_count DESC
        LIMIT 1
      `, [profileId, profileId, profileId]);
  
  if (!fav) return res.json(null);
  
  const videos = dbAll('SELECT * FROM videos WHERE comedian_id = ? ORDER BY view_count DESC LIMIT 10', [fav.comedian_id]);
  // Fetch tags for these videos
  const enrichedVideos = videos.map(video => {
    video.tags = dbAll('SELECT t.tag_name, t.tag_type FROM video_tags vt JOIN tags t ON vt.tag_id = t.tag_id WHERE vt.video_id = ?', [video.video_id]);
    video.comedian_name = fav.name;
    return video;
  });
  
  res.json({ comedian: fav, videos: enrichedVideos });
}));

app.post('/api/user/watch-history', authenticate, asyncHandler(async (req, res) => {
  const { videoId, watchDurationSeconds, completed } = req.body;
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  const now = new Date().toISOString();
  
  dbRun(`
    INSERT INTO watch_history (user_id, video_id, watched_at, watch_duration_seconds, completed)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, video_id) DO UPDATE SET
      watched_at = excluded.watched_at,
      watch_duration_seconds = excluded.watch_duration_seconds,
      completed = excluded.completed
  `, [profileId, videoId, now, watchDurationSeconds || 0, completed ? 1 : 0]);
  
  saveDb();
  res.json({ success: true });
}));

app.get('/api/user/watch-history', authenticate, asyncHandler(async (req, res) => {
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  const isDefaultProfile = profileId === req.user.userId || profileId.endsWith('-default-profile');
  
  const history = isDefaultProfile
    ? dbAll(`
        SELECT v.*, c.name as comedian_name, w.watched_at, w.watch_duration_seconds, w.completed
        FROM watch_history w 
        JOIN videos v ON w.video_id = v.video_id 
        JOIN comedians c ON v.comedian_id = c.comedian_id
        WHERE w.user_id = ? OR w.user_id = ?
        ORDER BY w.watched_at DESC
      `, [profileId, req.user.userId])
    : dbAll(`
        SELECT v.*, c.name as comedian_name, w.watched_at, w.watch_duration_seconds, w.completed
        FROM watch_history w 
        JOIN videos v ON w.video_id = v.video_id 
        JOIN comedians c ON v.comedian_id = c.comedian_id
        WHERE w.user_id = ?
        ORDER BY w.watched_at DESC
      `, [profileId]);

  // Enrich with tags for hover card dot-separated topics
  const enriched = history.map(video => {
    video.tags = dbAll('SELECT t.tag_name, t.tag_type FROM video_tags vt JOIN tags t ON vt.tag_id = t.tag_id WHERE vt.video_id = ?', [video.video_id]);
    return video;
  });

  res.json(enriched);
}));

app.delete('/api/user/watch-history/:videoId', authenticate, asyncHandler(async (req, res) => {
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  dbRun('DELETE FROM watch_history WHERE (user_id = ? OR user_id = ?) AND video_id = ?', [profileId, req.user.userId, req.params.videoId]);
  saveDb();
  res.json({ success: true });
}));

app.get('/api/user/ratings', authenticate, asyncHandler(async (req, res) => {
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  const isDefaultProfile = profileId === req.user.userId || profileId.endsWith('-default-profile');
  
  const ratings = isDefaultProfile
    ? dbAll(`
        SELECT r.rating, r.rated_at, v.*, c.name as comedian_name
        FROM user_ratings r
        JOIN videos v ON r.video_id = v.video_id
        JOIN comedians c ON v.comedian_id = c.comedian_id
        WHERE r.user_id = ? OR r.user_id = ?
        ORDER BY r.rated_at DESC
      `, [profileId, req.user.userId])
    : dbAll(`
        SELECT r.rating, r.rated_at, v.*, c.name as comedian_name
        FROM user_ratings r
        JOIN videos v ON r.video_id = v.video_id
        JOIN comedians c ON v.comedian_id = c.comedian_id
        WHERE r.user_id = ?
        ORDER BY r.rated_at DESC
      `, [profileId]);

  res.json(ratings);
}));

app.post('/api/user/ratings', authenticate, asyncHandler(async (req, res) => {
  const { videoId, rating } = req.body;
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  dbRun(`
    INSERT INTO user_ratings (user_id, video_id, rating, rated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, video_id) DO UPDATE SET
      rating = excluded.rating,
      rated_at = excluded.rated_at
  `, [profileId, videoId, rating, new Date().toISOString()]);
  saveDb();
  res.json({ success: true });
}));

app.get('/api/recommendations', authenticate, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const profileId = req.headers['x-profile-id'] || req.user.userId;
  let recommendations = recommender.getRecommendations(profileId, limit);
  if ((!recommendations || recommendations.length === 0) && profileId !== req.user.userId) {
    recommendations = recommender.getRecommendations(req.user.userId, limit);
  }
  res.json(recommendations);
}));

// Trigger manual/scheduled YouTube sync for new videos
app.post('/api/sync/youtube', asyncHandler(async (req, res) => {
  const result = await syncComedianVideos(db, saveDb);
  res.json(result);
}));

// Serve static React build in production
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    const SQL = await initSqlJs();
    let buffer;
    try {
      buffer = fs.readFileSync(dbPathAbsolute);
    } catch (e) {
      console.warn('DB file not found, creating a new one.');
      // Empty db will be created
    }
    db = new SQL.Database(buffer);
    
    // Ensure profiles schema has is_locked and pin columns
    try { db.run("ALTER TABLE profiles ADD COLUMN pin TEXT"); } catch(e) {}
    try { db.run("ALTER TABLE profiles ADD COLUMN is_locked INTEGER DEFAULT 0"); } catch(e) {}
    saveDb();

    recommender = new Recommender(db);

    // Start automated recurring YouTube sync
    startPeriodicSync(db, saveDb);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
