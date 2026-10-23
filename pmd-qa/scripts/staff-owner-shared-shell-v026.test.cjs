'use strict';
// PMD_OWNER_SHARED_STAFF_SHELL_CONTRACT_V026_20261023
// Verify one-brand Staff UI, role boundaries, tenant-scoped manager data,
// no fabricated employee identity, and same-app postback interactions.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../../');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const mywork=read('app/admin/controllers/Mywork.php');
const portal=read('app/Http/Controllers/PmdStaffPortalV5Controller.php');
const service=read('app/admin/Services/PmdStaffOperationsCenterV1.php');
const staff=read('app/admin/views/pmd-staff-portal/index_v5.blade.php');
const owner=read('app/admin/views/pmd-staff-portal/management_v1.blade.php');
const shared=read('app/admin/views/pmd-staff-portal/_manager_workforce_v026.blade.php');
const css=read('app/admin/assets/css/pmd-staff-manager-v2.css');
const js=read('app/admin/assets/js/pmd-staff-manager-v2.js');
const locale=read('app/admin/assets/js/pmd-staff-portal-locale-v2.js');
const shifts=read('app/admin/controllers/Shifts.php');
const schema=read('app/Http/Controllers/PmdStaffPortalV6Controller.php');

// Owner who has a real Team profile enters the SAME Staff app as employee.
assert.match(mywork,/PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023/);
assert.match(mywork,/public function index\(\)/);
assert.match(mywork,/if \(\$this->isWorkforceManager\(\)\)/);
assert.match(mywork,/if \(!\$this->hasPersonalTeamProfile\(\)\)/);
assert.match(mywork,/return \$this->portalResponse\('index'\)/);
assert.match(mywork,/public function manage\(\)/);
assert.match(mywork,/if \(!\$this->isWorkforceManager\(\)\) abort\(403\)/);
assert.match(mywork,/if \(\$this->hasPersonalTeamProfile\(\$locationId\)\)/);
assert.match(mywork,/return redirect\(admin_url\('mywork'\)\.'#management'\)/);
assert.match(mywork,/public function managerlocale\(\)/);
assert.match(mywork,/if \(!request\(\)->isMethod\('post'\)\) abort\(405\)/);
assert.match(mywork,/pmd_staff_ui_locale_/);
assert.match(mywork,/where\('staff_id', \$staffId\)->where\('is_active', 1\)/);
assert.doesNotMatch(mywork,/DB::table\('pmd_operational_people'\)->insert/);

// Only real Owner/Manager role can receive management data.
assert.match(portal,/if \(\$canManage\)/);
assert.match(portal,/PmdStaffOperationsCenterV1::class/);
assert.match(portal,/PmdActualWorkShiftV1::class/);
assert.match(portal,/'managerCenter'/);
assert.match(portal,/'managerExtras'/);
assert.match(service,/PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023/);
assert.match(service,/where\('location_id', \$locationId\)/);
assert.match(service,/whereBetween\('shift_date'/);
assert.match(service,/limit\(40\)/);
assert.match(service,/'upcoming' => collect\(\)/);

// Same exact Staff body class, Staff brand, topbar, nav and screen layout.
assert.match(staff,/data-pmd-staff-portal/);
assert.match(staff,/data-pmd-default-screen=/);
assert.match(staff,/pmd-staff-topbar/);
assert.match(staff,/pmd-staff-top-profile/);
assert.match(staff,/pmd-staff-mobile-nav/);
assert.match(staff,/data-pmd-mobile-target="manage" class="is-active"/);
assert.match(staff,/data-pmd-mobile-target="schedule"/);
assert.match(staff,/data-pmd-mobile-target="clock"/);
assert.match(staff,/pmd-staff-manager-v2\.css\?v=26/);
assert.match(staff,/pmd-staff-manager-v2\.js\?v=26/);
assert.match(staff,/pmd-staff-portal-locale-v2\.js\?v=26/);
assert.match(staff,/pmd-staff-portal\._manager_workforce_v026/);
assert.doesNotMatch(staff,/href="\{\{ admin_url\('mywork\/manage'\) \}\}">Team control<\/a>/);
assert.match(staff,/return root.getAttribute\('data-pmd-default-screen'\) \|\| 'schedule'/);

// Owner without an employee record gets the SAME shell, minus personal clock.
assert.match(owner,/PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023/);
assert.match(owner,/class="pmd-staff-portal-page pmd-owner-fallback"/);
assert.match(owner,/class="pmd-staff-app"/);
assert.match(owner,/class="pmd-staff-topbar"/);
assert.match(owner,/class="pmd-staff-mobile-nav"/);
assert.match(owner,/class="pmd-staff-layout"/);
assert.match(owner,/class="pmd-staff-tools"/);
assert.match(owner,/pmd-staff-portal-v4\.css/);
assert.match(owner,/pmd-staff-manager-v2\.css/);
assert.match(owner,/pmd-staff-manager-v2\.js/);
assert.match(owner,/pmd-staff-portal\._manager_workforce_v026/);
assert.match(owner,/data-pmd-mobile-target="team"/);
assert.match(owner,/data-pmd-mobile-target="schedule"/);
assert.match(owner,/data-pmd-mobile-target="chat"/);
assert.match(owner,/data-pmd-mobile-target="requests"/);
assert.match(owner,/data-pmd-mobile-target="activity"/);
assert.doesNotMatch(owner,/data-pmd-mobile-target="clock"/);
assert.doesNotMatch(owner,/data-pmd-owner-profile-open autofocus/);
assert.doesNotMatch(owner,/pmd-staff-manager-v1\.(css|js)/);
assert.match(owner,/method="post" action="\{\{ admin_url\('mywork\/stafflogout'\)/);
assert.match(owner,/method="post" action="\{\{ admin_url\('mywork\/managerlocale'\)/);
assert.match(owner,/pmdOwnerLang|pmdStaffLocale/);
assert.match(owner,/@csrf/);

// Manager actions use canonical role-protected Shift endpoints; do not expose
// private chats or any untrusted GPS data in Staff UI.
assert.match(shared,/PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023/);
assert.match(shared,/where|managerCenter/);
assert.match(shared,/staff_portal_breaks/);
assert.match(shared,/managerExtras/);
assert.match(shared,/shifts\/reviewactual/);
assert.match(shared,/data-pmd-owner-async/);
assert.doesNotMatch(shared,/clock_in_geo|clock_out_geo|location_lat|location_lng/);
assert.match(shifts,/public function reviewactual\(\)/);
assert.match(shifts,/assertOwnerOrManager\(\)/);
assert.match(owner,/shifts\/handlerequest/);
assert.match(owner,/shifts\/sendteammessage/);
assert.doesNotMatch(owner,/pmd_staff_chat_groups.*group_type.*private/);
assert.match(schema,/validatePunch\(\(int\)\$identity\['location_id'\], \$request\)/);

assert.match(css,/PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023/);
assert.match(css,/pmd-staff-mobile-nav/);
assert.match(css,/pmd-staff-top-profile/);
assert.match(css,/pmd-owner-team__extra/);
assert.match(css,/prefers-reduced-motion/);
assert.match(js,/PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023/);
assert.match(js,/data-pmd-owner-app/);
assert.match(js,/data-pmd-owner-profile-dialog/);
assert.match(js,/data-pmd-owner-async/);
assert.match(js,/credentials:'same-origin'/);
assert.match(js,/response\.redirected/);
assert.match(js,/end\.origin !== location\.origin/);
assert.match(locale,/"Team": "Ekip"/);
assert.doesNotMatch(js,/localStorage|geolocation|eval\(/);
new vm.Script(js,{filename:'pmd-staff-manager-v2.js'});
new vm.Script(locale,{filename:'pmd-staff-portal-locale-v2.js'});

console.log('PMD v026 Owner and Staff share one visual app, permissions remain server-gated: PASS');
