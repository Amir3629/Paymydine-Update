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
const runtimeFiles = ['app', 'src'].flatMap((dir) => walk(path.join(root, dir))).filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
const phoneOrderPattern = /callRestaurant|call to order|Telefonisch bestellen|Telefonla sipariş|電話で注文|سفارش تلفنی|href=\{?`tel:/i
for (const file of runtimeFiles) {
  const content = fs.readFileSync(file, 'utf8')
  if (phoneOrderPattern.test(content)) failures.push(`${path.relative(root, file)}: forbidden phone-order UI`)
}
const toolbarPath = path.join(root, 'src/runtime/components/ThemeBottomToolBar.tsx')
const toolbar = fs.existsSync(toolbarPath) ? fs.readFileSync(toolbarPath, 'utf8') : ''
for (const token of ["openService('waiter')", "openService('note')", "openService('valet')", 'openCheckout()', 'openCart()', 'data-pmd-unified-bottom-bar="r14"']) {
  if (!toolbar.includes(token)) failures.push(`ThemeBottomToolBar missing ${token}`)
}
const client = fs.readFileSync(path.join(root, 'src/lib/client-api.ts'), 'utf8')
if (!client.includes("jsonRequest('/api/v1/table-notes'")) failures.push('table-note client endpoint missing')
const runtime = fs.readFileSync(path.join(root, 'src/runtime/MenuRuntimeContext.tsx'), 'utf8')
if (!runtime.includes("ServiceMode = 'waiter' | 'valet' | 'note'")) failures.push('runtime note service mode missing')

const themeRoot = path.join(root, 'src/themes')
const themeDirs = fs.readdirSync(themeRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
if (themeDirs.length !== 10) failures.push(`expected 10 themes, found ${themeDirs.length}`)
for (const theme of themeDirs) {
  const dir = path.join(themeRoot, theme)
  const tsxName = fs.readdirSync(dir).find((name) => name.endsWith('.tsx'))
  if (!tsxName) { failures.push(`${theme}: component missing`); continue }
  const content = fs.readFileSync(path.join(dir, tsxName), 'utf8')
  if (!content.includes('ThemeBottomToolBar')) failures.push(`${theme}: unified bottom bar missing`)
  if ((content.match(/<ThemeBottomToolBar /g) || []).length !== 1) failures.push(`${theme}: unified bottom bar must appear exactly once`)
  for (const direct of ['openCart()', 'openCheckout()', "openService('waiter')", "openService('valet')", "openService('note')"]) {
    if (content.includes(direct)) failures.push(`${theme}: direct action ${direct} must live in shared bottom bar`)
  }
}
if (failures.length) {
  console.error('PMD V2 PRODUCT CONTRACT AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log('PMD V2 PRODUCT CONTRACT AUDIT: PASS (QR dine-in; unified waiter/note/valet/table-order/cart bottom bar; no phone-order UI)')
