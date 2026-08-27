export const SHOWS_CONFIG = [
  {
    id: 'lie-hard',
    title: 'Lie Hard',
    host: 'Gaurav Kapoor',
    tagline: 'Spot the lie or face the roast',
    description: 'Comedians share wild personal stories, unbelievable confessions, and hilarious childhood memories—with one catch: some are complete lies. Guess who is telling the truth and who is lying through their teeth!',
    match: ['lie hard'],
    category: 'Game & Panel Show',
    badge: 'Trending Series',
    rating: '16+'
  },
  {
    id: 'pitch-please',
    title: 'Pitch Please',
    host: 'Rahul Dua',
    tagline: 'Comedians roast wild startup ideas and hilarious pitches',
    description: 'Rahul Dua brings together top stand-up comedians and real-world startup founders for hilarious, chaotic, and unhinged business pitches, startup roasts, and wild entrepreneurship banter.',
    match: ['pitch please'],
    category: 'Startup & Comedy Show',
    badge: 'Trending Series',
    rating: '16+'
  },
  {
    id: 'judge-me-if-you-can',
    title: 'Judge Me If You Can',
    host: 'Aashish Solanki',
    tagline: 'The comedy mock-court putting comics on trial',
    description: 'Aashish Solanki presides over India’s most chaotic courtroom where top stand-up comedians defend their most embarrassing life choices, strange habits, and awkward controversies.',
    match: ['judge me'],
    category: 'Courtroom & Roast',
    badge: 'Fan Favorite',
    rating: '16+'
  },
  {
    id: 'pretty-good-roast',
    title: 'Pretty Good Roast Show',
    host: 'Aashish Solanki',
    tagline: 'Brutal, unfiltered roasts of celebrities and comics',
    description: 'A ruthless roast battle stage where India’s top comics gather to deliver no-holds-barred roasts to celebrity guests, influencers, and each other.',
    match: ['pretty good roast', 'brocode roast'],
    category: 'Roast Battle',
    badge: 'Must Watch',
    rating: '18+'
  },
  {
    id: 'madhur-model',
    title: 'Madhur Model',
    host: 'Madhur Virli',
    tagline: 'Raw, edgy, and unhinged comedy open-mic turned showcase',
    description: 'Madhur Virli hosts an unapologetically raw and dark showcase featuring hilarious newer comics, surprise guest spots, and savage audience banter.',
    match: ['madhur model'],
    category: 'Dark & Raw',
    badge: '18+ Explicit',
    rating: '18+'
  },
  {
    id: 'akal-ke-ghode',
    title: 'Akal Ke Ghode',
    host: 'Kaustubh Agarwal',
    tagline: 'High-energy comedy games where wits are tested',
    description: 'Kaustubh Agarwal gathers squads of quick-witted comedians for hilarious improv games, situational questions, and spontaneous comedy chaos.',
    match: ['akal ke ghode', 'akal ke'],
    category: 'Improv & Games',
    badge: 'Binge Worthy',
    rating: '16+'
  },
  {
    id: 'nation-wants-to-guess',
    title: 'The Nation Wants To Guess',
    host: 'Gursimran Khamba',
    tagline: 'India’s funniest current affairs and news quiz show',
    description: 'Gursimran Khamba challenges comedy’s sharpest minds to guess the bizarre reality behind the craziest real news headlines from India and around the world.',
    match: ['nation wants to guess', 'nation wants to'],
    category: 'News & Quiz',
    badge: 'Classic Series',
    rating: '13+'
  },
  {
    id: 'farzi-mushaira',
    title: 'Farzi Mushaira',
    host: 'Zakir Khan',
    tagline: 'Heartbreak, tragic romance, and savage poetry with Zakir',
    description: 'Zakir Khan and his closest comedian buddies sit together in a poetic gathering, sharing hilarious shayaris, heartbreak stories, and mutual roasts.',
    match: ['farzi mushaira'],
    category: 'Poetry & Roast',
    badge: 'Top Rated',
    rating: '13+'
  },
  {
    id: 'indias-got-latent',
    title: "India's Got Latent",
    host: 'Samay Raina',
    tagline: 'The internet’s most viral talent & roast sensation',
    description: 'Samay Raina and a stellar jury of comedians and celebrity guests rate unpredictable contestants, bizarre hidden talents, and deliver relentless comedy roasts.',
    match: ['got latent', 'latent'],
    category: 'Talent & Roast',
    badge: 'Viral Sensation',
    rating: '18+'
  },
  {
    id: 'joke-funeral',
    title: 'Joke Funeral',
    host: 'Sapan Verma',
    tagline: 'Giving dead and bombed jokes a hilarious final burial',
    description: 'Comedians bring their most bombed, rejected, or retired jokes to give them one final eulogy and a roast before putting them to rest forever.',
    match: ['joke funeral'],
    category: 'Roast Show',
    badge: 'Critically Acclaimed',
    rating: '16+'
  },
  {
    id: 'who-let-the-drunks-out',
    title: 'Who Let The Drunks Out',
    host: 'Swati Sachdeva',
    tagline: 'Drunk comedy games, confessionals, and total chaos',
    description: 'Swati Sachdeva invites fellow comedians to drink, play absurd party games, and share unfiltered drunken stories on stage.',
    match: ['who let the drunks out'],
    category: 'Party Games',
    badge: '18+ Party',
    rating: '18+'
  },
  {
    id: 'relationshit-advice',
    title: 'RelationSh!t Advice',
    host: 'Raunaq Rajani',
    tagline: 'Solving romantic disasters with terrible, hilarious advice',
    description: 'Raunaq Rajani invites audience members to submit their real-life dating disasters while a panel of comics dishes out questionable but hilarious advice.',
    match: ['relationsh!t advice', 'relationsh!t', 'relationshit advice', 'relationshit', 'relationsh'],
    category: 'Dating & Advice',
    badge: 'Relationship Comedy',
    rating: '16+'
  },
  {
    id: 'chaar-yaar',
    title: 'Chaar Yaar',
    host: 'Amit Tandon',
    tagline: 'Four veteran comedians discussing life, marriage, and standup',
    description: 'Amit Tandon hosts four seasoned stand-up veterans reminiscing about old-school comedy, family life, marriage absurdities, and behind-the-scenes stories.',
    match: ['chaar yaar'],
    category: 'Talk & Nostalgia',
    badge: 'Wholesome',
    rating: 'U/A'
  }
];

function getSeasonInfo(showId, title) {
  const lower = title.toLowerCase();
  
  if (showId === 'lie-hard') {
    if (lower.includes('s3') || lower.includes('season 3')) return { season_number: 3, season_name: 'Season 3' };
    if (lower.includes('s2') || lower.includes('season 2')) return { season_number: 2, season_name: 'Season 2' };
    return { season_number: 1, season_name: 'Season 1' };
  }

  if (showId === 'pretty-good-roast') {
    if (lower.includes('brocode') || lower.includes('s2') || lower.includes('season 2')) {
      return { season_number: 2, season_name: 'Season 2: BroCode Roast' };
    }
    return { season_number: 1, season_name: 'Season 1: Pretty Good Roast' };
  }

  if (showId === 'indias-got-latent') {
    if (lower.includes('s2') || lower.includes('season 2')) return { season_number: 2, season_name: 'Season 2' };
    return { season_number: 1, season_name: 'Season 1' };
  }

  if (showId === 'farzi-mushaira') {
    const epMatch = title.match(/episode\s*(\d+)/i) || title.match(/ep\s*(\d+)/i);
    if (epMatch && parseInt(epMatch[1]) > 15) {
      return { season_number: 2, season_name: 'Season 2 (Ep 16-30)' };
    }
    return { season_number: 1, season_name: 'Season 1 (Ep 1-15)' };
  }

  const sMatch = lower.match(/s(\d+)/) || lower.match(/season\s*(\d+)/);
  if (sMatch) {
    const sNum = parseInt(sMatch[1]);
    if (sNum >= 1 && sNum <= 10) return { season_number: sNum, season_name: `Season ${sNum}` };
  }

  return { season_number: 1, season_name: 'Season 1' };
}

export function getShowsList(dbAll) {
  const allVideos = dbAll(`
    SELECT v.video_id, v.title, v.duration_seconds, v.view_count, v.like_count, 
           v.thumbnail_url, v.published_at, v.suggested_rating,
           c.comedian_id, c.name as comedian_name, c.profile_image_url as host_avatar
    FROM videos v
    JOIN comedians c ON v.comedian_id = c.comedian_id
  `);

  return SHOWS_CONFIG.map(show => {
    const episodes = allVideos
      .filter(v => show.match.some(m => v.title.toLowerCase().includes(m)))
      .sort((a, b) => new Date(a.published_at) - new Date(b.published_at));

    if (episodes.length === 0) return null;

    const totalViews = episodes.reduce((acc, ep) => acc + (ep.view_count || 0), 0);
    const hostComedian = episodes.find(e => e.comedian_name.toLowerCase().includes(show.host.toLowerCase().split(' ')[0])) || episodes[0];
    const topEp = [...episodes].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0];

    // Detect seasons
    const seasonsMap = {};
    episodes.forEach(ep => {
      const sInfo = getSeasonInfo(show.id, ep.title);
      if (!seasonsMap[sInfo.season_number]) {
        seasonsMap[sInfo.season_number] = {
          season_number: sInfo.season_number,
          season_name: sInfo.season_name,
          episode_count: 0
        };
      }
      seasonsMap[sInfo.season_number].episode_count++;
    });

    const seasons = Object.values(seasonsMap).sort((a, b) => a.season_number - b.season_number);

    return {
      id: show.id,
      title: show.title,
      host: show.host,
      host_avatar: hostComedian?.host_avatar || null,
      tagline: show.tagline,
      description: show.description,
      category: show.category,
      badge: show.badge,
      rating: show.rating,
      thumbnail_url: topEp?.thumbnail_url || episodes[0]?.thumbnail_url,
      episode_count: episodes.length,
      seasons_count: seasons.length,
      seasons: seasons,
      total_views: totalViews,
      latest_published_at: episodes[episodes.length - 1]?.published_at,
      sample_episodes: episodes.slice(0, 3)
    };
  }).filter(Boolean);
}

export function getShowDetails(showId, dbAll) {
  const show = SHOWS_CONFIG.find(s => s.id === showId);
  if (!show) return null;

  const allVideos = dbAll(`
    SELECT v.video_id, v.title, v.duration_seconds, v.view_count, v.like_count, 
           v.thumbnail_url, v.published_at, v.suggested_rating,
           c.comedian_id, c.name as comedian_name, c.profile_image_url as host_avatar
    FROM videos v
    JOIN comedians c ON v.comedian_id = c.comedian_id
  `);

  const rawEpisodes = allVideos
    .filter(v => show.match.some(m => v.title.toLowerCase().includes(m)))
    .sort((a, b) => new Date(a.published_at) - new Date(b.published_at));

  if (rawEpisodes.length === 0) return null;

  const seasonsMap = {};
  const seasonCounters = {};

  const episodes = rawEpisodes.map((ep) => {
    const sInfo = getSeasonInfo(show.id, ep.title);
    const sNum = sInfo.season_number;
    
    if (!seasonsMap[sNum]) {
      seasonsMap[sNum] = {
        season_number: sNum,
        season_name: sInfo.season_name,
        episode_count: 0
      };
      seasonCounters[sNum] = 0;
    }

    seasonCounters[sNum]++;
    seasonsMap[sNum].episode_count++;

    return {
      ...ep,
      season_number: sNum,
      season_name: sInfo.season_name,
      episode_number: seasonCounters[sNum]
    };
  });

  const seasons = Object.values(seasonsMap).sort((a, b) => a.season_number - b.season_number);
  const totalViews = episodes.reduce((acc, ep) => acc + (ep.view_count || 0), 0);
  const hostComedian = episodes.find(e => e.comedian_name.toLowerCase().includes(show.host.toLowerCase().split(' ')[0])) || episodes[0];
  const topEp = [...episodes].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))[0];

  return {
    id: show.id,
    title: show.title,
    host: show.host,
    host_avatar: hostComedian?.host_avatar || null,
    tagline: show.tagline,
    description: show.description,
    category: show.category,
    badge: show.badge,
    rating: show.rating,
    thumbnail_url: topEp?.thumbnail_url || episodes[0]?.thumbnail_url,
    episode_count: episodes.length,
    seasons_count: seasons.length,
    seasons: seasons,
    total_views: totalViews,
    episodes: episodes
  };
}
