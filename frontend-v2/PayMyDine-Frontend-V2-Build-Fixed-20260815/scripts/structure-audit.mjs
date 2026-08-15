import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'package.json',
  'package-lock.json',
  'app/page.tsx',
  'app/menu/page.tsx',
  'app/table/[tableId]/page.tsx',
  'app/preview/page.tsx',
  'app/preview/[themeId]/page.tsx',
  'app/payment/return/page.tsx',
  'app/api/v1/[...path]/route.ts',
  'app/api/media/[...path]/route.ts',
  'app/assets/media/[...path]/route.ts',
  'app/storage/[...path]/route.ts',
  'app/uploads/[...path]/route.ts',
  'src/server/bootstrap.ts',
  'src/server/proxy.ts',
  'src/lib/client-api.ts',
  'src/runtime/MenuRuntimeContext.tsx',
  'src/runtime/components/RuntimeOverlays.tsx',
  'src/runtime/components/PayPalButton.tsx',
  'src/themes/ThemeRenderer.tsx',
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
const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
if (packageLock.lockfileVersion !== 3) {
  console.error('PMD V2 STRUCTURE AUDIT: FAILED\n- package-lock.json must use lockfileVersion 3')
  process.exit(1)
}
for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
  const locked = packageLock.packages?.['']?.dependencies?.[name]
  if (locked !== version) {
    console.error(`PMD V2 STRUCTURE AUDIT: FAILED\n- lock root dependency mismatch for ${name}: ${locked} != ${version}`)
    process.exit(1)
  }
}

console.log(`PMD V2 STRUCTURE AUDIT: PASS (${required.length} required files, ${themeIds.length} themes)`)
