import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync('app/admin/assets/css/pmd-location-live-clock-r11.css', 'utf8');
const manifest = JSON.parse(fs.readFileSync('app/admin/views/_meta/assets.json', 'utf8'));

assert.match(css, /PMD_GLOBAL_CLOCK_VIEWPORT_CENTER_V152/);
assert.match(css, /left:\s*50vw !important/);
assert.match(css, /transform:\s*translateX\(-50%\) !important/);
assert.doesNotMatch(css, /calc\(50% \+ 43px\)/);
assert.doesNotMatch(css, /calc\(50% \+ 99px\)/);

const styles = manifest.style || [];
assert.ok(styles.some(x => x.path === 'css/pmd-location-live-clock-r11.css'));
assert.ok(!styles.some(x => x.path === 'css/pmd-location-live-clock-r10.css'));

console.log('PMD V152 cache-proof viewport-centered clock: PASS');
