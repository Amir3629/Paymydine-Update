import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const owner = read('app/admin/controllers/Dashboardlab.php');
const manager = read('app/admin/controllers/Managerlab.php');
const accountant = read('app/admin/controllers/Accountantlab.php');
const assetMaker = read('app/system/traits/AssetMaker.php');
const analytics = read(
  'app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js'
);

const controllers = [
  ['Owner', owner],
  ['Manager', manager],
  ['Accountant', accountant],
];

assert.ok(
  assetMaker.includes('Assets::addJs($this->getAssetPath($href), $attributes);'),
  'AssetMaker addJs must resolve the local path before registration'
);
assert.ok(
  assetMaker.includes('if (File::isFile($_fileName))'),
  'AssetMaker local resolution must still depend on a real filesystem path'
);

for (const [role, controller] of controllers) {
  assert.ok(
    controller.includes('PMD_DASHBOARD_ANALYTICS_ASSET_URL_V133'),
    role + ' V133 asset marker missing'
  );

  assert.ok(
    controller.includes(
      "asset('app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js')"
    ),
    role + ' must build the public analytics URL before cache busting'
  );

  assert.ok(
    controller.includes('@filemtime('),
    role + ' must use filemtime cache busting'
  );

  assert.equal(
    controller.includes(
      "addJs('js/pmd-dashboard-lab-analytics-v1.js?v="
    ),
    false,
    role + ' must not put a query string inside a local AssetMaker path'
  );
}

assert.ok(
  analytics.includes('PMD_DASHBOARD_ANALYTICS_SWR_V132'),
  'V132 SWR analytics runtime must remain preserved'
);
assert.ok(
  analytics.includes("request('last30', true)") &&
    analytics.includes("request('month', true)"),
  'V132 fresh analytics revalidation must remain preserved'
);

new Function(analytics);

console.log(
  'PMD V133 dashboard analytics asset URL hotfix: PASS'
);
