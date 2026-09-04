import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.resolve(root, '../..')

const targets = [
  path.join(root, 'src/runtime/components/GuestAiConcierge.tsx'),
  path.join(root, 'src/runtime/components/GuestAiConcierge.module.css'),
  path.join(repo, 'app/admin/assets/js/pmd-intelligence-v1.js'),
]

const forbidden = [
  ['MutationObserver', /MutationObserver/],
  ['runtime style mutation', /style\.setProperty/],
  ['dangerous HTML injection', /dangerouslySetInnerHTML/],
  ['iframe bridge', /<iframe/i],
  ['postMessage bridge', /postMessage\s*\(/],
  ['second polling timer', /setInterval\s*\(/],
]

const failures = []
for (const file of targets) {
  if (!fs.existsSync(file)) {
    failures.push(`${path.relative(repo, file)}: missing`)
    continue
  }
  const content = fs.readFileSync(file, 'utf8')
  for (const [label, pattern] of forbidden) {
    if (pattern.test(content)) failures.push(`${path.relative(repo, file)}: ${label} is not allowed in this Intelligence delta`)
  }
}

if (failures.length) {
  console.error('PMD Intelligence delta source-safety audit: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('PMD Intelligence delta source-safety audit: PASS')
console.log('Note: the repository-wide V2 source audit currently reports pre-existing Worldline/gallery/fallback debt on base main; this delta gate does not baseline or modify it.')
