import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const notes = []

// These are expected in an installed working copy and must not make `npm run release:audit` fail.
// They remain forbidden from the source ZIP / release manifest.
const generatedDirectories = new Set(['node_modules', '.next', '.git', 'coverage', 'playwright-report', 'test-results'])
const privateWorkingFiles = new Set(['.env', '.env.local', '.env.production'])
const forbiddenArchivePatterns = [/\.pem$/i, /\.p12$/i, /\.pfx$/i, /id_rsa/i, /credentials?/i]

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    const relative = path.relative(root, full)

    if (entry.isDirectory()) {
      if (generatedDirectories.has(entry.name)) {
        notes.push(`ignored installed/generated directory: ${relative}`)
        continue
      }
      walk(full)
      continue
    }

    if (privateWorkingFiles.has(entry.name)) {
      notes.push(`ignored local environment file in working copy: ${relative}`)
      continue
    }

    if (forbiddenArchivePatterns.some((pattern) => pattern.test(entry.name))) {
      failures.push(`forbidden credential-like file: ${relative}`)
    }
  }
}

walk(root)

for (const required of [
  '.env.example',
  '.gitignore',
  'README.md',
  'RELEASE_MANIFEST.json',
  'docs/FINAL_RELEASE_REPORT.md',
  'docs/VALIDATION_REPORT.md',
  'integration/admin/theme-manifest.json',
  'integration/nginx/paymydine-frontend-v2-staging.conf.example',
  'integration/pm2/ecosystem.config.cjs',
]) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`missing release file: ${required}`)
}

const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8')
for (const ignored of ['node_modules', '.next', '.env.local']) {
  if (!gitignore.split(/\r?\n/).map((line) => line.trim()).includes(ignored)) {
    failures.push(`.gitignore must exclude ${ignored}`)
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'RELEASE_MANIFEST.json'), 'utf8'))
if (manifest.themeCount !== 10 || !Array.isArray(manifest.themes) || manifest.themes.length !== 10) {
  failures.push('RELEASE_MANIFEST.json does not describe exactly ten themes')
}
if (manifest.productionPortUntouched !== 3001 || manifest.defaultPort !== 3002) {
  failures.push('RELEASE_MANIFEST.json staging/production ports are not locked to 3002/3001')
}

if (failures.length) {
  console.error('PMD V2 RELEASE PACKAGE AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('PMD V2 RELEASE PACKAGE AUDIT: PASS')
notes.forEach((note) => console.log(`- ${note}`))
