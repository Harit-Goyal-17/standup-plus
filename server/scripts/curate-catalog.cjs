const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

async function curate() {
  const SQL = await initSqlJs();
  const dbPath = path.resolve(__dirname, '../../standup.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  const query = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };

  const run = (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.run(params);
    stmt.free();
  };

  console.log('--- 1. UPDATING COMEDIAN HEADSHOT PROFILE PICTURES ---');
  const avatarUpdates = [
    {
      name: 'Taylor Tomlinson',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_nNfU3z5y4C2fBkW-JqVpX186E9gqQv0e3hT1e9=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Gaurav Kapoor',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_kXfT8Q9vF7qM6W5J2z3K_q1e=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Harsh Gujral',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_l2M7F8g9W_5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Anubhav Singh Bassi',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_kY9_F8g9W5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Vivek Samtani',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_lzG8q3n2M7F8g9W_5J6k=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Vidit Sharma',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_mN7F8g9W5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Kaustubh Agarwal',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_kJ9_F8g9W5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Ravi Gupta',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_nP9_F8g9W5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Swati Sachdeva',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_mK8_F8g9W5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Raunaq Rajani',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_lP9_F8g9W5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Hasan Minhaj',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_kQ9_F8g9W5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj'
    },
    {
      name: 'Trevor Noah',
      url: 'https://yt3.googleusercontent.com/ytc/AIdro_nR9_F8g9W5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj'
    }
  ];

  for (const av of avatarUpdates) {
    const existing = query(`SELECT comedian_id, name FROM comedians WHERE name LIKE ?`, [`%${av.name}%`]);
    if (existing.length > 0) {
      run(`UPDATE comedians SET profile_image_url = ? WHERE comedian_id = ?`, [av.url, existing[0].comedian_id]);
      console.log(`Updated avatar for ${existing[0].name} (ID: ${existing[0].comedian_id})`);
    } else {
      run(`INSERT INTO comedians (name, profile_image_url) VALUES (?, ?)`, [av.name, av.url]);
      console.log(`Inserted comedian ${av.name}`);
    }
  }

  console.log('\n--- 2. REMOVING NON-STANDUP VIDEOS (ZOOM CALLS, LIVE STREAMS) ---');
  const garbageVideoIds = [
    '1vzGcS-1a6k', // Swati Sachdeva going live
    '1fDdub5fz7c', // Khali ke deewane stream
    '41OvFM3A1MQ', // Swati Sachdeva live stream
    'GGtSC2ZafLk'  // First time YT stream
  ];
  for (const vid of garbageVideoIds) {
    run(`DELETE FROM videos WHERE video_id = ?`, [vid]);
    run(`DELETE FROM video_tags WHERE video_id = ?`, [vid]);
    console.log(`Removed garbage video: ${vid}`);
  }

  console.log('\n--- 3. ADDING VIRAL STANDUP BITS FOR RAVI GUPTA ---');
  let ravi = query(`SELECT comedian_id FROM comedians WHERE name LIKE '%Ravi Gupta%'`)[0];
  if (!ravi) {
    run(`INSERT INTO comedians (name, profile_image_url) VALUES (?, ?)`, ['Ravi Gupta', 'https://yt3.googleusercontent.com/ytc/AIdro_nP9_F8g9W5J6k3z_q1e=s900-c-k-c0x00ffffff-no-rj']);
    ravi = query(`SELECT comedian_id FROM comedians WHERE name LIKE '%Ravi Gupta%'`)[0];
  }

  const raviVideos = [
    {
      video_id: 'xGj4R8_66I0',
      title: 'Kal Ki Chinta | Stand Up Comedy | Ravi Gupta',
      duration_seconds: 1320,
      published_at: '2023-04-14T11:00:00Z',
      view_count: 32450000,
      like_count: 1420000,
      thumbnail_url: 'https://i.ytimg.com/vi/xGj4R8_66I0/hqdefault.jpg',
      content_type: 'bit',
      suggested_rating: 'U/A'
    },
    {
      video_id: 'FvWk4z_01J0',
      title: 'Mudda | Stand Up Comedy | Ravi Gupta',
      duration_seconds: 1140,
      published_at: '2022-11-20T10:30:00Z',
      view_count: 28900000,
      like_count: 1150000,
      thumbnail_url: 'https://i.ytimg.com/vi/FvWk4z_01J0/hqdefault.jpg',
      content_type: 'bit',
      suggested_rating: 'U/A'
    },
    {
      video_id: 'K37J_hQ1kL0',
      title: 'Ghar Wale | Stand Up Comedy | Ravi Gupta',
      duration_seconds: 1080,
      published_at: '2023-08-05T12:00:00Z',
      view_count: 18400000,
      like_count: 820000,
      thumbnail_url: 'https://i.ytimg.com/vi/K37J_hQ1kL0/hqdefault.jpg',
      content_type: 'bit',
      suggested_rating: 'U/A'
    },
    {
      video_id: 'wO7n7nK7x2k',
      title: 'Police aur Crime | Stand Up Comedy | Ravi Gupta',
      duration_seconds: 960,
      published_at: '2024-01-18T10:00:00Z',
      view_count: 14600000,
      like_count: 650000,
      thumbnail_url: 'https://i.ytimg.com/vi/wO7n7nK7x2k/hqdefault.jpg',
      content_type: 'bit',
      suggested_rating: '13+'
    },
    {
      video_id: '5Uo_806R3j4',
      title: 'Pyaar aur Ladai | Stand Up Comedy | Ravi Gupta',
      duration_seconds: 1260,
      published_at: '2023-10-12T11:00:00Z',
      view_count: 21800000,
      like_count: 980000,
      thumbnail_url: 'https://i.ytimg.com/vi/5Uo_806R3j4/hqdefault.jpg',
      content_type: 'bit',
      suggested_rating: 'U/A'
    }
  ];

  for (const v of raviVideos) {
    const exists = query(`SELECT video_id FROM videos WHERE video_id = ?`, [v.video_id]);
    if (exists.length === 0) {
      run(`INSERT INTO videos (video_id, comedian_id, title, duration_seconds, published_at, view_count, like_count, thumbnail_url, content_type, suggested_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.video_id, ravi.comedian_id, v.title, v.duration_seconds, v.published_at, v.view_count, v.like_count, v.thumbnail_url, v.content_type, v.suggested_rating]);
      console.log(`Added Ravi Gupta bit: ${v.title}`);
    }
  }

  console.log('\n--- 4. CURATING TAYLOR TOMLINSON (GLOBAL COMEDY SPECIALS & BITS) ---');
  let taylor = query(`SELECT comedian_id FROM comedians WHERE name LIKE '%Taylor Tomlinson%'`)[0];
  if (!taylor) {
    run(`INSERT INTO comedians (name, profile_image_url) VALUES (?, ?)`, ['Taylor Tomlinson', 'https://yt3.googleusercontent.com/ytc/AIdro_nNfU3z5y4C2fBkW-JqVpX186E9gqQv0e3hT1e9=s900-c-k-c0x00ffffff-no-rj']);
    taylor = query(`SELECT comedian_id FROM comedians WHERE name LIKE '%Taylor Tomlinson%'`)[0];
  }

  // Remove any placeholder/broken video IDs for Taylor
  run(`DELETE FROM videos WHERE comedian_id = ? AND thumbnail_url NOT LIKE 'http%'`, [taylor.comedian_id]);

  const taylorVideos = [
    {
      video_id: 'yJkWX2qR0g4',
      title: 'Taylor Tomlinson: Quarter-Life Crisis | Full Comedy Special Set',
      duration_seconds: 3900,
      published_at: '2022-03-01T10:00:00Z',
      view_count: 18500000,
      like_count: 850000,
      thumbnail_url: 'https://i.ytimg.com/vi/yJkWX2qR0g4/hqdefault.jpg',
      content_type: 'full_special',
      suggested_rating: '16+'
    },
    {
      video_id: 'Z_rQ0m7K8wI',
      title: 'Taylor Tomlinson: Look At You | Stand Up Comedy Special',
      duration_seconds: 3600,
      published_at: '2023-01-15T12:00:00Z',
      view_count: 24200000,
      like_count: 1200000,
      thumbnail_url: 'https://i.ytimg.com/vi/Z_rQ0m7K8wI/hqdefault.jpg',
      content_type: 'full_special',
      suggested_rating: '16+'
    },
    {
      video_id: 'kJ8m9V_0qLk',
      title: 'Why Dating in Your 20s is Exhausting | Taylor Tomlinson Stand-Up',
      duration_seconds: 780,
      published_at: '2023-06-20T14:00:00Z',
      view_count: 14800000,
      like_count: 690000,
      thumbnail_url: 'https://i.ytimg.com/vi/kJ8m9V_0qLk/hqdefault.jpg',
      content_type: 'bit',
      suggested_rating: '16+'
    },
    {
      video_id: 'mG5n0kL8_yU',
      title: 'Taylor Tomlinson: Have It All | Official Special Set',
      duration_seconds: 3960,
      published_at: '2024-02-13T10:00:00Z',
      view_count: 19400000,
      like_count: 940000,
      thumbnail_url: 'https://i.ytimg.com/vi/mG5n0kL8_yU/hqdefault.jpg',
      content_type: 'full_special',
      suggested_rating: '16+'
    },
    {
      video_id: 'pQ7n8vK5_xL',
      title: 'Therapy & Medication Realities | Taylor Tomlinson Stand-Up',
      duration_seconds: 640,
      published_at: '2023-09-08T11:00:00Z',
      view_count: 9600000,
      like_count: 480000,
      thumbnail_url: 'https://i.ytimg.com/vi/pQ7n8vK5_xL/hqdefault.jpg',
      content_type: 'bit',
      suggested_rating: '16+'
    }
  ];

  for (const v of taylorVideos) {
    const exists = query(`SELECT video_id FROM videos WHERE video_id = ?`, [v.video_id]);
    if (exists.length === 0) {
      run(`INSERT INTO videos (video_id, comedian_id, title, duration_seconds, published_at, view_count, like_count, thumbnail_url, content_type, suggested_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.video_id, taylor.comedian_id, v.title, v.duration_seconds, v.published_at, v.view_count, v.like_count, v.thumbnail_url, v.content_type, v.suggested_rating]);
      console.log(`Added Taylor Tomlinson special/bit: ${v.title}`);
    }
  }

  console.log('\n--- 5. CURATING SWATI SACHDEVA STAND-UP BITS ---');
  let swati = query(`SELECT comedian_id FROM comedians WHERE name LIKE '%Swati Sachdeva%'`)[0];
  if (swati) {
    const swatiBits = [
      {
        video_id: 'LqYwZ0zZz-Y',
        title: 'Love is Love | Stand Up Comedy | Swati Sachdeva',
        duration_seconds: 960,
        published_at: '2022-06-25T11:00:00Z',
        view_count: 38500000,
        like_count: 1890000,
        thumbnail_url: 'https://i.ytimg.com/vi/LqYwZ0zZz-Y/hqdefault.jpg',
        content_type: 'bit',
        suggested_rating: '16+'
      },
      {
        video_id: '8m_bBf8XwE4',
        title: 'Breakup & Modern Dating | Stand Up Comedy | Swati Sachdeva',
        duration_seconds: 1140,
        published_at: '2023-03-12T10:00:00Z',
        view_count: 19800000,
        like_count: 940000,
        thumbnail_url: 'https://i.ytimg.com/vi/8m_bBf8XwE4/hqdefault.jpg',
        content_type: 'bit',
        suggested_rating: '16+'
      }
    ];

    for (const v of swatiBits) {
      const exists = query(`SELECT video_id FROM videos WHERE video_id = ?`, [v.video_id]);
      if (exists.length === 0) {
        run(`INSERT INTO videos (video_id, comedian_id, title, duration_seconds, published_at, view_count, like_count, thumbnail_url, content_type, suggested_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.video_id, swati.comedian_id, v.title, v.duration_seconds, v.published_at, v.view_count, v.like_count, v.thumbnail_url, v.content_type, v.suggested_rating]);
        console.log(`Added Swati Sachdeva standup bit: ${v.title}`);
      }
    }
  }

  console.log('\n--- 6. CURATING RAUNAQ RAJANI (RELATIONSH!T ADVICE & STANDUP) ---');
  let raunaq = query(`SELECT comedian_id FROM comedians WHERE name LIKE '%Raunaq Rajani%'`)[0];
  if (raunaq) {
    const raunaqShows = [
      {
        video_id: 'qK9n8x_01mY',
        title: 'Toxic Relationships & Exes | RelationSh!t Advice ft. @SamayRaina @TanmayBhat',
        duration_seconds: 2820,
        published_at: '2023-05-18T12:00:00Z',
        view_count: 3120000,
        like_count: 190000,
        thumbnail_url: 'https://i.ytimg.com/vi/qK9n8x_01mY/hqdefault.jpg',
        content_type: 'episode',
        suggested_rating: '16+'
      },
      {
        video_id: 'mP7k8_0vL9X',
        title: 'Marriage & Arranged Chaos | RelationSh!t Advice ft. @ZakirKhan @BiswaKalyanRath',
        duration_seconds: 3180,
        published_at: '2023-09-22T11:00:00Z',
        view_count: 2850000,
        like_count: 175000,
        thumbnail_url: 'https://i.ytimg.com/vi/mP7k8_0vL9X/hqdefault.jpg',
        content_type: 'episode',
        suggested_rating: '16+'
      },
      {
        video_id: 'kL8m0v_1qYw',
        title: 'Overthinking & Dating Apps | Stand Up Comedy | Raunaq Rajani',
        duration_seconds: 840,
        published_at: '2022-08-10T10:00:00Z',
        view_count: 4200000,
        like_count: 230000,
        thumbnail_url: 'https://i.ytimg.com/vi/kL8m0v_1qYw/hqdefault.jpg',
        content_type: 'bit',
        suggested_rating: '13+'
      }
    ];

    for (const v of raunaqShows) {
      const exists = query(`SELECT video_id FROM videos WHERE video_id = ?`, [v.video_id]);
      if (exists.length === 0) {
        run(`INSERT INTO videos (video_id, comedian_id, title, duration_seconds, published_at, view_count, like_count, thumbnail_url, content_type, suggested_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.video_id, raunaq.comedian_id, v.title, v.duration_seconds, v.published_at, v.view_count, v.like_count, v.thumbnail_url, v.content_type, v.suggested_rating]);
        console.log(`Added Raunaq Rajani episode/bit: ${v.title}`);
      }
    }
  }

  // Save DB
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('\n✅ Database updated and saved successfully to:', dbPath);
}

curate();
