import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
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

for (const themeId of themeIds) {
  const dir = path.join(root, 'src', 'themes', themeId)
  const tsx = fs.readdirSync(dir).find((name) => name.endsWith('.tsx'))
  if (!tsx) {
    failures.push(`${themeId}: missing TSX theme entry`)
    continue
  }
  const content = fs.readFileSync(path.join(dir, tsx), 'utf8')
  const required = [
    'RestaurantLogo',
    'LanguageSelect',
    'PlatformFooter',
    'RuntimeOverlays',
    'openItem',
    'openCart',
    'openCheckout',
  ]
  for (const marker of required) {
    if (!content.includes(marker)) failures.push(`${themeId}: missing ${marker}`)
  }
  if (!content.includes('openService')) failures.push(`${themeId}: no waiter/note/valet service action is wired`)
}

const runtime = fs.readFileSync(path.join(root, 'src/runtime/MenuRuntimeContext.tsx'), 'utf8')
for (const marker of [
  'confirmCartItems',
  'submitTableOrder',
  'fetchTableOrder',
  'callWaiter',
  'sendTableNote',
  'requestValet',
  'setInterval',
  'markOrderPaid',
]) {
  if (!runtime.includes(marker)) failures.push(`MenuRuntimeContext: missing ${marker}`)
}

const overlays = fs.readFileSync(path.join(root, 'src/runtime/components/RuntimeOverlays.tsx'), 'utf8')
for (const marker of [
  "'full'",
  "'equal'",
  "'items'",
  "'shares'",
  'validateCoupon',
  'tipPercent',
  'payExistingOrder',
  'startHostedProviderPayment',
  'PayPalButton',
  'selectedItemsPayload',
  'submitTableOrder',
]) {
  if (!overlays.includes(marker)) failures.push(`RuntimeOverlays: missing ${marker}`)
}

const normalizer = fs.readFileSync(path.join(root, 'src/server/normalize.ts'), 'utf8')
for (const marker of [
  'allergens',
  'halal',
  'vegetarian',
  'vegan',
  'nutrition',
  'options',
  'isChefRecommended',
  'isBestseller',
  'prepTimeMinutes',
  'normalizeSocial',
  'normalizeFeatures',
  'normalizePayments',
]) {
  if (!normalizer.includes(marker)) failures.push(`normalize.ts: missing ${marker}`)
}

const i18n = fs.readFileSync(path.join(root, 'src/lib/i18n.ts'), 'utf8')
for (const locale of ['en', 'de', 'fa', 'tr', 'ja']) {
  if (!new RegExp(`const\\s+${locale}\\s*:`).test(i18n)) failures.push(`i18n: locale ${locale} is missing`)
}
if (!i18n.includes("['fa', 'ar', 'he', 'ur']")) failures.push('i18n: RTL locale handling is missing')

if (failures.length) {
  console.error('PMD V2 FEATURE COVERAGE AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`PMD V2 FEATURE COVERAGE AUDIT: PASS (${themeIds.length} themes + shared business flows)`)
