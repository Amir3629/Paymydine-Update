import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js', 'utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css', 'utf8');
const parityCss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');
const auth = fs.readFileSync('app/Http/Controllers/PmdMobileWorkspaceAuthController.php', 'utf8');
const grant = fs.readFileSync('app/Services/PmdMobileSync/PmdMobileStaffGrantService.php', 'utf8');
const session = fs.readFileSync('app/Http/Controllers/PmdMobileWorkspaceSessionController.php', 'utf8');
const app = fs.readFileSync('mobile/android/app/src/main/java/com/paymydine/mobile/ui/PayMyDineApp.kt', 'utf8');
const role = fs.readFileSync('mobile/android/app/src/main/java/com/paymydine/mobile/RoleWorkspaceActivity.kt', 'utf8');

assert.equal(parityJs, js);
assert.equal(parityCss, css);

assert.ok(js.includes("name: 'Card'"));
assert.ok(!js.includes("name: 'Terminal'"));
assert.ok(js.includes('PMD_QPOS_HISTORY_INLINE_V123'));
assert.ok(js.includes('renderHistoryInlineDetailV123'));
assert.ok(js.includes('sameOrder ? null : (orderId || null)'));
assert.ok(js.includes('PMD_QPOS_HISTORY_DATE_RANGE_V123'));
assert.ok(js.includes("String(state.historyPreset || '') === 'all'"));
assert.ok(js.includes('historyUsesCustomDatePickerV123'));
assert.ok(js.includes('positionHistoryDatePickerV123'));

assert.ok(css.includes('PMD_QPOS_HISTORY_INLINE_MOBILE_V123'));
assert.ok(css.includes('grid-template-columns: repeat(4,minmax(0,1fr)) !important'));
assert.ok(css.includes('.pmd-qpos-history-inline-detail-v123'));
assert.ok(css.includes('.pmd-qpos-history-date-picker-v123'));

assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v126'));
assert.ok(view.includes('pmd-quick-pos-v1.css?v=20260925-v126'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.js?v=20260925-v126'));
assert.ok(view.includes('pmd-quick-pos-v1.js?v=20260925-v126'));

assert.ok(auth.includes('PMD_MOBILE_REQUESTED_SURFACE_AUTHORITY_V123'));
assert.ok(auth.includes("$route = 'reservations2'"));
assert.ok(grant.includes('PMD_MOBILE_GRANT_SURFACE_V123'));
assert.ok(grant.includes("'surface' => $surface"));
assert.ok(session.includes('PMD_MOBILE_RESERVATIONS_ROUTE_V123'));
assert.ok(session.includes("$legacySurface === 'auto'"));
assert.ok(session.includes("$route = 'reservations2'"));
assert.ok(app.includes('"reservations" -> ReservationsActivity::class.java'));
assert.ok(role.includes('"?surface=$surface&destination=$destination"'));

assert.ok(js.includes('PMD_QPOS_BATCH_MAIN_PAY_V122'));
assert.ok(js.includes('PMD_QPOS_SERVER_ROUND_AUTHORITY_V121'));
assert.ok(css.includes('PMD_QPOS_MOBILE_PAYMENT_STACK_V120'));

console.log('PMD V123 reservations + Card wording + inline History + safe date picker: PASS');
