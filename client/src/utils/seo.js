export function updateSEO({ title, description, image, url }) {
  if (typeof document === 'undefined') return;

  const siteTitle = 'StandUp+';
  const fullTitle = title ? `${title} | ${siteTitle}` : 'StandUp+ | Premium Stand-Up Comedy Streaming';
  const defaultDesc = 'Stream unfiltered stand-up specials, crowd work sets, and original comedy series from India and around the world.';
  const fullDesc = description || defaultDesc;
  const fullImage = image || 'https://standup-plus.onrender.com/images/comedians/anubhav_singh_bassi.jpg';
  const fullUrl = url || window.location.href;

  document.title = fullTitle;

  const setMeta = (attr, key, val) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', val);
  };

  setMeta('name', 'description', fullDesc);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', fullDesc);
  setMeta('property', 'og:image', fullImage);
  setMeta('property', 'og:url', fullUrl);
  setMeta('property', 'og:type', 'video.other');
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', fullDesc);
  setMeta('name', 'twitter:image', fullImage);
}
