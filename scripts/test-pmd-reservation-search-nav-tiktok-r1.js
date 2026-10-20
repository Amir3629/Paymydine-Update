#!/usr/bin/env node
/* PMD_RESERVATION_SEARCH_NAV_TIKTOK_R1
 * Read-only contract checks; no DB/user data or browser required.
 */
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const all=[
'app/admin/controllers/Reservations.php',
'app/admin/Services/PmdReservationsScheduleV1.php',
'app/admin/views/_partials/pmd_reservations_cards_v1.blade.php',
'app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php',
'app/admin/assets/js/pmd-reservations-live-sync-v1.js',
'app/admin/assets/js/pmd-reservations-search-r1.js',
'app/admin/assets/css/pmd-reservations-search-r1.css',
'app/admin/controllers/Pmdsettings.php',
'app/admin/views/pmdsettings/restaurant.blade.php',
'app/Http/Controllers/PmdPublicBookingController.php',
'resources/views/pmd/public-booking.blade.php',
'app/main/routes/theme-settings.php',
'routes/api.php',
'app/main/routes/main-public-compat.php',
'app/main/routes/next-proxy.php',
'routes/pmd-public-compat-handler.php',
'frontend/store/cms/types.ts',
'frontend/store/cms/defaults.ts',
'frontend/store/cms/merchant-settings.ts',
'frontend/app/themes/kazen-japanese/KazenStandalonePage.tsx',
'frontend/app/themes/velvet-terracotta/KazenStandalonePage.tsx',
'frontend/features/customer-menu/checkout/hooks/useCheckoutReviewInvoiceActions.ts'
];
all.forEach(p=>assert(fs.existsSync(path.join(root,p)), 'Missing '+p));
const get=p=>file(p);
const ctrl=get(all[0]),service=get(all[1]),view=get(all[2]),nav=get(all[3]);
assert(ctrl.includes("searchOtherDates($locationId, $locale, $searchTerm, null, null, 100)"),'SQL-scoped search');
assert(service.includes("->where('location_id', $locationId)"),'Location-scoped search');
assert(service.includes("CONCAT_WS(' ', first_name, last_name) LIKE ?"),'full-name lookup');
assert(view.includes('name="pmd_search"')&&view.includes('data-pmd-search-active='),'Form and live guard');
assert(view.includes('$pmdOpsSearchActive && $date') && view.includes('admin_url(\'reservations/edit/\''),'Search results not tied to today');
assert(nav.includes("? 'Buchungen'")&&nav.includes("? 'Gutscheine'"),'Compact German nav');
assert(nav.includes("$pmdSm2T('nav.menu', 'Menu')"),'Combined Menu remains same destination');
assert(!nav.includes('class="pmd-sm2__label">Menu &amp; Inventory'), 'old long title remains');
const live=get(all[4]),search=get(all[5]),css=get(all[6]);
new Function(live);new Function(search);
assert(live.includes("getAttribute('data-pmd-search-active') === '1'"),'Live sync overrides server query results');
assert(search.includes('data-pmd-reservations-search-header'),'Search header icon');
assert((css.match(/{/g)||[]).length===(css.match(/}/g)||[]).length,'CSS braces');
assert(get(all[7]).includes("'pmd_social_tiktok_enabled'") && get(all[7]).includes("'tiktok_url' =>"),'Persist and read social');
assert(get(all[8]).includes("'key' => 'tiktok'"),'Profile TikTok card');
assert(get(all[9]).includes("'tiktok_url' => !empty("),'Public profile TikTok');
assert(get(all[10]).includes("bookingProfile['tiktok_url']"),'Guest /book TikTok footer');
assert(get(all[11]).includes('PMD_TIKTOK_PUBLIC_THEME_R1'),'Final active theme endpoint');
for(const p of ['routes/api.php','app/main/routes/main-public-compat.php','app/main/routes/next-proxy.php','routes/pmd-public-compat-handler.php']) {
  assert(get(p).includes("'pmd_social_tiktok_enabled'")&&get(p).includes("'pmd_social_tiktok_url'"),'Public settings '+p);
}
assert(get(all[16]).includes('"tiktok"'),'Frontend type');
assert(get(all[17]).includes('tiktok: { enabled: false, url: "" }'),'Frontend defaults');
assert(get(all[18]).includes('"tiktok"'),'Frontend parse');
for(const p of ['frontend/app/themes/kazen-japanese/KazenStandalonePage.tsx','frontend/app/themes/velvet-terracotta/KazenStandalonePage.tsx']){
  assert(get(p).includes('"tiktok"')&&get(p).includes('kazenHeaderLinksV1.tiktok.enabled'),'Theme '+p);
}
assert(get(all[21]).includes('label: "TikTok"'),'Guest share link');

console.log('PASS: reservations SQL cross-date search, non-clobbering live refresh, concise DE nav and TikTok admin/public/Next contracts');
