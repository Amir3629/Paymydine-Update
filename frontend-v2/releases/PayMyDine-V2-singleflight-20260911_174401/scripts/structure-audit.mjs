import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'package.json',
  'scripts/secure-install.sh',
  'app/page.tsx',
  'app/menu/page.tsx',
  'app/table/[tableId]/page.tsx',
  'app/preview/page.tsx',
  'app/preview/[themeId]/page.tsx',
  'app/payment/return/page.tsx',
  'app/api/v1/[...path]/route.ts',
  'app/api/v2/frontend-theme/route.ts',
  'app/api/media/[...path]/route.ts',
  'app/assets/media/[...path]/route.ts',
  'app/storage/[...path]/route.ts',
  'app/uploads/[...path]/route.ts',
  'src/server/bootstrap.ts',
  'src/server/backend.ts',
  'src/server/proxy.ts',
  'src/lib/client-api.ts',
  'src/runtime/MenuRuntimeContext.tsx',
  'src/runtime/components/RuntimeOverlays.tsx',
  'src/runtime/components/PayPalButton.tsx',
  'src/themes/ThemeRenderer.tsx',
  'integration/laravel/pmd-frontend-v2-theme.php',
  'integration/laravel/install-v2-theme-bridge.sh',
  'integration/admin/frontend-theme-fields-v2.php',
  'docs/ARCHITECTURE.md',
  'docs/BACKEND_CONTRACT.md',
  'docs/QA_MATRIX.md',
  'docs/DEPLOYMENT.md',
]

const themeIds = [
  'noir-editorial',
  'verdant-modern',
  'lumiere-fine-dining',
  'kazen-japanese',
  'azzurra-coastal',
  'neon-cocktail-bar',
  'art-deco-speakeasy',
  'shahrazad-persian',
  'anatolia-turkish',
  'ember-steakhouse',
]

const missing = required.filter((relative) => !fs.existsSync(path.join(root, relative)))
for (const themeId of themeIds) {
  const dir = path.join(root, 'src', 'themes', themeId)
  if (!fs.existsSync(dir)) missing.push(`src/themes/${themeId}/`)
}

if (missing.length) {
  console.error('PMD V2 STRUCTURE AUDIT: FAILED')
  missing.forEach((file) => console.error(`- missing ${file}`))
  process.exit(1)
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
if (packageJson.dependencies?.next !== '16.3.1') {
  console.error(`PMD V2 STRUCTURE AUDIT: FAILED\n- Next must be pinned to 16.3.1, found ${packageJson.dependencies?.next}`)
  process.exit(1)
}

// The final source archive deliberately does not ship the stale pre-security-fix lockfile.
// `npm run secure:install` creates a fresh package-lock.json from exact root pins, runs a
// non-force audit repair, and fails on any remaining production vulnerability.
const lockPath = path.join(root, 'package-lock.json')
if (fs.existsSync(lockPath)) {
  const packageLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
  const lockedNext = packageLock.packages?.['']?.dependencies?.next
  if (lockedNext !== packageJson.dependencies.next) {
    console.error(`PMD V2 STRUCTURE AUDIT: FAILED\n- local package-lock is stale for Next: ${lockedNext} != ${packageJson.dependencies.next}`)
    process.exit(1)
  }
}

console.log(`PMD V2 STRUCTURE AUDIT: PASS (${required.length} required files, ${themeIds.length} themes)`)
