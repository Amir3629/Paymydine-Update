import fs from 'node:fs';
import assert from 'node:assert/strict';

const nativeController = fs.readFileSync('app/admin/controllers/Reservations.php', 'utf8');
const workspaceController = fs.readFileSync('app/admin/controllers/Reservationslab.php', 'utf8');
const routes = fs.readFileSync('routes/admin-app-before.php', 'utf8');

assert.match(nativeController, /class Reservations extends \\Admin\\Classes\\AdminController/);
assert.match(nativeController, /Admin\\Actions\\CalendarController/);
assert.match(nativeController, /Admin\\Actions\\FormController/);
assert.doesNotMatch(nativeController, /extends PmdCleanWorkspaceControllerV1/);

assert.match(workspaceController, /class Reservationslab extends PmdCleanWorkspaceControllerV1/);
assert.match(workspaceController, /protected function pmdWorkspacePath\(\): string \{ return '\/admin\/reservations'; \}/);
assert.match(workspaceController, /public function onLoadReservationComposer\(\)/);
assert.match(workspaceController, /public function onSaveReservationComposer\(\)/);

assert.match(routes, /PMD_RESERVATIONS_FORM_CALENDAR_SPLIT_V139/);
assert.match(routes, /runInternalR81E\(\$request, 'reservationslab', 'canonical'\)/);

console.log('PMD V139 Reservations form/calendar split: PASS');
