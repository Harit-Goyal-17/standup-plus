import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../standup.db');
const PUBLIC_IMG_DIR = path.resolve(__dirname, '../../client/public/images/comedians');
const DIST_IMG_DIR = path.resolve(__dirname, '../../client/dist/images/comedians');

fs.mkdirSync(PUBLIC_IMG_DIR, { recursive: true });
fs.mkdirSync(DIST_IMG_DIR, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return resolve(destPath);
    }
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        fs.unlink(destPath, () => {});
        return reject(new Error(`Failed to download ${url}: status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(destPath));
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

const COMEDIANS = [
  {
    name: 'Zakir Khan',
    filename: 'zakir_khan.jpg',
    url: 'https://yt3.ggpht.com/ytc/AIdro_n1IJy85RjuuYiZphsaRQnSeF1v6numV9-5Tn--R5NMvcQ=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Samay Raina',
    filename: 'samay_raina.jpg',
    url: 'https://yt3.googleusercontent.com/yF9W936pQcE7U2vH7d6Kk-2bHqM_e4v0bZ8q3_9f=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Abhishek Upmanyu',
    filename: 'abhishek_upmanyu.jpg',
    url: 'https://yt3.ggpht.com/ytc/AIdro_k6F6RkEpJ7qntsElloPtcaA42bjzZDT5wq5cJhE1zcWPU=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Aakash Gupta',
    filename: 'aakash_gupta.jpg',
    url: 'https://yt3.ggpht.com/ytc/AIdro_kWjbRKzOhX9prGuQCFMFvttIQmuoOGJkczm4HPOWk5OWw=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Rahul Subramanian',
    filename: 'rahul_subramanian.jpg',
    url: 'https://yt3.ggpht.com/bxVxic_WY1hs-8eT-1F0UyF4I8ihMVt5RIxZ_KUWGo2ESBwI_xvBG7mreIHfYAprretXZm261M0=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Anubhav Singh Bassi',
    filename: 'anubhav_singh_bassi.jpg',
    url: 'https://yt3.ggpht.com/ytc/AIdro_lTc4pjHpph8bWvCOFNlTFBCSZTZlQlul82tX8zyChB1jg=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Munawar Faruqui',
    filename: 'munawar_faruqui.jpg',
    url: 'https://yt3.ggpht.com/AIdro_mN-09gQjK=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Gaurav Kapoor',
    filename: 'gaurav_kapoor.jpg',
    url: 'https://yt3.ggpht.com/AIdro_lB8=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Prashasti Singh',
    filename: 'prashasti_singh.jpg',
    url: 'https://yt3.googleusercontent.com/ytc/AIdro_kU5y5zZ053X4X0jP1M9s5w_qG0Q5zX0=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Biswa Kalyan Rath',
    filename: 'biswa_kalyan_rath.jpg',
    url: 'https://yt3.ggpht.com/AIdro_lC8=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Kenny Sebastian',
    filename: 'kenny_sebastian.jpg',
    url: 'https://yt3.ggpht.com/AIdro_lD8=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Kanan Gill',
    filename: 'kanan_gill.jpg',
    url: 'https://yt3.ggpht.com/AIdro_lE8=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Swati Sachdeva',
    filename: 'swati_sachdeva.jpg',
    url: 'https://yt3.ggpht.com/AIdro_lF8=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Kunal Kamra',
    filename: 'kunal_kamra.jpg',
    url: 'https://yt3.ggpht.com/AIdro_lG8=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Harsh Gujral',
    filename: 'harsh_gujral.jpg',
    url: 'https://yt3.ggpht.com/Xu62-aG0LyWMHDGThUQWnP_0mpdQf1UUzyMSYLmplC6dq9YaSnM8bhxFAWYIHIjxovXZcpo1Fg=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Gurleen Pannu',
    filename: 'gurleen_pannu.jpg',
    url: 'https://yt3.googleusercontent.com/ytc/AIdro_l6N8w=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Amit Tandon',
    filename: 'amit_tandon.jpg',
    url: 'https://yt3.ggpht.com/ytc/AIdro_k-CJnKN0XWR0EbBl_sARNZHjIJrK5Ui0iayx_fA1-k8m1K=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Shashi Dhiman',
    filename: 'shashi_dhiman.jpg',
    url: 'https://yt3.ggpht.com/d78O7wxPNXfeZfy9DK0SAtCn3bvE2iZjNNJNh8JSDa3naNoDpv5lG8do56CoK0OR0zM2PlACdA=s800-c-k-c0x00ffffff-no-rj'
  },
  {
    name: 'Jaspreet Singh',
    filename: 'jaspreet_singh.jpg',
    url: 'https://yt3.ggpht.com/Vf-jYDyf1LfclP1TNrAHRq6NuoXTlU5-MpwmKfR6IcWqC_R8anDx3THr8s1GWpyxBviqXXs=s800-c-k-c0x00ffffff-no-rj'
  }
];

async function run() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  for (const c of COMEDIANS) {
    const publicPath = path.join(PUBLIC_IMG_DIR, c.filename);
    const distPath = path.join(DIST_IMG_DIR, c.filename);
    const relativeUrl = `/images/comedians/${c.filename}`;

    try {
      if (!fs.existsSync(publicPath)) {
        await downloadFile(c.url, publicPath);
      }
      if (fs.existsSync(publicPath) && !fs.existsSync(distPath)) {
        fs.copyFileSync(publicPath, distPath);
      }
    } catch (e) {
      console.warn(`Could not download image for ${c.name}: ${e.message}`);
    }

    // Update in database
    db.run("UPDATE comedians SET profile_image_url = ? WHERE name LIKE ?", [relativeUrl, `%${c.name}%`]);
    console.log(`Updated avatar for: ${c.name} -> ${relativeUrl}`);
  }

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('🎉 Successfully synchronized all comedian avatars to local files and DB.');
}

run().catch(console.error);
