'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BRAND_URL = process.env.PMD_BRAND_LOGO_URL || 'https://tomo.paymydine.com/brand/paymydine-logo.svg';
const output = path.resolve(__dirname, '..', 'build', 'icon.svg');

async function main() {
  const response = await fetch(BRAND_URL, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'PayMyDine-Cashier-Desktop-Builder/1.0.5',
      'Accept': 'image/svg+xml,text/plain;q=0.9,*/*;q=0.1',
    },
  });

  if (!response.ok) {
    throw new Error(`Official PayMyDine logo download failed: HTTP ${response.status}`);
  }

  const svg = await response.text();
  if (!/<svg(?:\s|>)/i.test(svg) || !/<\/svg>/i.test(svg)) {
    throw new Error('Official PayMyDine logo response is not a complete SVG. Refusing Electron default icon fallback.');
  }

  if (Buffer.byteLength(svg, 'utf8') < 200) {
    throw new Error('Official PayMyDine logo SVG is unexpectedly small. Refusing build.');
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, svg, 'utf8');

  const digest = crypto.createHash('sha256').update(svg, 'utf8').digest('hex');
  console.log(`PMD_BRAND_ICON_URL=${BRAND_URL}`);
  console.log(`PMD_BRAND_ICON_SHA256=${digest}`);
  console.log(`PMD_BRAND_ICON_PATH=${output}`);
  console.log('PMD_BRAND_ICON_OK');
}

main().catch((error) => {
  console.error(`PMD_BRAND_ICON_REFUSED: ${error.message}`);
  process.exit(1);
});
