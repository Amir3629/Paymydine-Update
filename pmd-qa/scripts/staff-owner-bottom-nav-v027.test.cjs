'use strict';
// PMD_OWNER_BOTTOM_NAV_TEST_V027_20261023
// Regression: both Owner shells must use a fixed BOTTOM five-tab navigation
// at mobile, tablet and desktop widths. Existing ordinary Staff is unchanged.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('app/admin/assets/css/pmd-staff-owner-bottom-nav-v027.css');
const staff=read('app/admin/views/pmd-staff-portal/index_v5.blade.php');
const owner=read('app/admin/views/pmd-staff-portal/management_v1.blade.php');
const legacy=read('app/admin/assets/css/pmd-staff-manager-v2.css');
const originalStaff=read('app/admin/assets/css/pmd-staff-portal-v4.css');

assert.match(css,/PMD_OWNER_BOTTOM_NAV_V027_20261023/);
assert.match(css,/body\.pmd-owner-linked\s+\.pmd-staff-mobile-nav\s*,\s*body\.pmd-owner-fallback\s+\.pmd-staff-mobile-nav/);
assert.match(css,/position:\s*fixed\s*!important/);
assert.match(css,/top:\s*auto\s*!important/);
assert.match(css,/bottom:\s*0\s*!important/);
assert.match(css,/inset-block-end:\s*0\s*!important/);
assert.match(css,/width:\s*100%\s*!important/);
assert.match(css,/display:\s*flex\s*!important/);
assert.match(css,/flex-direction:\s*row\s*!important/);
assert.match(css,/flex-wrap:\s*nowrap\s*!important/);
assert.match(css,/env\(safe-area-inset-bottom/);
assert.match(css,/padding-bottom:\s*calc\(85px/);
assert.match(css,/max-width:\s*188px/);
assert.match(css,/\.pmd-staff-mobile-nav\s*>\s*button\.is-active/);
assert.match(css,/@media\(max-width:\s*760px\)/);
assert.match(css,/@media\(max-width:\s*360px\)/);
assert.match(css,/@media\(prefers-reduced-motion:\s*reduce\)/);
// Core fixed nav intentionally outside a media query; makes it bottom on all
// widths despite the legacy desktop/tablet "sticky top" navigation.
const firstMedia=css.search(/@media/);
const fixed=css.indexOf('position: fixed !important;');
assert.ok(fixed>0 && firstMedia>fixed, 'bottom placement must not require a narrow viewport');
assert.ok(!css.includes('body.pmd-staff-portal-page .pmd-staff-mobile-nav'), 'do not override ordinary Staff');
const newLink='pmd-staff-owner-bottom-nav-v027.css?v=27';
assert.equal(staff.split(newLink).length-1,1,'linked manager stylesheet should be included once');
assert.equal(owner.split(newLink).length-1,1,'unlinked manager stylesheet should be included once');
assert.match(staff,/<body class="pmd-staff-portal-page\{\{ \$canManage \? ' pmd-owner-linked' : '' \}\}">/);
assert.match(owner,/<body class="pmd-staff-portal-page pmd-owner-fallback">/);
for(const view of [staff,owner]){
  assert.ok(view.indexOf(newLink) > view.indexOf('pmd-staff-portal-v4.css'), 'bottom CSS must load after old top CSS');
  assert.match(view,/class="pmd-staff-mobile-nav"/);
  const bar=view.slice(view.indexOf('<nav class="pmd-staff-mobile-nav"'),
                       view.indexOf('</nav>',view.indexOf('<nav class="pmd-staff-mobile-nav"'))+6);
  assert.equal((bar.match(/data-pmd-mobile-target=/g)||[]).length,5,
               'exactly five bottom tabs; do not create overcrowded navigation');
  assert.match(bar,/data-pmd-mobile-target="chat"/);
  assert.match(bar,/data-pmd-mobile-target="requests"/);
  assert.match(bar,/data-pmd-mobile-target="schedule"/);
}
assert.match(staff,/data-pmd-mobile-target="clock"/);
assert.match(staff,/data-pmd-mobile-target="manage"/);
assert.match(owner,/data-pmd-mobile-target="team"/);
assert.match(owner,/data-pmd-mobile-target="activity"/);
assert.doesNotMatch(owner,/data-pmd-mobile-target="clock"/);
// The older CSS is still present but now explicitly overridden LAST by v027.
assert.match(legacy,/@media\(min-width:761px\)/);
assert.match(originalStaff,/@media\s*\(min-width:761px\)/);
console.log('Owner fixed BOTTOM navigation on phone/tablet/desktop + Staff untouched: PASS');
