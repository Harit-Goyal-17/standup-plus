export function formatDuration(seconds) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatViews(count) {
  if (!count) return '0';
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getRatingColor(rating) {
  const map = {
    'U/A': 'var(--rating-ua)',
    '13+': 'var(--rating-13)',
    '16+': 'var(--rating-16)',
    '18+': 'var(--rating-18)',
  };
  return map[rating] || 'var(--rating-ua)';
}

export function getTagColor(tagType) {
  const map = {
    'style': 'tag-style',
    'tone': 'tag-tone',
    'theme': 'tag-theme'
  };
  return map[tagType] || 'tag-style';
}

export function formatTagLabel(tag) {
  if (!tag) return '';
  const map = {
    'observational-comedy': 'Observational',
    'crowd-work-heavy': 'Crowd Work & Banter',
    'anecdotal-storytelling': 'Stories & Experiences',
    'deadpan-delivery': 'Deadpan Humor',
    'rapid-fire-one-liners': 'Quick One-Liners',
    'musical-standup': 'Musical Comedy',
    'physical-and-energetic': 'High Energy & Physical',
    'dark-and-cynical': 'Dark Comedy',
    'sarcastic-and-biting': 'Sarcastic & Witty',
    'nostalgic-and-warm': 'Nostalgia & School Days',
    'wholesome-and-lighthearted': 'Clean & Wholesome',
    'absurdist-and-surreal': 'Absurd & Goofy',
    'self-deprecating-humor': 'Self-Deprecating',
    'raunchy-and-explicit': 'Uncensored (18+)',
    'family-and-upbringing': 'Family & Parents',
    'romantic-relationships': 'Dating & Marriage',
    'corporate-and-work-life': 'Office & Corporate Jobs',
    'cultural-commentary': 'Cities & Culture',
    'political-satire': 'Satire & Society',
    'everyday-absurdities': 'Everyday Life',
    'travel-and-experiences': 'Travel & Trips',
    'mental-health-and-struggles': 'Life Struggles'
  };
  if (map[tag]) return map[tag];
  return tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function cleanHandle(handle) {
  if (!handle) return '';
  let name = handle.replace(/^[@\s]+/, '').replace(/standup|comedy|official|unofficial|vlogs|tv|live|_/gi, ' ').trim();
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return name.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function getCastMembers(video) {
  if (!video) return [];
  const cast = [];
  if (video.comedian_name) {
    cast.push(video.comedian_name);
  }

  const title = video.title || '';
  const ftMatch = title.match(/(?:ft\.?|feat\.?|with|featuring)\s+(.*)/i);
  if (ftMatch && ftMatch[1]) {
    const rawGuests = ftMatch[1];
    const guestTokens = rawGuests.split(/[,&+]|\band\b|@/i);
    guestTokens.forEach(t => {
      const cleaned = cleanHandle(t);
      if (cleaned && cleaned.length > 2 && !cast.includes(cleaned) && !/^\d+$/.test(cleaned)) {
        cast.push(cleaned);
      }
    });
  }
  return cast.slice(0, 8);
}

export function getVideoGenres(video) {
  if (!video) return ['Stand-Up Comedy', 'Hindi Comedy'];
  const genres = new Set(['Stand-Up Comedy']);
  
  const title = (video.title || '').toLowerCase();
  const tags = video.tags || [];

  if (video.duration_seconds >= 2700) {
    genres.add('Comedy Specials');
  } else if (video.duration_seconds < 900) {
    genres.add('Stand-Up Bits');
  }

  if (title.includes('roast') || title.includes('brocode')) {
    genres.add('Roast Battles');
  }
  if (title.includes('crowd work') || title.includes('audience interaction') || title.includes('crowd')) {
    genres.add('Crowd Work & Improv');
  }
  if (title.includes('pitch please') || title.includes('game show') || title.includes('akal ke ghode') || title.includes('lie hard') || title.includes('judge me') || title.includes('drunks')) {
    genres.add('Comedy Game Shows');
  }
  if (title.includes('podcast') || title.includes('talk') || title.includes('chaar yaar') || title.includes('charcha')) {
    genres.add('Comedy Talk Shows');
  }

  tags.forEach(t => {
    if (t.tag_type === 'theme') {
      if (t.tag_name.includes('relationship')) genres.add('Romantic Comedy');
      else if (t.tag_name.includes('corporate') || t.tag_name.includes('work')) genres.add('Workplace Comedy');
      else if (t.tag_name.includes('family')) genres.add('Family & Upbringing');
      else if (t.tag_name.includes('cultural') || t.tag_name.includes('political')) genres.add('Social Satire');
      else {
        const formatted = t.tag_name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        genres.add(formatted);
      }
    }
  });

  genres.add('Hindi Comedy');
  return Array.from(genres).slice(0, 6);
}

export function getVideoMoods(video) {
  if (!video) return ['Witty', 'Relatable'];
  const moods = new Set();
  const title = (video.title || '').toLowerCase();
  const tags = video.tags || [];

  tags.forEach(t => {
    if (t.tag_type === 'tone' || t.tag_type === 'style') {
      const name = t.tag_name.toLowerCase();
      if (name.includes('dark')) { moods.add('Dark'); moods.add('Cynical'); }
      else if (name.includes('sarcastic') || name.includes('biting')) { moods.add('Sarcastic'); moods.add('Biting'); }
      else if (name.includes('wholesome') || name.includes('warm')) { moods.add('Wholesome'); moods.add('Feel-Good'); }
      else if (name.includes('absurdist') || name.includes('surreal')) { moods.add('Absurd'); moods.add('Offbeat'); }
      else if (name.includes('deadpan')) { moods.add('Deadpan'); moods.add('Understated'); }
      else if (name.includes('crowd-work')) { moods.add('Spontaneous'); moods.add('Interactive'); }
      else if (name.includes('storytelling')) { moods.add('Storytelling'); moods.add('Nostalgic'); }
      else if (name.includes('energetic')) { moods.add('High-Energy'); moods.add('Lively'); }
    }
  });

  if (title.includes('roast') || video.suggested_rating === '18+') {
    moods.add('Unfiltered');
    moods.add('Savage');
  }

  if (moods.size === 0) {
    moods.add('Witty');
    moods.add('Hilarious');
    moods.add('Relatable');
  }

  return Array.from(moods).slice(0, 4);
}

export function getMaturityInfo(rating) {
  const r = (rating || 'U/A').toUpperCase();
  if (r.includes('18')) {
    return {
      badge: '18+',
      advisories: 'strong language, mature roast humor, adult themes',
      warning: 'Content recommended for viewers 18 and older'
    };
  }
  if (r.includes('16')) {
    return {
      badge: '16+',
      advisories: 'mature humor, coarse language, edgy observational sets',
      warning: 'Suitable for viewers 16 years and older'
    };
  }
  if (r.includes('13')) {
    return {
      badge: '13+',
      advisories: 'moderate language, youth & college humor',
      warning: 'Parental guidance suggested for viewers under 13'
    };
  }
  return {
    badge: 'U/A',
    advisories: 'family-friendly comedy, clean observational humor, everyday relatable sets',
    warning: 'Suitable for all audiences'
  };
}

export function getDotSeparatedTopics(video) {
  if (!video) return ['Stand-Up', 'Relatable', 'Hindi Comedy'];
  const topics = [];
  
  const title = (video.title || '').toLowerCase();
  if (title.includes('upsc') || title.includes('college') || title.includes('hostel')) topics.push('College Life');
  else if (title.includes('cheating') || title.includes('school')) topics.push('School Days');
  else if (title.includes('latent') || title.includes('game') || title.includes('pitch')) topics.push('Panel Show');
  else if (title.includes('roast') || title.includes('brocode')) topics.push('Roast Battle');
  else if (title.includes('relationship') || title.includes('dating') || title.includes('marriage')) topics.push('Relationships');

  const tags = video.tags || [];
  tags.forEach(t => {
    if (topics.length < 3) {
      const name = t.tag_name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!topics.includes(name)) topics.push(name);
    }
  });

  const moods = getVideoMoods(video);
  moods.forEach(m => {
    if (topics.length < 3 && !topics.includes(m)) topics.push(m);
  });

  if (topics.length === 0) {
    topics.push('Stand-Up Special', 'Relatable Humor', 'Hindi');
  }

  return topics.slice(0, 3);
}

// 1. Top Comedian Avatars (Illustrated & Photographic)
export const COMEDIAN_AVATARS = [
  { id: 'zakir', name: 'Zakir Khan', category: 'comedians', url: '/images/comedians/zakir_khan.jpg' },
  { id: 'samay', name: 'Samay Raina', category: 'comedians', url: '/images/comedians/samay_raina.jpg' },
  { id: 'bassi', name: 'Anubhav Singh Bassi', category: 'comedians', url: '/images/comedians/anubhav_singh_bassi.jpg' },
  { id: 'upmanyu', name: 'Abhishek Upmanyu', category: 'comedians', url: '/images/comedians/abhishek_upmanyu.jpg' },
  { id: 'aakash', name: 'Aakash Gupta', category: 'comedians', url: '/images/comedians/aakash_gupta.jpg' },
  { id: 'gaurav', name: 'Gaurav Kapoor', category: 'comedians', url: '/images/comedians/gaurav_kapoor.jpg' },
  { id: 'munawar', name: 'Munawar Faruqui', category: 'comedians', url: '/images/comedians/munawar_faruqui.jpg' },
  { id: 'rahul-sub', name: 'Rahul Subramanian', category: 'comedians', url: '/images/comedians/rahul_subramanian.jpg' },
  { id: 'prashasti', name: 'Prashasti Singh', category: 'comedians', url: '/images/comedians/prashasti_singh.jpg' },
  { id: 'biswa', name: 'Biswa Kalyan Rath', category: 'comedians', url: '/images/comedians/biswa_kalyan_rath.jpg' },
  { id: 'kenny', name: 'Kenny Sebastian', category: 'comedians', url: '/images/comedians/kenny_sebastian.jpg' },
  { id: 'kanan', name: 'Kanan Gill', category: 'comedians', url: '/images/comedians/kanan_gill.jpg' },
  { id: 'swati', name: 'Swati Sachdeva', category: 'comedians', url: '/images/comedians/swati_sachdeva.jpg' },
  { id: 'kunal', name: 'Kunal Kamra', category: 'comedians', url: '/images/comedians/kunal_kamra.jpg' },
  { id: 'harsh', name: 'Harsh Gujral', category: 'comedians', url: '/images/comedians/harsh_gujral.jpg' },
  { id: 'gurleen', name: 'Gurleen Pannu', category: 'comedians', url: '/images/comedians/gurleen_pannu.jpg' },
  { id: 'shashi', name: 'Shashi Dhiman', category: 'comedians', url: '/images/comedians/shashi_dhiman.jpg' },
  { id: 'amit', name: 'Amit Tandon', category: 'comedians', url: '/images/comedians/amit_tandon.jpg' },
  { id: 'jaspreet', name: 'Jaspreet Singh', category: 'comedians', url: '/images/comedians/jaspreet_singh.jpg' }
];

// 2. Shows & Series Avatars
export const SHOW_AVATARS = [
  { id: 'lie-hard', name: 'Lie Hard', category: 'shows', url: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=200&auto=format&fit=crop&q=80' },
  { id: 'relationshit', name: 'RelationSh!t', category: 'shows', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80' },
  { id: 'latent', name: 'Got Latent', category: 'shows', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { id: 'akal-ghode', name: 'Akal Ke Ghode', category: 'shows', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { id: 'roast', name: 'Pretty Good Roast', category: 'shows', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { id: 'pitch-please', name: 'Pitch Please', category: 'shows', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80' }
];

// 3. Classic Netflix-style Illustrated Avatars (Dicebear Bots & Avatars)
export const CLASSIC_AVATARS = [
  { id: 'red-bot', name: 'StandUp+ Red', category: 'classics', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=red-bot&backgroundColor=e50914' },
  { id: 'blue-bot', name: 'Cyber Blue', category: 'classics', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=blue-bot&backgroundColor=3b82f6' },
  { id: 'yellow-bot', name: 'Gold Spark', category: 'classics', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=yellow-bot&backgroundColor=f59e0b' },
  { id: 'purple-bot', name: 'Neon Purple', category: 'classics', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=purple-bot&backgroundColor=8b5cf6' },
  { id: 'green-bot', name: 'Emerald Vibe', category: 'classics', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=green-bot&backgroundColor=10b981' },
  { id: 'pink-bot', name: 'Pink Glow', category: 'classics', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=pink-bot&backgroundColor=ec4899' },
  { id: 'dark-bot', name: 'Midnight Shadow', category: 'classics', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=midnight&backgroundColor=1f2937' },
  { id: 'teal-bot', name: 'Electric Teal', category: 'classics', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=electric-teal&backgroundColor=14b8a6' }
];

export const ALL_AVATARS = [...COMEDIAN_AVATARS, ...SHOW_AVATARS, ...CLASSIC_AVATARS];

export const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '/api' : 'http://localhost:3001/api');
