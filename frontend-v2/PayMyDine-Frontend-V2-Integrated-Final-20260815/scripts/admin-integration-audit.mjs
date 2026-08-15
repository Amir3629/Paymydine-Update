import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const themeIds = [
  'noir_editorial',
  'verdant_modern',
  'lumiere_fine_dining',
  'kazen_japanese',
  'azzurra_coastal',
  'neon_cocktail_bar',
  'art_deco_speakeasy',
  'shahrazad_persian',
  'anatolia_turkish',
  'ember_steakhouse',
]

const files = {
  route: 'integration/laravel/pmd-frontend-v2-theme.php',
  fields: 'integration/admin/frontend-theme-fields-v2.php',
  installer: 'integration/laravel/install-v2-theme-bridge.sh',
}

for (const file of Object.values(files)) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`)
}

if (!failures.length) {
  const route = fs.readFileSync(path.join(root, files.route), 'utf8')
  const fields = fs.readFileSync(path.join(root, files.fields), 'utf8')
  const installer = fs.readFileSync(path.join(root, files.installer), 'utf8')
  for (const themeId of themeIds) {
    if (!route.includes(`'${themeId}'`)) failures.push(`V2 theme route missing ${themeId}`)
    if (!fields.includes(`'${themeId}'`)) failures.push(`Admin fields missing ${themeId}`)
  }
  if (!route.includes("'/api/v2/frontend-theme'")) failures.push('V2 theme route endpoint missing')
  if (/table[_-]?notes|call[_-]?restaurant|phone/i.test(fields)) failures.push('Admin V2 fields reintroduced note/phone-order controls')
  if (!installer.includes("routes/theme-settings.php")) failures.push('Installer does not preserve legacy theme route ordering')
  if (!installer.includes('pmd-frontend-v2-theme.php')) failures.push('Installer does not load V2 theme bridge')
}

if (failures.length) {
  console.error('PMD V2 ADMIN INTEGRATION AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('PMD V2 ADMIN INTEGRATION AUDIT: PASS (10 themes + V2-only backend bridge)')
