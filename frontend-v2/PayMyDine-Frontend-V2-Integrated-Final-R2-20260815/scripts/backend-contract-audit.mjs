import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const assertFile = (file) => {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`)
}
const assertContains = (file, needles) => {
  assertFile(file)
  if (!fs.existsSync(path.join(root, file))) return
  const content = read(file)
  for (const needle of needles) {
    if (!content.includes(needle)) failures.push(`${file}: missing contract marker ${needle}`)
  }
}

assertContains('src/server/bootstrap.ts', [
  '/api/v1/settings',
  '/api/v1/restaurant',
  '/api/v1/menu',
  '/api/v1/frontend-theme-v2',
  '/simple-theme',
  '/api/v1/payments',
  '/api/v1/table-info',
  '/api/v1/table-order-draft',
  '/api/v1/vat-settings',
  '/api/v1/tip-settings',
])

assertContains('src/lib/client-api.ts', [
  '/api/v1/table-order-draft/confirm-items',
  '/api/v1/table-order-draft/submit',
  '/api/v1/waiter-call',
  '/api/v1/valet-request',
  '/validate-coupon',
  '/api/v1/orders/pay-existing',
  '/api/v1/orders/start-payment',
  '/api/v1/orders/finalize-payment',
  '/api/v1/payments/card/create-session',
  '/api/v1/payments/wero/create-session',
  '/api/v1/payments/worldline/wero/create-session',
  '/api/v1/payments/vr-payment/',
  '/api/v1/payments/worldline/checkout-status',
  '/api/v1/payments/sumup/checkout-status',
  '/api/v1/payments/square/checkout-status',
  '/api/v1/payments/vr-payment/return-status',
])

assertContains('src/runtime/components/PayPalButton.tsx', [
  '/api/v1/payments/config-public',
  '/api/v1/payments/paypal/create-order',
  '/api/v1/payments/paypal/capture-order',
  'payExistingOrder',
])

for (const file of [
  'app/api/v1/[...path]/route.ts',
  'app/api/v2/frontend-theme/route.ts',
  'app/api/media/[...path]/route.ts',
  'app/assets/media/[...path]/route.ts',
  'app/storage/[...path]/route.ts',
  'app/uploads/[...path]/route.ts',
  'app/settings/route.ts',
  'app/simple-theme/route.ts',
  'app/vat-settings/route.ts',
  'app/tip-settings/route.ts',
  'app/validate-coupon/route.ts',
  'app/payment/return/page.tsx',
]) assertFile(file)


for (const file of [
  'integration/laravel/pmd-frontend-v2-theme.php',
  'integration/admin/frontend-theme-fields-v2.php',
  'integration/laravel/install-v2-theme-bridge.sh',
]) assertFile(file)

const bootstrap = read('src/server/bootstrap.ts')
if (!/loadCustomerBootstrap/.test(bootstrap) || !/normalizeTheme\(/.test(bootstrap)) {
  failures.push('src/server/bootstrap.ts: server-side bootstrap/theme resolution is incomplete')
}

const proxy = read('src/server/proxy.ts')
for (const header of ['Host', 'X-Forwarded-Host', 'X-PMD-Tenant-Host']) {
  if (!proxy.includes(header)) failures.push(`src/server/proxy.ts: tenant header ${header} is not forwarded`)
}

const publicSource = ['app', 'src'].flatMap((dir) => {
  const walk = (current) => fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(current, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
  return walk(path.join(root, dir))
}).filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))

for (const file of publicSource) {
  const content = fs.readFileSync(file, 'utf8')
  if (/stripe[_A-Za-z]*secret|paypal[_A-Za-z]*secret|client_secret\s*[:=]/i.test(content)) {
    failures.push(`${path.relative(root, file)}: a secret-shaped public frontend field was found`)
  }
}

if (failures.length) {
  console.error('PMD V2 BACKEND CONTRACT AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('PMD V2 BACKEND CONTRACT AUDIT: PASS')
