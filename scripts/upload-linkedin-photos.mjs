/**
 * Downloads LinkedIn profile photos using your Chrome profile (for auth cookies)
 * and uploads them to Cloudinary at alan.design/linkedin/.
 *
 * Usage: node scripts/upload-linkedin-photos.mjs
 * Note: Quit Chrome before running.
 */

import { createHmac } from 'crypto';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const CLOUD_NAME = 'ajalong';
const API_KEY = process.env.CLOUDINARY_KEY || '375393199151283';
const API_SECRET = process.env.CLOUDINARY_SECRET || 'xerkzIymHaoyGRCHas29hRX5Kik';
const FOLDER = 'alan.design/linkedin';
const CHROME_PROFILE = '/Users/alanlong/Library/Application Support/Google/Chrome';

function slugFromUrl(url) {
  const match = url.match(/\/(\d+)$/);
  return match ? match[1] : url.split('/').pop().replace(/[^a-z0-9]/gi, '_');
}

function cloudinarySignature(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return createHmac('sha1', API_SECRET).update(sorted + API_SECRET).digest('hex');
}

async function uploadToCloudinary(imageBuffer, slug) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: FOLDER, public_id: slug, timestamp };
  const signature = cloudinarySignature(params);

  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }));
  formData.append('public_id', slug);
  formData.append('folder', FOLDER);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', API_KEY);
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  // Return delivery URL with optimisation transforms applied at render time
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/${data.public_id}`;
}

async function main() {
  const projectsDir = path.resolve(process.cwd(), 'src/content/projects');
  const mdFiles = readdirSync(projectsDir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(projectsDir, f));

  const urlToSlug = new Map();
  for (const file of mdFiles) {
    const content = readFileSync(file, 'utf8');
    for (const [, url] of content.matchAll(/headshot: (https:\/\/media\.licdn\.com[^\n]+)/g)) {
      if (!urlToSlug.has(url.trim())) urlToSlug.set(url.trim(), slugFromUrl(url.trim()));
    }
  }

  console.log(`Found ${urlToSlug.size} unique LinkedIn photo URLs\n`);

  // Launch Chrome with your real profile so LinkedIn cookies are present
  const context = await chromium.launchPersistentContext(CHROME_PROFILE, {
    channel: 'chrome',
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const replacements = new Map();
  const page = await context.newPage();

  for (const [url, slug] of urlToSlug) {
    process.stdout.write(`Fetching ${slug}... `);
    try {
      const response = await page.request.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.linkedin.com/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok()) {
        console.log(`✗ HTTP ${response.status()}`);
        continue;
      }

      const buffer = await response.body();
      console.log(`downloaded (${(buffer.length / 1024).toFixed(0)}KB), uploading...`);

      const cloudUrl = await uploadToCloudinary(buffer, slug);
      replacements.set(url, cloudUrl);
      console.log(`  ✓ ${cloudUrl}`);
    } catch (err) {
      console.log(`  ✗ ${err.message}`);
    }
  }

  await context.close();

  if (replacements.size === 0) {
    console.log('\nNo images uploaded — nothing to update.');
    return;
  }

  console.log(`\nUploaded ${replacements.size}/${urlToSlug.size} images. Updating markdown files...`);
  for (const file of mdFiles) {
    let content = readFileSync(file, 'utf8');
    let changed = false;
    for (const [linkedinUrl, cloudUrl] of replacements) {
      if (content.includes(linkedinUrl)) {
        content = content.replaceAll(linkedinUrl, cloudUrl);
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(file, content, 'utf8');
      console.log(`  Updated ${path.basename(file)}`);
    }
  }

  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
