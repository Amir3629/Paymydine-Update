#!/usr/bin/env node
'use strict';
/** Static R13 guardrails; live authenticated tenant QA remains a separate step. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const get = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const js = get('app/admin/assets/js/pmd-owner-hour-team-notes-r11.js');
const css = get('app/admin/assets/css/pmd-owner-hour-team-notes-r11.css');
const backend = get('app/Services/PmdOwnerStaffHourNotesR11.php');
const controller = get('app/Http/Controllers/PmdOwnerStaffHourNotesR11Controller.php');
const schema = get('app/Services/PmdOwnerStaffNotesTenantSchemaR13.php');
const lifecycle = get('app/Services/SuperAdminTenantLifecycleService.php');
const legacy = get('app/Http/Middleware/PmdTenantRuntimeGuardR1.php');
const originalCreator = get('app/admin/controllers/SuperAdminController.php');
const view = get('app/admin/views/dashboardlab/index.blade.php');

new vm.Script(js, {filename:'pmd-owner-hour-team-notes-r11.js'});
assert(!js.includes('<select data-pmd-owner-hour-note-time>'), 'Native 48-row select must not be rendered.');
assert(js.includes('data-pmd-owner-hour-time-list hidden'), 'Custom list starts closed.');
assert(js.includes('timeList') && js.includes("m += 30"), 'Half-hour options retained.');
assert(js.includes("closeTimeList(true)") && js.includes("ArrowDown"), 'Keyboard navigation exists.');
assert(js.includes("next.length ? next : ['all']"), 'Last target cannot silently deselect all.');
assert(js.includes('data-pmd-owner-hour-note-members'), 'Named team member group rendered.');
assert(js.includes("aria-pressed"), 'Recipient toggles have accessible state.');
assert(css.includes('max-height:min(230px,37dvh)'), 'Time popup must be compact.');
assert(css.includes('.pmd-owner-hour-role[aria-pressed="true"]'), 'Selected recipients are visibly green.');
assert(backend.includes('public function memberOptions'), 'Backend offers tenant-local named members.');
assert(backend.includes("'staff:'.(int)$row->staff_id"), 'Individual target must match an actual recipient.');
assert(controller.includes("'members' => $notes->memberOptions($location)"), 'Owner endpoint delivers member choices.');
assert(schema.includes("getDefaultConnection()") && schema.includes("Refusing to provision central or template database."), 'Schema must be tenant guarded.');
assert(lifecycle.includes('PmdOwnerStaffNotesTenantSchemaR13::class'), 'Canonical tenant creation installs notes schema.');
assert(legacy.includes('PmdOwnerStaffNotesTenantSchemaR13::class'), 'Legacy tenant creation installs notes schema.');
assert(lifecycle.includes("'pmd_owner_staff_hour_notes', 'pmd_owner_staff_hour_note_receipts'"), 'Template data must not leak.');
assert(originalCreator.includes('Staff Notes are restaurant-private.'), 'Legacy cloning excludes private data.');
assert(view.includes('pmd-owner-hour-team-notes-r11.js\') }}?v=20261026-r13'), 'Updated JS cache key missing.');
console.log('PASS: R13 source contract checks (UI, recipients, tenant schema, privacy, cache).');
