import {expect, test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(__dirname, '../..');
const read = (relative: string) => fs.readFileSync(path.join(repo, relative), 'utf8');

test('Shifts has one canonical first-paint geometry authority', () => {
  const controller = read('app/admin/controllers/Shifts.php');
  const canonicalCss = read('app/admin/assets/css/pmd-shifts-canonical-92a6ad0051a5.css');
  const exactLayout = read('app/admin/assets/js/pmd-admin-exact-layout-v1.js');
  const sideMenu = read('app/admin/views/_partials/pmd_side_menu2_global.blade.php');

  expect(controller).not.toContain('pmd-shifts-first-paint-v12.css');
  expect(controller).not.toContain('pmd-shifts-first-paint-v13.css');
  expect(controller).not.toContain('pmd-shifts-first-paint-v15.css');
  for (const version of ['v12', 'v13', 'v15']) {
    expect(fs.existsSync(path.join(repo, `app/admin/assets/css/pmd-shifts-first-paint-${version}.css`))).toBe(false);
  }

  expect(canonicalCss).toContain('Canonical Shifts shell');
  expect(canonicalCss).toContain('body.pmd-shifts-page .page-content > *');
  expect(canonicalCss).toContain('animation: none !important');
  expect(exactLayout).toMatch(/path\.indexOf\('\/admin\/shifts'\) === 0/);
  expect(exactLayout).not.toContain('function isShifts()');
  expect(sideMenu).not.toContain('pmd-shifts-static-shell');
  expect(sideMenu).not.toContain('PMD_SHIFTS_DUAL_STATE_GUARD');
});

test('Side Menu state is mutually exclusive before paint', () => {
  const sideMenu = read('app/admin/views/_partials/pmd_side_menu2_global.blade.php');
  const remove = sideMenu.indexOf("'pmd-sm2-expanded',\n        'pmd-sm2-collapsed'");
  const add = sideMenu.indexOf("state === 'expanded'\n            ? 'pmd-sm2-expanded'");
  expect(remove).toBeGreaterThan(-1);
  expect(add).toBeGreaterThan(remove);
});

test('server-rendered initial rota is preserved on boot', () => {
  const shifts = read('app/admin/assets/js/pmd-shifts-canonical-b4d2e55c5e6d.js');
  expect(shifts).toContain('[data-pmd-shifts-server-initial]');
  expect(shifts).toMatch(/if \(\s*!serverInitial[\s\S]*renderHourView\(boot\.selected_day\)/);
});
