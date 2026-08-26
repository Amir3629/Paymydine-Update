'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const mainPath = path.join(root, 'src', 'main.js');
const hardwarePath = path.join(root, 'src', 'hardware.js');
const hardwarePagePath = path.join(root, 'src', 'hardware-page.js');

function alreadyPatched() {
  const main = fs.readFileSync(mainPath, 'utf8');
  const hardware = fs.readFileSync(hardwarePath, 'utf8');
  const hardwarePage = fs.readFileSync(hardwarePagePath, 'utf8');
  return main.includes('PMD_CASHIER_FULLSCREEN_V106')
    && hardware.includes('PMD_CASHIER_HARDWARE_TRUTH_V106')
    && hardwarePage.includes('PMD_HARDWARE_TRUTH_UI_V106');
}

if (alreadyPatched()) {
  console.log('PMD_CASHIER_V106_PATCH_CHAIN_ALREADY_APPLIED');
  process.exit(0);
}

execFileSync(process.execPath, [path.join(__dirname, 'apply-v104.js')], {
  cwd: root,
  stdio: 'inherit',
});
execFileSync(process.execPath, [path.join(__dirname, 'apply-v106.js')], {
  cwd: root,
  stdio: 'inherit',
});

if (!alreadyPatched()) {
  throw new Error('PMD V1.0.6 patch chain finished without required markers.');
}

console.log('PMD_CASHIER_V106_PATCH_CHAIN_OK');
