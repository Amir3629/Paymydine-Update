import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css', 'utf8');
const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');
const posActivity = fs.readFileSync('mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt', 'utf8');

assert.ok(css.includes('PMD_QPOS_RESPONSIVE_MATRIX_V102'), 'V102 CSS marker missing');
assert.ok(css.includes('PMD_QPOS_PHONE_ONLY_SCOPE_V102'), 'phone-only scope missing');
assert.ok(
  css.includes('@media (min-width: 600px) and (max-width: 1024px) and (orientation: portrait)'),
  'tablet portrait media query missing'
);
assert.ok(
  !css.includes('@media (max-width: 820px), (max-width: 1024px) and (orientation: portrait)'),
  'legacy broad portrait-as-phone media query returned'
);
assert.ok(
  !css.includes('@media (max-width: 600px), (max-width: 900px) and (orientation: portrait)'),
  'legacy broad phone portrait media query returned'
);
assert.ok(
  css.includes('.pmd-qpos.is-tablet-portrait-v102 .pmd-qpos-table-grid') &&
  css.includes('grid-template-columns: repeat(4,minmax(0,1fr)) !important;'),
  'tablet table grid contract missing'
);
assert.ok(
  css.includes('.pmd-qpos.is-tablet-portrait-v102 .pmd-qpos-product-grid') &&
  css.includes('grid-template-columns: repeat(3,minmax(0,1fr)) !important;'),
  'tablet product grid contract missing'
);

assert.ok(js.includes('PMD_QPOS_RESPONSIVE_MATRIX_RUNTIME_V102'), 'V102 JS marker missing');
assert.ok(js.includes("is-tablet-portrait-v102"), 'tablet portrait runtime class missing');
assert.ok(js.includes("is-phone-portrait-v102"), 'phone portrait runtime class missing');
assert.ok(js.includes("return isPhoneViewportV102();"), 'phone-only History contract missing');

const phoneMax = js.match(/var PMD_QPOS_PHONE_MAX_V102 = (\d+);/);
const tabletMax = js.match(/var PMD_QPOS_TABLET_MAX_V102 = (\d+);/);
const fn = js.match(
  /function classifyViewportV102\(width, height\) \{([\s\S]*?)\n  \}\n\n  function currentViewportClassV102/
);

assert.ok(phoneMax, 'phone threshold missing');
assert.ok(tabletMax, 'tablet threshold missing');
assert.ok(fn, 'classifyViewportV102 source not found');

const classifier = vm.runInNewContext(
  `var PMD_QPOS_PHONE_MAX_V102 = ${phoneMax[1]};
   var PMD_QPOS_TABLET_MAX_V102 = ${tabletMax[1]};
   function classifyViewportV102(width, height) {${fn[1]}
   }
   classifyViewportV102;`
);

const matrix = [
  [390, 844, 'phone-portrait'],
  [844, 390, 'phone-landscape'],
  [430, 932, 'phone-portrait'],
  [932, 430, 'phone-landscape'],
  [600, 960, 'tablet-portrait'],
  [768, 1024, 'tablet-portrait'],
  [820, 1180, 'tablet-portrait'],
  [1024, 1366, 'tablet-portrait'],
  [960, 600, 'tablet-landscape'],
  [1024, 768, 'tablet-landscape'],
  [1366, 1024, 'tablet-landscape'],
  [1280, 1600, 'desktop-portrait'],
  [1600, 1280, 'desktop-landscape']
];

for (const [width, height, expected] of matrix) {
  assert.equal(
    classifier(width, height),
    expected,
    `viewport ${width}x${height} classified incorrectly`
  );
}

assert.ok(
  view.includes('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'),
  'natural viewport meta contract missing'
);
assert.ok(view.includes('pmd-quick-pos-v1.css?v=20260924-v102'), 'V102 CSS cache bust missing');
assert.ok(view.includes('pmd-quick-pos-v1.js?v=20260924-v102'), 'V102 JS cache bust missing');

assert.equal(
  (posActivity.match(/textZoom = 100/g) || []).length,
  2,
  'both Android WebViews must keep textZoom=100'
);
assert.equal(
  (posActivity.match(/setInitialScale\(0\)/g) || []).length,
  2,
  'both Android WebViews must start at natural initial scale'
);
assert.equal(
  (posActivity.match(/loadWithOverviewMode = false/g) || []).length,
  2,
  'both Android WebViews must avoid overview zoom'
);
assert.equal(
  (posActivity.match(/useWideViewPort = true/g) || []).length,
  2,
  'both Android WebViews must honor the page viewport'
);
assert.ok(
  posActivity.includes('PMD_ANDROID_NORMAL_PAGE_SCALE_V100'),
  'Android natural-scale marker missing'
);

console.log('PMD responsive matrix V102: PASS');
console.log('PosActivity WebView natural-scale contract: PASS');
console.log('phone portrait / phone landscape / tablet portrait / tablet landscape / desktop: PASS');
