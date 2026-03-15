#!/usr/bin/env node
/**
 * Generate Play Store assets from existing icon.
 *
 * Usage:
 *   npm install --save-dev sharp
 *   node scripts/generate-store-assets.js
 *
 * Generates:
 *   - assets/images/store-icon-512.png  (512x512 hi-res icon)
 */

const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      'sharp is not installed. Run:\n  npm install --save-dev sharp\nThen re-run this script.'
    );
    process.exit(1);
  }

  const iconInput = path.resolve(__dirname, '..', 'assets', 'images', 'icon.png');
  const iconOutput = path.resolve(__dirname, '..', 'assets', 'images', 'store-icon-512.png');

  await sharp(iconInput)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(iconOutput);

  console.log(`Created: ${iconOutput}`);
  console.log('\nDone! Upload store-icon-512.png as the hi-res icon in Play Console.');
  console.log('For the feature graphic (1024x500), open docs/feature-graphic.html in a browser and take a screenshot.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
