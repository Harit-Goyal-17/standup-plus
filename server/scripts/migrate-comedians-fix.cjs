const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function migrate() {
  const SQL = await initSqlJs();
  const dbFile = path.resolve(__dirname, '../../standup.db');
  const db = new SQL.Database(fs.readFileSync(dbFile));

  console.log('--- Starting Migration ---');

  // 1. Purge all shorts / reels (< 240s)
  try { db.run('DELETE FROM video_tags WHERE video_id IN (SELECT video_id FROM videos WHERE duration_seconds < 240 OR duration_seconds IS NULL)'); } catch(e) {}
  try { db.run('DELETE FROM watch_history WHERE video_id IN (SELECT video_id FROM videos WHERE duration_seconds < 240 OR duration_seconds IS NULL)'); } catch(e) {}
  try { db.run('DELETE FROM favorites WHERE video_id IN (SELECT video_id FROM videos WHERE duration_seconds < 240 OR duration_seconds IS NULL)'); } catch(e) {}
  try { db.run('DELETE FROM user_ratings WHERE video_id IN (SELECT video_id FROM videos WHERE duration_seconds < 240 OR duration_seconds IS NULL)'); } catch(e) {}
  try { db.run('DELETE FROM videos WHERE duration_seconds < 240 OR duration_seconds IS NULL'); } catch(e) {}

  // 2. Comedians updates
  db.run("UPDATE comedians SET name = 'Prashasti Singh', profile_image_url = '/images/comedians/prashasti_singh.jpg' WHERE comedian_id = 482");
  db.run("UPDATE comedians SET name = 'Swati Sachdeva', profile_image_url = '/images/comedians/swati_sachdeva.jpg' WHERE comedian_id = 400");

  // Upsert Vaibhav Karn (530)
  const vExist = db.exec("SELECT comedian_id FROM comedians WHERE comedian_id = 530 OR name = 'Vaibhav Karn'");
  if (vExist.length === 0 || vExist[0].values.length === 0) {
    db.run("INSERT INTO comedians (comedian_id, name, profile_image_url) VALUES (530, 'Vaibhav Karn', '/images/comedians/vaibhav_karn.jpg')");
  } else {
    db.run("UPDATE comedians SET profile_image_url = '/images/comedians/vaibhav_karn.jpg' WHERE name = 'Vaibhav Karn'");
  }

  // Upsert Trisha Pathak (531)
  const tExist = db.exec("SELECT comedian_id FROM comedians WHERE comedian_id = 531 OR name = 'Trisha Pathak'");
  if (tExist.length === 0 || tExist[0].values.length === 0) {
    db.run("INSERT INTO comedians (comedian_id, name, profile_image_url) VALUES (531, 'Trisha Pathak', '/images/comedians/trisha_pathak.jpg')");
  } else {
    db.run("UPDATE comedians SET profile_image_url = '/images/comedians/trisha_pathak.jpg' WHERE name = 'Trisha Pathak'");
  }

  // 3. Fix Swati Sachdeva standup bits (reassign to 400 with correct titles)
  const swatiBits = [
    {
      video_id: 'Cl618XVFKmc',
      title: 'Love is Love | Stand-up comedy by Swati Sachdeva',
      comedian_id: 400,
      thumbnail_url: 'https://i.ytimg.com/vi/Cl618XVFKmc/hqdefault.jpg',
      duration_seconds: 533,
      view_count: 14000000,
      like_count: 500000,
      suggested_rating: '16+',
      content_type: 'standup_bit'
    },
    {
      video_id: '28Dh5jEqJlw',
      title: 'My first Live-in Relationship | Stand-up comedy by Swati Sachdeva',
      comedian_id: 400,
      thumbnail_url: 'https://i.ytimg.com/vi/28Dh5jEqJlw/hqdefault.jpg',
      duration_seconds: 710,
      view_count: 3280000,
      like_count: 140000,
      suggested_rating: '16+',
      content_type: 'standup_bit'
    },
    {
      video_id: 'ps8sLxtqgkg',
      title: 'The Story So Far | Stand-up comedy by Swati Sachdeva',
      comedian_id: 400,
      thumbnail_url: 'https://i.ytimg.com/vi/ps8sLxtqgkg/hqdefault.jpg',
      duration_seconds: 1079,
      view_count: 2100000,
      like_count: 95000,
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: 'mTfSyBqwIV8',
      title: 'Family First | Stand-up comedy by Swati Sachdeva | U/A 16+',
      comedian_id: 400,
      thumbnail_url: 'https://i.ytimg.com/vi/mTfSyBqwIV8/hqdefault.jpg',
      duration_seconds: 1218,
      view_count: 1900000,
      like_count: 85000,
      suggested_rating: '16+',
      content_type: 'standup_bit'
    },
    {
      video_id: 'dlKrOTgVCSw',
      title: 'Once a Cheater | Stand-up comedy by Swati Sachdeva',
      comedian_id: 400,
      thumbnail_url: 'https://i.ytimg.com/vi/dlKrOTgVCSw/hqdefault.jpg',
      duration_seconds: 1233,
      view_count: 1800000,
      like_count: 78000,
      suggested_rating: '16+',
      content_type: 'standup_bit'
    }
  ];

  for (const v of swatiBits) {
    db.run('DELETE FROM videos WHERE video_id = ?', [v.video_id]);
    db.run(`INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, like_count, published_at, suggested_rating, content_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, '2023-01-01T00:00:00Z', ?, ?)`,
      [v.video_id, v.title, v.comedian_id, v.thumbnail_url, v.duration_seconds, v.view_count, v.like_count, v.suggested_rating, v.content_type]
    );
  }

  // 4. Clean out wrong Prashasti videos (like kmcnAEP14Sk which was Shashi Dhiman)
  db.run("DELETE FROM videos WHERE video_id = 'kmcnAEP14Sk'");

  // 5. Insert Prashasti Singh's REAL stand-up specials and bits (comedian_id = 482)
  const prashastiVideos = [
    {
      video_id: 'bXEJzKpAlCs',
      title: 'Prashasti Singh | Divine Feminine | Comedy Special | Hindi',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/bXEJzKpAlCs/hqdefault.jpg',
      duration_seconds: 4429,
      view_count: 1238742,
      like_count: 75000,
      published_at: '2023-08-20T12:00:00Z',
      suggested_rating: 'U/A 16+',
      content_type: 'full_special'
    },
    {
      video_id: 'Ta06DuN04mE',
      title: 'Teenage Drama | Part 1 of Door Khadi Sharmaaye | Standup Comedy by Prashasti Singh',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/Ta06DuN04mE/hqdefault.jpg',
      duration_seconds: 1036,
      view_count: 3922703,
      like_count: 150000,
      published_at: '2022-04-10T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: 'wACkmQCPabc',
      title: 'Retired Romantic | Part 2 of Door Khadi Sharmaaye | Standup Comedy by Prashasti Singh',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/wACkmQCPabc/hqdefault.jpg',
      duration_seconds: 427,
      view_count: 1350885,
      like_count: 65000,
      published_at: '2022-04-17T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: 'Vjb3uoVMHkE',
      title: 'Dance of Envy | Part 3 of Door Khadi Sharmaaye | Standup Comedy by Prashasti Singh',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/Vjb3uoVMHkE/hqdefault.jpg',
      duration_seconds: 1074,
      view_count: 1759046,
      like_count: 82000,
      published_at: '2022-04-24T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: '-FP3sqi4kWQ',
      title: 'Dil To Paagal Hai | Part 4 of Door Khadi Sharmaaye | Standup Comedy by Prashasti Singh',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/-FP3sqi4kWQ/hqdefault.jpg',
      duration_seconds: 531,
      view_count: 1293139,
      like_count: 71000,
      published_at: '2022-05-01T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: 'z6jd2JbZnvM',
      title: 'Laila | Stand-Up Comedy by Prashasti Singh',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/z6jd2JbZnvM/hqdefault.jpg',
      duration_seconds: 1602,
      view_count: 1320212,
      like_count: 85000,
      published_at: '2021-02-14T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: 'MyGcl5hpntQ',
      title: 'Train ka Suffer | Stand-Up Comedy by Prashasti Singh',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/MyGcl5hpntQ/hqdefault.jpg',
      duration_seconds: 1237,
      view_count: 2345782,
      like_count: 110000,
      published_at: '2020-03-08T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: 'aB6NE3XCDDs',
      title: 'Happy Diwali | Stand-Up Comedy by Prashasti Singh',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/aB6NE3XCDDs/hqdefault.jpg',
      duration_seconds: 1143,
      view_count: 1705097,
      like_count: 90000,
      published_at: '2019-10-27T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: 'Jcu2AcGx01Q',
      title: 'FAKE FEMINIST | StandUp Comedy by Prashasti Singh',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/Jcu2AcGx01Q/hqdefault.jpg',
      duration_seconds: 721,
      view_count: 3510120,
      like_count: 165000,
      published_at: '2019-03-08T12:00:00Z',
      suggested_rating: 'U/A 16+',
      content_type: 'standup_bit'
    },
    {
      video_id: '3bamJpyO_Zo',
      title: 'Heartbreaks | StandUp Comedy by Prashasti Singh',
      comedian_id: 482,
      thumbnail_url: 'https://i.ytimg.com/vi/3bamJpyO_Zo/hqdefault.jpg',
      duration_seconds: 474,
      view_count: 1596003,
      like_count: 80000,
      published_at: '2018-12-15T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    }
  ];

  for (const v of prashastiVideos) {
    db.run('DELETE FROM videos WHERE video_id = ?', [v.video_id]);
    db.run(`INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, like_count, published_at, suggested_rating, content_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.video_id, v.title, v.comedian_id, v.thumbnail_url, v.duration_seconds, v.view_count, v.like_count, v.published_at, v.suggested_rating, v.content_type]
    );
  }

  // 6. Insert Vaibhav Karn videos (comedian_id = 530)
  const vaibhavVideos = [
    {
      video_id: 'jrFzy1Zri0s',
      title: 'IIT Hostel | Stand Up Comedy by Vaibhav Karn',
      comedian_id: 530,
      thumbnail_url: 'https://i.ytimg.com/vi/jrFzy1Zri0s/hqdefault.jpg',
      duration_seconds: 983,
      view_count: 1162154,
      like_count: 62000,
      published_at: '2023-05-12T12:00:00Z',
      suggested_rating: '16+',
      content_type: 'standup_bit'
    },
    {
      video_id: 'tlu1A7xIVzU',
      title: 'Delhi Wale & Bhoot | Stand-Up Comedy by Vaibhav Karn',
      comedian_id: 530,
      thumbnail_url: 'https://i.ytimg.com/vi/tlu1A7xIVzU/hqdefault.jpg',
      duration_seconds: 764,
      view_count: 838623,
      like_count: 48000,
      published_at: '2023-02-18T12:00:00Z',
      suggested_rating: '16+',
      content_type: 'standup_bit'
    },
    {
      video_id: 'DtR8udDnwxw',
      title: 'House Party & Affairs | Stand-up Comedy by Vaibhav Karn',
      comedian_id: 530,
      thumbnail_url: 'https://i.ytimg.com/vi/DtR8udDnwxw/hqdefault.jpg',
      duration_seconds: 829,
      view_count: 119451,
      like_count: 12000,
      published_at: '2023-08-05T12:00:00Z',
      suggested_rating: '16+',
      content_type: 'standup_bit'
    },
    {
      video_id: 'i_NE9azl0qA',
      title: 'Dreams Vs Reality | Stand-Up Comedy by Vaibhav Karn',
      comedian_id: 530,
      thumbnail_url: 'https://i.ytimg.com/vi/i_NE9azl0qA/hqdefault.jpg',
      duration_seconds: 605,
      view_count: 175212,
      like_count: 15000,
      published_at: '2023-11-20T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: 'H-4yB_BraYI',
      title: 'Delhi Crime | Stand-Up Comedy by Vaibhav Karn',
      comedian_id: 530,
      thumbnail_url: 'https://i.ytimg.com/vi/H-4yB_BraYI/hqdefault.jpg',
      duration_seconds: 726,
      view_count: 469310,
      like_count: 32000,
      published_at: '2024-01-15T12:00:00Z',
      suggested_rating: '16+',
      content_type: 'standup_bit'
    },
    {
      video_id: '9pVQ6BxmdiE',
      title: 'Sports Day Trauma! | Stand-Up Comedy by Vaibhav Karn',
      comedian_id: 530,
      thumbnail_url: 'https://i.ytimg.com/vi/9pVQ6BxmdiE/hqdefault.jpg',
      duration_seconds: 929,
      view_count: 147890,
      like_count: 14000,
      published_at: '2024-03-22T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    },
    {
      video_id: 'nKSR3OoDZIU',
      title: 'Raid | Stand-Up Comedy by Vaibhav Karn',
      comedian_id: 530,
      thumbnail_url: 'https://i.ytimg.com/vi/nKSR3OoDZIU/hqdefault.jpg',
      duration_seconds: 601,
      view_count: 272430,
      like_count: 21000,
      published_at: '2024-06-10T12:00:00Z',
      suggested_rating: '16+',
      content_type: 'standup_bit'
    }
  ];

  for (const v of vaibhavVideos) {
    db.run('DELETE FROM videos WHERE video_id = ?', [v.video_id]);
    db.run(`INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, like_count, published_at, suggested_rating, content_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.video_id, v.title, v.comedian_id, v.thumbnail_url, v.duration_seconds, v.view_count, v.like_count, v.published_at, v.suggested_rating, v.content_type]
    );
  }

  // 7. Insert Trisha Pathak videos (comedian_id = 531)
  const trishaVideos = [
    {
      video_id: 'nY1Qj2yx6uA',
      title: 'Laundabaazi | Standup Comedy by Trisha Pathak',
      comedian_id: 531,
      thumbnail_url: 'https://i.ytimg.com/vi/nY1Qj2yx6uA/hqdefault.jpg',
      duration_seconds: 619,
      view_count: 4370963,
      like_count: 198000,
      published_at: '2023-09-15T12:00:00Z',
      suggested_rating: '16+',
      content_type: 'standup_bit'
    },
    {
      video_id: 'fPGu2jD1-bo',
      title: 'Single Child | Stand Up Comedy By Trisha Pathak',
      comedian_id: 531,
      thumbnail_url: 'https://i.ytimg.com/vi/fPGu2jD1-bo/hqdefault.jpg',
      duration_seconds: 586,
      view_count: 750432,
      like_count: 45000,
      published_at: '2024-02-10T12:00:00Z',
      suggested_rating: 'U/A',
      content_type: 'standup_bit'
    }
  ];

  for (const v of trishaVideos) {
    db.run('DELETE FROM videos WHERE video_id = ?', [v.video_id]);
    db.run(`INSERT INTO videos (video_id, title, comedian_id, thumbnail_url, duration_seconds, view_count, like_count, published_at, suggested_rating, content_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.video_id, v.title, v.comedian_id, v.thumbnail_url, v.duration_seconds, v.view_count, v.like_count, v.published_at, v.suggested_rating, v.content_type]
    );
  }

  // 8. Add tags for new videos
  const tagList = [
    { name: 'anecdotal-storytelling', type: 'style' },
    { name: 'observational-comedy', type: 'style' },
    { name: 'sarcastic-and-biting', type: 'tone' },
    { name: 'self-deprecating-humor', type: 'tone' },
    { name: 'nostalgic-and-warm', type: 'tone' },
    { name: 'family-and-upbringing', type: 'theme' },
    { name: 'cultural-commentary', type: 'theme' },
    { name: 'everyday-absurdities', type: 'theme' },
    { name: 'romantic-relationships', type: 'theme' }
  ];

  for (const t of tagList) {
    try {
      db.run('INSERT OR IGNORE INTO tags (tag_name, tag_type) VALUES (?, ?)', [t.name, t.type]);
    } catch(e) {}
  }

  const getTagId = (name) => {
    const r = db.exec('SELECT tag_id FROM tags WHERE tag_name = ?', [name]);
    return r[0]?.values[0]?.[0];
  };

  const linkTags = (videoIds, tagNames) => {
    for (const vid of videoIds) {
      for (const tn of tagNames) {
        const tid = getTagId(tn);
        if (tid) {
          try {
            db.run('INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)', [vid, tid]);
          } catch(e) {}
        }
      }
    }
  };

  linkTags(vaibhavVideos.map(v => v.video_id), ['observational-comedy', 'anecdotal-storytelling', 'nostalgic-and-warm', 'family-and-upbringing']);
  linkTags(trishaVideos.map(v => v.video_id), ['observational-comedy', 'anecdotal-storytelling', 'sarcastic-and-biting', 'family-and-upbringing']);
  linkTags(prashastiVideos.map(v => v.video_id), ['anecdotal-storytelling', 'observational-comedy', 'sarcastic-and-biting', 'romantic-relationships']);
  linkTags(swatiBits.map(v => v.video_id), ['observational-comedy', 'sarcastic-and-biting', 'romantic-relationships']);

  fs.writeFileSync(dbFile, Buffer.from(db.export()));
  console.log('✅ Migration complete and standup.db saved!');
}

migrate().catch(console.error);
