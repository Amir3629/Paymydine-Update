#!/usr/bin/env node
/* PMD_RESERVATION_SEARCH_NAV_TIKTOK_R1 — file-only deployment contract.
 * Run after stage overlay before any live-file installation. No tenant writes.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const includes = (file, value) => assert(read(file).includes(value), 'Missing "' + value + '" in ' + file);

const controller = 'app/admin/controllers/Reservations.php';
const sql = 'app/admin/Services/PmdReservationsScheduleV1.php';
const searchJs = 'app/admin/assets/js/pmd-reservations-search-r1.js';
const searchCss = 'app/admin/assets/css/pmd-reservations-search-r1.css';
const profile = 'app/admin/controllers/Pmdsettings.php';
const profileView = 'app/admin/views/pmdsettings/restaurant.blade.php';
const navView = 'app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php';
const navDe = 'app/admin/i18n/platform/de.php';

new Function(read(searchJs));
includes(controller, "onPmdSearchReservationsR1()");
includes(controller, "addCss('css/pmd-reservations-search-r1.css')");
includes(controller, "addJs('js/pmd-reservations-search-r1.js')");
includes(controller, "hasPermission('Admin.Reservations')");
includes(controller, "->locationId()");
includes(controller, "searchOtherDates(");
includes(controller, "            60");
includes(sql, "->where('location_id', $locationId)");
includes(sql, "CONCAT_WS(' ', first_name, last_name) LIKE ?");
includes(sql, "->limit($limit)");
includes(searchJs, "data-pmd-reservations-card-edit");
includes(searchJs, "onPmdSearchReservationsR1");
includes(searchJs, "X-CSRF-TOKEN");
includes(searchJs, "credentials:'same-origin'");
includes(searchJs, "setOpen(!active)");
includes(searchJs, "AbortController");
const css = read(searchCss);
assert.strictEqual((css.match(/{/g) || []).length,(css.match(/}/g) || []).length,'CSS block balance');
assert(css.includes('.pmd-rsearch__panel[hidden]'), 'hidden search must not cover floor');

includes(navDe, "'nav.reservations' => 'Buchungen'");
includes(navDe, "'nav.coupons_gifts' => 'Gutscheine'");
includes(navView, "$pmdSm2T('nav.menu', 'Menu')");
includes(navView, "admin_url('reservations')");
includes(navView, 'href="/admin/discounts"');
includes(navView, "admin_url('pmdmenus')");

includes(profile, "'tiktok_url' => ['nullable', 'url', 'max:500']");
includes(profile, "array_key_exists('tiktok_url', $profile)");
includes(profile, "'pmd_social_tiktok_enabled'");
includes(profile, "'pmd_social_tiktok_url'");
includes(profile, "'tiktok_enabled' => (bool)");
includes(profileView, "['key' => 'tiktok'");
includes(profileView, "name=\"profile[{{ $social['key'] }}_url]\"");
includes(profileView, "name=\"profile[{{ $social['key'] }}_enabled]\"");
includes(profileView, "data-pmd-service-calendar");
for (const path of [
  'routes/api.php',
  'routes/admin-app-before.php',
  'app/main/routes/main-public-compat.php',
  'app/main/routes/next-proxy.php',
  'routes/pmd-public-compat-handler.php'
]) {
  includes(path, "'pmd_social_tiktok_enabled'");
  includes(path, "'pmd_social_tiktok_url'");
}
includes('app/Http/Controllers/PmdPublicBookingController.php', "'tiktok_url' => !empty($settings['pmd_social_tiktok_enabled'])");
includes('resources/views/pmd/public-booking.blade.php', '$bookingProfile[\'tiktok_url\']');
const theme = read('app/main/routes/theme-settings.php');
assert((theme.match(/'tiktok' => \[/g) || []).length >= 3,'all simple-theme branches should expose TikTok');
for(const f of [
  'frontend/app/themes/kazen-japanese/KazenStandalonePage.tsx',
  'frontend/app/themes/velvet-terracotta/KazenStandalonePage.tsx'
]){
  includes(f, 'action: "website" | "social" | "tiktok"');
  includes(f, '"tiktok",');
  includes(f, 'kazenHeaderLinksV1.tiktok.enabled');
  includes(f, 'pmd_social_tiktok_enabled');
  includes(f, 'link.rel = "noopener noreferrer"');
}
includes('frontend/store/cms/types.ts','"tiktok"');
includes('frontend/store/cms/defaults.ts','tiktok: { enabled: false');
includes('frontend/store/cms/merchant-settings.ts','"tiktok"');
includes('frontend/features/customer-menu/checkout/hooks/useCheckoutReviewInvoiceActions.ts','id: "tiktok"');

console.log('PASS: R1 reservation search, location guard, DE sidebar labels, TikTok profile/public/Next frontend contracts');
// Optional parsing if TypeScript is installed in this checkout; never npm install in this test.
const tsPaths = [
  path.join(root, 'frontend/node_modules/typescript'),
  path.join(root, 'node_modules/typescript')
];
const tsPath = tsPaths.find(p => fs.existsSync(p));
if (tsPath) {
  const ts = require(tsPath);
  for (const file of [
    'frontend/app/themes/kazen-japanese/KazenStandalonePage.tsx',
    'frontend/app/themes/velvet-terracotta/KazenStandalonePage.tsx',
    'frontend/store/cms/types.ts',
    'frontend/store/cms/defaults.ts',
    'frontend/store/cms/merchant-settings.ts',
    'frontend/features/customer-menu/checkout/hooks/useCheckoutReviewInvoiceActions.ts'
  ]) {
    const result = ts.transpileModule(read(file),{
      fileName:file,
      reportDiagnostics:true,
      compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.Preserve}
    });
    const errors = (result.diagnostics || []).filter(d=>d.category===ts.DiagnosticCategory.Error);
    if(errors.length) {
      throw new Error(file + ': ' + errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')).join('; '));
    }
  }
  console.log('PASS: TypeScript transpile syntax for six edited customer-facing sources');
} else {
  console.log('NOTE: TypeScript transpile skipped (frontend/node_modules not present); build/tsc required before frontend activation.');
}
