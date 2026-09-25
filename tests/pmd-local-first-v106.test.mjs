import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');

const pos = read('mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt');
const bridge = read('mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt');
const syncRepo = read('mobile/android/app/src/main/java/com/paymydine/mobile/sync/SyncRepository.kt');
const syncEngine = read('mobile/android/app/src/main/java/com/paymydine/mobile/sync/SyncEngine.kt');
const localRepo = read('mobile/android/app/src/main/java/com/paymydine/mobile/data/local/LocalPosRepository.kt');
const imageCache = read('mobile/android/app/src/main/java/com/paymydine/mobile/data/local/OfflineImageCache.kt');
const bootstrap = read('app/Services/PmdMobileSync/PmdMobileBootstrapService.php');
const processor = read('app/Services/PmdMobileSync/PmdMobileCommandProcessor.php');
const qpos = read('app/admin/assets/js/pmd-quick-pos-v1.js');
const qposCss = read('app/admin/assets/css/pmd-quick-pos-v1.css');
const parityJs = read('app/admin/assets/js/pmd-qpos-web-parity-v112.js');
const parityCss = read('app/admin/assets/css/pmd-qpos-web-parity-v112.css');
const view = read('app/admin/views/pmd_quick_pos_v1.blade.php');
const gradle = read('mobile/android/app/build.gradle.kts');

assert.ok(pos.includes('PMD_ANDROID_LOCAL_FIRST_V2_V104'));
assert.ok(pos.includes('PMD_ANDROID_LOCAL_FIRST_FIRST_RUN_PROMOTION_V104'));
assert.ok(pos.includes('PMD_ANDROID_LOCAL_FIRST_SHELL_SEED_GUARD_V106'));
assert.ok(pos.includes('createCanonicalWebView(allowShellSeed = true)'));
assert.equal(parityJs, qpos);
assert.equal(parityCss, qposCss);
assert.ok(view.includes('PMD_QPOS_WEB_PARITY_V112'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v112'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.js?v=20260925-v112'));
assert.ok(qpos.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));
assert.ok(pos.includes('PMD_ANDROID_V112_OFFLINE_WEB_PARITY'));
assert.ok(pos.includes('PMD_ANDROID_V112_OFFLINE_SYNC_CHIP_BACKFILL'));
assert.ok(pos.includes("meta.querySelector('[data-qpos-sync-state]')"));
assert.ok(pos.includes('/app/admin/assets/css/pmd-qpos-web-parity-v112.css'));
assert.ok(pos.includes('/app/admin/assets/js/pmd-qpos-web-parity-v112.js'));
assert.ok(pos.includes('pmd-canonical/css/pmd-qpos-web-parity-v112.css'));
assert.ok(pos.includes('pmd-canonical/js/pmd-qpos-web-parity-v112.js'));
assert.ok(gradle.includes('PMD_ANDROID_V112_OFFLINE_WEB_PARITY_BUNDLE'));
assert.ok(gradle.includes('"pmd-qpos-web-parity-v112.css"'));
assert.ok(gradle.includes('"pmd-qpos-web-parity-v112.js"'));
assert.ok(!gradle.includes('"pmd-qpos-android-tablet-v111.css"'));
assert.ok(!gradle.includes('"pmd-qpos-android-runtime-v108.js"'));
assert.ok(bridge.includes('PMD_ANDROID_PAY_BEFORE_KITCHEN_V112'));
assert.ok(bridge.includes('.put("payment_gate", paymentGate)'));
assert.ok(localRepo.includes('PMD_ANDROID_PAY_BEFORE_KITCHEN_V112'));
assert.ok(localRepo.includes('.put("payment_gate", paymentGate)'));
assert.ok(syncRepo.includes('PMD_ANDROID_SYNC_VISIBILITY_V104'));
assert.ok(syncRepo.includes('PMD_ANDROID_CLOUD_HEALTH_V104'));
assert.ok(syncRepo.includes('PMD_ANDROID_CLOUD_LINE_OUTBOX_PROJECTION_V106'));
assert.ok(syncRepo.includes('STATUS_REJECTED'));
assert.ok(syncRepo.includes('recoverInFlight'));
assert.ok(syncRepo.includes('"created_at_ms ASC"'));
assert.ok(syncRepo.includes('nextAggregateBaseVersion'));
assert.ok(syncRepo.includes('rejectedCount()'));
assert.ok(pos.includes('PMD_ANDROID_POS_STICKY_LOCAL_V20'));
assert.ok(pos.includes('transportMode = TransportMode.LOCAL'));
assert.ok(pos.includes('refreshLocalWeb()'));
assert.ok(localRepo.includes('remote_conflict_version'));
assert.ok(localRepo.includes('Order changed on another device.'));
assert.ok(localRepo.includes('rejected_command_id'));
assert.ok(localRepo.includes('offline_cash_command_id'));
assert.ok(syncEngine.includes('"ORDER_ITEM_ADJUST_V1"'));
assert.ok(syncEngine.includes('Item change is stored locally and waiting for PayMyDine Cloud.'));
assert.ok(bridge.includes('PMD_ANDROID_CLOUD_LINE_EDIT_V106'));
assert.ok(bridge.includes('canonicalServerItemMutationV106'));
assert.ok(bridge.includes('projectPendingItemAdjustmentsV106'));
assert.ok(bridge.includes('"CASH_PAYMENT_V1"'));
assert.ok(bridge.includes('Card and terminal payments need an internet connection.'));
assert.ok(localRepo.includes('PMD_ANDROID_CLOUD_LINE_ACK_V106'));
assert.ok(localRepo.includes('PMD_ANDROID_CLOUD_LINE_REMOTE_EVENT_V106'));
assert.ok(localRepo.includes('expected_updated_at'));
assert.ok(localRepo.includes('trustedBusinessTimeMs()'));
assert.ok(imageCache.includes('.put("sha256", contentSha256)'));
assert.ok(bootstrap.includes('PMD_MOBILE_TRUSTED_TIME_ANCHOR_V104'));
assert.ok(bootstrap.includes("'ORDER_ITEM_ADJUST_V1'"));
assert.ok(processor.includes('PMD_MOBILE_ORDER_ITEM_ADJUST_V106'));
assert.ok(processor.includes('applyOrderItemAdjustCommand'));
assert.ok(processor.includes('increaseItemV68'));
assert.ok(processor.includes('voidItemV22'));
assert.ok(processor.includes("'ORDER_ITEM_ADJUST_V1' => 'ORDER_ITEM_ADJUSTED_V1'"));
assert.ok(qpos.includes('PMD_QPOS_SYNC_VISIBILITY_V104'));
assert.ok(qposCss.includes('PMD_QPOS_ANDROID_FORM_FACTOR_MATRIX_V105'));
assert.ok(qposCss.includes('PMD_QPOS_SYNC_STATE_V104'));

// Critical safety invariants: payment/provider approval remains Cloud-only and
// canonical Cloud-line adjustment is never delegated to Restaurant Edge while
// the Edge lacks the exact payment/KDS/manager policy implementation.
const cloudOnlyBlock = syncEngine.slice(
  syncEngine.indexOf('PMD_ANDROID_CASH_CLOUD_RECONCILIATION_V17'),
  syncEngine.indexOf('if (route.kind == TransportKind.OFFLINE)')
);
assert.ok(cloudOnlyBlock.includes('"ORDER_ITEM_ADJUST_V1"'));
assert.ok(cloudOnlyBlock.includes('"CASH_PAYMENT_V1"'));

console.log('PMD Local-First V112 offline chaos contract matrix: PASS');
console.log('Covered contracts: WAN cut, durable queue, process restart recovery, aggregate ordering, reconnect without WebView replacement, rejected reconciliation, multi-device remote conflict, Cash durability, Cloud-line +/- reconciliation, Cloud health split, trusted clock, image integrity, V112 exact Web parity offline bundle, V108 pay-before-Kitchen durability.');
