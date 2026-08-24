'use strict';

const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const source = path.join(repoRoot, 'tools', 'local-pos-agent', 'agent.js');
const targetDir = path.join(appRoot, 'resources');
const target = path.join(targetDir, 'agent.js');

if (!fs.existsSync(source)) {
  throw new Error(`Local POS agent not found: ${source}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`Bundled Local POS agent: ${target}`);
