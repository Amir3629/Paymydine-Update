'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BRAND_URL = process.env.PMD_BRAND_LOGO_URL || 'https://tomo.paymydine.com/brand/paymydine-logo.svg';
const output = path.resolve(__dirname, '..', 'build', 'icon.svg');

function addWhiteAppIconBackground(svg) {
  const svgTag = svg.match(/<svg\b[^>]*>/i);
  if (!svgTag) {
    throw new Error('Official PayMyDine logo SVG has no opening <svg> tag.');
  }

  const viewBoxMatch = svgTag[0].match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  let rect = '<rect data-pmd-app-icon-background="white" x="0" y="0" width="100%" height="100%" fill="#ffffff"/>';

  if (viewBoxMatch) {
    const values = viewBoxMatch[1]
      .trim()
      .split(/[\s,]+/)
      .map((value) => Number(value));

    if (values.length === 4 && values.every(Number.isFinite)) {
      const [x, y, width, height] = values;
      rect = `<rect data-pmd-app-icon-background="white" x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff"/>`;
    }
  }

  return svg.replace(svgTag[0], `${svgTag[0]}\n  ${rect}`);
}

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

  const sourceSvg = await response.text();
  if (!/<svg(?:\s|>)/i.test(sourceSvg) || !/<\/svg>/i.test(sourceSvg)) {
    throw new Error('Official PayMyDine logo response is not a complete SVG. Refusing Electron default icon fallback.');
  }

  if (Buffer.byteLength(sourceSvg, 'utf8') < 200) {
    throw new Error('Official PayMyDine logo SVG is unexpectedly small. Refusing build.');
  }

  const svg = addWhiteAppIconBackground(sourceSvg);
  if (!svg.includes('data-pmd-app-icon-background="white"') || !svg.includes('fill="#ffffff"')) {
    throw new Error('White app-icon background contract failed.');
  }

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, svg, 'utf8');

  const digest = crypto.createHash('sha256').update(svg, 'utf8').digest('hex');
  console.log(`PMD_BRAND_ICON_URL=${BRAND_URL}`);
  console.log('PMD_APP_ICON_BACKGROUND=#FFFFFF');
  console.log(`PMD_BRAND_ICON_SHA256=${digest}`);
  console.log(`PMD_BRAND_ICON_PATH=${output}`);
  console.log('PMD_BRAND_ICON_OK');
}

main().catch((error) => {
  console.error(`PMD_BRAND_ICON_REFUSED: ${error.message}`);
  process.exit(1);
});
