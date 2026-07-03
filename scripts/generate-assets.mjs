/**
 * Generates static brand assets that BaseLayout references:
 *   - public/images/og/og-default.jpg   (1200×630 social preview from the hero artwork)
 *   - public/favicon.ico                (32px, from the logo SVG)
 *   - public/favicon-16x16.png / favicon-32x32.png
 *   - public/apple-touch-icon.png       (180px, on white background)
 *
 * Run manually after changing the hero image or logo:
 *   node scripts/generate-assets.mjs
 *
 * The outputs are committed — this script is NOT part of the build.
 */
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { mkdir, writeFile } from 'node:fs/promises';

const HERO = 'src/assets/hero.png';
const LOGO = 'public/images/logo/Logo.svg';

// --- OG image: 1200×630 center-crop of the hero ---
await mkdir('public/images/og', { recursive: true });
await sharp(HERO)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile('public/images/og/og-default.jpg');
console.log('✓ public/images/og/og-default.jpg');

// --- Favicons from the logo SVG (rasterized on white for visibility) ---
const icon = (size) =>
  sharp(LOGO, { density: 300 })
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .png();

await icon(16).toFile('public/favicon-16x16.png');
await icon(32).toFile('public/favicon-32x32.png');
await icon(180).toFile('public/apple-touch-icon.png');
console.log('✓ favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png');

const ico = await pngToIco(['public/favicon-32x32.png']);
await writeFile('public/favicon.ico', ico);
console.log('✓ public/favicon.ico');
