import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(
  'app/admin/assets/css/pmd-location-live-clock-r10.css',
  'utf8'
);

assert.match(css, /PMD_GLOBAL_CLOCK_VIEWPORT_CENTER_V151/);
assert.match(css, /left:\s*50vw !important/);
assert.match(css, /right:\s*auto !important/);
assert.match(css, /transform:\s*translateX\(-50%\) !important/);
assert.doesNotMatch(css, /left:\s*calc\(50% \+ 43px\)/);
assert.doesNotMatch(css, /left:\s*calc\(50% \+ 99px\)/);

console.log('PMD V151 global clock viewport center: PASS');
