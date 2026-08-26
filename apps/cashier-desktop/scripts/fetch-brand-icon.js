'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BRAND_URL = process.env.PMD_BRAND_LOGO_URL || 'https://tomo.paymydine.com/brand/paymydine-logo.svg';
const appDir = path.resolve(__dirname, '..');
const buildDir = path.join(appDir, 'build');
const srcDir = path.join(appDir, 'src');
const legacyOutput = path.join(buildDir, 'icon.svg');
const uiLogoOutput = path.join(srcDir, 'paymydine-logo.svg');
const macIconDir = path.join(buildDir, 'AppIcon.icon');
const macAssetsDir = path.join(macIconDir, 'Assets');
const macLogoOutput = path.join(macAssetsDir, 'PayMyDine.svg');
const macJsonOutput = path.join(macIconDir, 'icon.json');

function getSvgMetrics(svg) {
  const svgTag = svg.match(/<svg\b[^>]*>/i);
  if (!svgTag) throw new Error('Official PayMyDine logo SVG has no opening <svg> tag.');

  const viewBoxMatch = svgTag[0].match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const values = viewBoxMatch[1].trim().split(/[\s,]+/).map((value) => Number(value));
    if (values.length === 4 && values.every(Number.isFinite) && values[2] > 0 && values[3] > 0) {
      return { svgTag: svgTag[0], x: values[0], y: values[1], width: values[2], height: values[3] };
    }
  }

  const widthMatch = svgTag[0].match(/\bwidth\s*=\s*["']([0-9.]+)/i);
  const heightMatch = svgTag[0].match(/\bheight\s*=\s*["']([0-9.]+)/i);
  const width = widthMatch ? Number(widthMatch[1]) : 0;
  const height = heightMatch ? Number(heightMatch[1]) : 0;
  if (width > 0 && height > 0) return { svgTag: svgTag[0], x: 0, y: 0, width, height };

  throw new Error('Official PayMyDine logo SVG has no usable viewBox/size.');
}

function addWhiteLegacyBackground(svg, metrics) {
  const rect = `<rect data-pmd-app-icon-background="white" x="${metrics.x}" y="${metrics.y}" width="${metrics.width}" height="${metrics.height}" fill="#ffffff"/>`;
  return svg.replace(metrics.svgTag, `${metrics.svgTag}\n  ${rect}`);
}

function buildMacIconComposerJSON(metrics) {
  const artworkSize = Math.max(metrics.width, metrics.height);
  const scale = Number(((0.78 * 1024) / artworkSize).toFixed(6));
  return {
    'fill-specializations': [
      { value: { 'automatic-gradient': 'extended-gray:1.00000,1.00000' } },
      { appearance: 'dark', value: { 'automatic-gradient': 'extended-gray:1.00000,1.00000' } },
    ],
    groups: [{
      layers: [{
        'blend-mode': 'normal',
        glass: false,
        hidden: false,
        'image-name': 'PayMyDine.svg',
        name: 'PayMyDine Logo',
        opacity: 1,
        position: { scale, 'translation-in-points': [0, 0] },
      }],
      shadow: { kind: 'none', opacity: 1 },
      translucency: { enabled: false, value: 0.5 },
    }],
    'supported-platforms': { circles: ['watchOS'], squares: 'shared' },
  };
}

async function main() {
  const response = await fetch(BRAND_URL, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'PayMyDine-Cashier-Desktop-Builder/1.0.7',
      'Accept': 'image/svg+xml,text/plain;q=0.9,*/*;q=0.1',
    },
  });

  if (!response.ok) throw new Error(`Official PayMyDine logo download failed: HTTP ${response.status}`);

  const sourceSvg = await response.text();
  if (!/<svg(?:\s|>)/i.test(sourceSvg) || !/<\/svg>/i.test(sourceSvg)) {
    throw new Error('Official PayMyDine logo response is not a complete SVG. Refusing Electron default icon fallback.');
  }
  if (Buffer.byteLength(sourceSvg, 'utf8') < 200) {
    throw new Error('Official PayMyDine logo SVG is unexpectedly small. Refusing build.');
  }

  const metrics = getSvgMetrics(sourceSvg);
  fs.rmSync(macIconDir, { recursive: true, force: true });
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(macAssetsDir, { recursive: true });

  const legacySvg = addWhiteLegacyBackground(sourceSvg, metrics);
  fs.writeFileSync(legacyOutput, legacySvg, 'utf8');

  // PMD_CASHIER_BRANDED_LOCAL_UI_V107
  // The same official logo used by the website is bundled into the app UI.
  fs.writeFileSync(uiLogoOutput, sourceSvg, 'utf8');

  fs.writeFileSync(macLogoOutput, sourceSvg, 'utf8');
  const iconDefinition = buildMacIconComposerJSON(metrics);
  fs.writeFileSync(macJsonOutput, `${JSON.stringify(iconDefinition, null, 2)}\n`, 'utf8');

  const digest = crypto.createHash('sha256')
    .update(sourceSvg, 'utf8')
    .update(fs.readFileSync(macJsonOutput))
    .digest('hex');

  console.log(`PMD_BRAND_ICON_URL=${BRAND_URL}`);
  console.log('PMD_LEGACY_ICON_BACKGROUND=#FFFFFF');
  console.log('PMD_MAC_ICON_FORMAT=ICON_COMPOSER');
  console.log('PMD_MAC_ICON_ENCLOSURE_BACKGROUND=#FFFFFF');
  console.log(`PMD_MAC_ICON_SCALE=${iconDefinition.groups[0].layers[0].position.scale}`);
  console.log(`PMD_BRAND_ICON_SHA256=${digest}`);
  console.log(`PMD_UI_LOGO_PATH=${uiLogoOutput}`);
  console.log(`PMD_LEGACY_ICON_PATH=${legacyOutput}`);
  console.log(`PMD_MAC_ICON_PATH=${macIconDir}`);
  console.log('PMD_BRAND_ICON_OK');
}

main().catch((error) => {
  console.error(`PMD_BRAND_ICON_REFUSED: ${error.message}`);
  process.exit(1);
});
