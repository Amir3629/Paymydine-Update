#!/usr/bin/env node
/* PMD_RESERVATIONS_NAV_TIKTOK_R1_CONTRACT - static regression guard.
 * Reads only staged repository files, does not contact any tenant or mutate DB.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p) { return fs.readFileSync(path.join(root,p),'utf8'); }
function need(condition,label) {if(!condition) throw new Error('FAIL: '+label);}
const resController=read('app/admin/controllers/Reservations.php');
const sharedHeader=read('app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php');
const resService=read('app/admin/Services/PmdReservationsScheduleV1.php');
const resView=read('app/admin/views/_partials/pmd_reservations_cards_v1.blade.php');
const nav=read('app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php');
const css=read('app/admin/assets/css/pmd-reservation-search-r1.css');
const profile=read('app/admin/views/pmdsettings/restaurant.blade.php');
const settings=read('app/admin/controllers/Pmdsettings.php');
need(resController.includes("request()->query('pmd_reservation_search'"),'GET search');
need(sharedHeader.includes('data-pmd-reservation-search-header'),'search icon in Reservations header');
need(sharedHeader.includes('href="#pmd-reservations-search-input-r1"'),'header button links to search field');
need(sharedHeader.includes('@if($pmdCleanWorkspaceReservationsSurface)'),'search only on Reservations page');
need(resController.includes("searchOtherDates("),'SQL search reused');
need(resController.includes("$locationId, $locale, $searchNeedle, null, null, 80"),'tenant/location bounded');
need(resService.includes("->where('location_id', $locationId)"),'location query scope');
need(resService.includes('CONCAT(COALESCE(first_name'),'full name');
need(resService.includes('->limit($limit)'),'bounded search');
need(resView.includes('role="search"')&&resView.includes('name="pmd_reservation_search"'),'accessible form');
need(resView.includes('data-pmd-reservation-search-edit'),'results open canonical reservation');
need(resView.includes('pmd_mode=edit&pmd_id='),'works via existing edit mode');
need(nav.includes("? 'Reservierung'"),'short German Reservation');
need(nav.includes("? 'Gutscheine'"),'short German voucher');
need(nav.includes("? 'Menü' : 'Menu'"),'short combined Menu');
need(css.includes('#pmd-reservations-cards-v2-1'),'scoped CSS');
need((css.match(/{/g)||[]).length===(css.match(/}/g)||[]).length,'CSS balanced');
need(profile.includes("['key' => 'tiktok'"),'profile TikTok card');
need(settings.includes("'tiktok_url' => ['nullable', 'url'"),'TikTok validated');
need(settings.includes("$settings['pmd_social_tiktok_enabled'] ="),'TikTok persistence');
need(settings.includes("array_key_exists('tiktok_url', $profile)"),'legacy tabs cannot clear TikTok');
need(settings.includes("'tiktok_enabled' => (bool)"),'TikTok readback');
for(const file of [
  'app/main/routes/next-proxy.php',
  'app/main/routes/main-public-compat.php',
  'routes/pmd-public-compat-handler.php',
  'routes/api.php',
  'routes/admin-app-before.php',
]){
 const s=read(file);
 need(s.includes("'pmd_social_tiktok_enabled' =>")&&s.includes("'pmd_social_tiktok_url' =>"),file+' API parity');
}
const types=read('frontend/store/cms/types.ts');
const defaults=read('frontend/store/cms/defaults.ts');
const mapping=read('frontend/store/cms/merchant-settings.ts');
const review=read('frontend/features/customer-menu/checkout/hooks/useCheckoutReviewInvoiceActions.ts');
need(types.includes('"tiktok"'),'typed TikTok platform');
need(defaults.includes('tiktok: { enabled: false, url: "" }'),'disabled until configured');
need(mapping.includes('"tiktok"'),'customer settings mapping');
need(review.includes('label: "TikTok"'),'customer review/social link');
for(const file of [
  'frontend/app/themes/kazen-japanese/KazenStandalonePage.tsx',
  'frontend/app/themes/velvet-terracotta/KazenStandalonePage.tsx',
]){
 const s=read(file);
 need(s.includes('if (platform === "tiktok") return iconTiktok'),'TikTok themed icon');
}
const theme=read('app/main/routes/theme-settings.php');
need(theme.includes("['tiktok', 'pmd_social_tiktok_enabled', 'pmd_social_tiktok_url']"),'Kazen platform from tenant settings');
need(theme.includes("'instagram', 'tiktok', 'facebook'"),'allow selected TikTok platform');
need(theme.includes("'tiktok' => ["),'independent enabled TikTok header link');
for(const file of [
  'frontend/app/themes/kazen-japanese/KazenStandalonePage.tsx',
  'frontend/app/themes/velvet-terracotta/KazenStandalonePage.tsx',
]) {
  const t = read(file);
  need(t.includes('group, "tiktok"'),file+' renders independent TikTok link');
  need(t.includes('tiktokIsFeatured'),file+' prevents duplicate featured TikTok');
}
console.log('PASS: reservation search, German navigation, TikTok profile/API/customer contract');
