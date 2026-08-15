import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.name === 'node_modules' || entry.name === '.next') return []
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const runtimeFiles = ['app', 'src'].flatMap((dir) => walk(path.join(root, dir)))
  .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))

const forbidden = [
  ['phone-order UI', /callRestaurant|call to order|Telefonisch bestellen|Telefonla sipariş|電話で注文|سفارش تلفنی|href=\{?`tel:/i],
  ['table-note UI', /leaveNote|tableNotes|sendTableNote|sendNote|openService\(['"]note['"]\)|\/table-notes|StickyNote|notePlaceholder/],
]

for (const file of runtimeFiles) {
  const content = fs.readFileSync(file, 'utf8')
  for (const [label, pattern] of forbidden) {
    if (pattern.test(content)) failures.push(`${path.relative(root, file)}: forbidden ${label}`)
  }
}

const themeDirs = fs.readdirSync(path.join(root, 'src/themes'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

for (const theme of themeDirs) {
  const tsxPath = path.join(root, 'src/themes', theme, fs.readdirSync(path.join(root, 'src/themes', theme)).find((name) => name.endsWith('.tsx')) || '')
  if (!tsxPath || !fs.existsSync(tsxPath)) continue
  const content = fs.readFileSync(tsxPath, 'utf8')
  if (!content.includes("openService('waiter')") && !content.includes('openService("waiter")')) {
    failures.push(`${theme}: waiter call action is missing`)
  }
  if (!content.includes("openService('valet')")) failures.push(`${theme}: valet action is missing`)
  if (!content.includes('openCart')) failures.push(`${theme}: cart action is missing`)
  if (!content.includes('openCheckout')) failures.push(`${theme}: table-order/checkout action is missing`)
}

if (failures.length) {
  console.error('PMD V2 PRODUCT CONTRACT AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('PMD V2 PRODUCT CONTRACT AUDIT: PASS (QR dine-in only; no phone-order or table-note UI)')
