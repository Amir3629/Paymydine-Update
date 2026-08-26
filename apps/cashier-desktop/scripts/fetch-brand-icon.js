'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BRAND_URL = process.env.PMD_BRAND_LOGO_URL || 'https://tomo.paymydine.com/brand/paymydine-logo.svg';
const buildDir = path.resolve(__dirname, '..', 'build');
const legacyOutput = path.join(buildDir, 'icon.svg');
const macIconDir = path.join(buildDir, 'AppIcon.icon');
const macAssetsDir = path.join(macIconDir, 'Assets');
const macLogoOutput = path.join(macAssetsDir, 'PayMyDine.svg');
const macJsonOutput = path.join(macIconDir, 'icon.json');

function addWhiteLegacyBackground(svg) {
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

function buildMacIconComposerJSON() {
  return {
    fill: {
      solid: 'srgb:1.00000,1.00000,1.00000,1.00000',
    },
    'color-space-for-untagged-svg-colors': 'srgb',
    groups: [
      {
        name: 'PayMyDine',
        lighting: 'individual',
        layers: [
          {
            name: 'PayMyDine Logo',
            'image-name': 'PayMyDine.svg',
            glass: false,
            position: {
              scale: 0.74,
              'translation-in-points': [0, 0],
            },
          },
        ],
      },
    ],
    'supported-platforms': {
      squares: 'shared',
    },
  };
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

  fs.rmSync(macIconDir, { recursive: true, force: true });
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(macAssetsDir, { recursive: true });

  // Windows/legacy macOS fallback keeps a conventional opaque white canvas.
  const legacySvg = addWhiteLegacyBackground(sourceSvg);
  fs.writeFileSync(legacyOutput, legacySvg, 'utf8');

  // macOS 26 Tahoe uses an Icon Composer asset. The logo stays transparent and
  // the system enclosure itself receives the pure-white fill, avoiding the
  // legacy gray icon-jail frame plus inner white square.
  fs.writeFileSync(macLogoOutput, sourceSvg, 'utf8');
  fs.writeFileSync(macJsonOutput, `${JSON.stringify(buildMacIconComposerJSON(), null, 2)}\n`, 'utf8');

  const digest = crypto
    .createHash('sha256')
    .update(sourceSvg, 'utf8')
    .update(fs.readFileSync(macJsonOutput))
    .digest('hex');

  console.log(`PMD_BRAND_ICON_URL=${BRAND_URL}`);
  console.log('PMD_LEGACY_ICON_BACKGROUND=#FFFFFF');
  console.log('PMD_MAC_ICON_FORMAT=ICON_COMPOSER');
  console.log('PMD_MAC_ICON_ENCLOSURE_BACKGROUND=#FFFFFF');
  console.log(`PMD_BRAND_ICON_SHA256=${digest}`);
  console.log(`PMD_LEGACY_ICON_PATH=${legacyOutput}`);
  console.log(`PMD_MAC_ICON_PATH=${macIconDir}`);
  console.log('PMD_BRAND_ICON_OK');
}

main().catch((error) => {
  console.error(`PMD_BRAND_ICON_REFUSED: ${error.message}`);
  process.exit(1);
});
