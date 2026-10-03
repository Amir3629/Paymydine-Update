import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const scanRoots = ['app', 'src']
const allowedIntervalFile = path.normalize('src/runtime/MenuRuntimeContext.tsx')
const failures = []

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.name === 'node_modules' || entry.name === '.next') return []
    return entry.isDirectory() ? walk(full) : [full]
  })
}

for (const scanRoot of scanRoots) {
  for (const full of walk(path.join(root, scanRoot))) {
    if (!/\.(ts|tsx|js|jsx|css)$/.test(full)) continue
    const rel = path.normalize(path.relative(root, full))
    const content = fs.readFileSync(full, 'utf8')
    if (/MutationObserver/.test(content)) failures.push(`${rel}: MutationObserver is not allowed`)
    if (/style\.setProperty/.test(content)) failures.push(`${rel}: runtime style.setProperty is not allowed`)
    if (/dangerouslySetInnerHTML/.test(content)) failures.push(`${rel}: dangerouslySetInnerHTML is not allowed`)
    if (/<iframe|postMessage\s*\(/i.test(content)) failures.push(`${rel}: iframe/postMessage theme bridges are not allowed`)
    if (/setInterval\s*\(/.test(content) && rel !== allowedIntervalFile) {
      failures.push(`${rel}: setInterval is only allowed for the shared order-polling service`)
    }
  }
}

const nextConfig = fs.readFileSync(path.join(root, 'next.config.mjs'), 'utf8')
if (/ignoreBuildErrors\s*:\s*true/.test(nextConfig)) failures.push('next.config.mjs: TypeScript build errors are ignored')

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
if (!packageJson.scripts?.typecheck) failures.push('package.json: typecheck script missing')

if (failures.length) {
  console.error('PMD V2 SOURCE SAFETY AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('PMD V2 SOURCE SAFETY AUDIT: PASS')
