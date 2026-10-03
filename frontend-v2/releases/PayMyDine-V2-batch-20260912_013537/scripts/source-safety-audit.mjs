import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const scanRoots = ['app', 'src']
const allowedIntervalFile = path.normalize('src/runtime/MenuRuntimeContext.tsx')

// Progressive retirement baseline: RuntimeOverlays still has one behavior-bound
// smart image-pan style mutation inherited from R73. Keep exactly that one until
// its dedicated visual regression replacement lands; any second occurrence or
// any occurrence in another V2 file fails CI. ThemeTableBadge was removed from
// this baseline in PR #212 and is now CSS-owned.
const runtimeStyleBaseline = new Map([
  [path.normalize('src/runtime/components/RuntimeOverlays.tsx'), 1],
])

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

    const styleMutations = content.match(/style\.setProperty/g)?.length ?? 0
    const baselineCount = runtimeStyleBaseline.get(rel) ?? 0
    if (styleMutations !== baselineCount) {
      if (styleMutations > baselineCount) {
        failures.push(`${rel}: runtime style.setProperty count ${styleMutations} exceeds baseline ${baselineCount}`)
      } else if (baselineCount > 0) {
        failures.push(`${rel}: style repair baseline changed; remove/update the baseline intentionally`)
      }
    }

    if (/dangerouslySetInnerHTML/.test(content)) failures.push(`${rel}: dangerouslySetInnerHTML is not allowed`)
    if (/<iframe|postMessage\s*\(/i.test(content)) failures.push(`${rel}: iframe/postMessage theme bridges are not allowed`)
    if (/setInterval\s*\(/.test(content) && rel !== allowedIntervalFile) {
      failures.push(`${rel}: setInterval is only allowed for the shared order-polling service`)
    }
  }
}

for (const [rel, expected] of runtimeStyleBaseline) {
  const full = path.join(root, rel)
  if (!fs.existsSync(full)) {
    failures.push(`${rel}: style repair baseline references a missing file`)
    continue
  }
  const actual = fs.readFileSync(full, 'utf8').match(/style\.setProperty/g)?.length ?? 0
  if (actual !== expected) {
    failures.push(`${rel}: expected ${expected} baseline style mutation(s), found ${actual}`)
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
console.log('Runtime style repair baseline: 1 known occurrence (RuntimeOverlays smart image pan)')
