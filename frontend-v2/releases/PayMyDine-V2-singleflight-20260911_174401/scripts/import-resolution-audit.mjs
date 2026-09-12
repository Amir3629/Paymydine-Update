import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourceRoots = ['app', 'src']
const sourceFiles = []
const failures = []
const extensions = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.jsx',
]

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(ts|tsx|mjs|cjs)$/.test(entry.name)) sourceFiles.push(full)
  }
}

for (const sourceRoot of sourceRoots) walk(path.join(root, sourceRoot))

const importPattern = /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/g

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8')
  let match
  while ((match = importPattern.exec(content))) {
    const specifier = match[1]
    if (!specifier.startsWith('@/') && !specifier.startsWith('./') && !specifier.startsWith('../')) continue

    const base = specifier.startsWith('@/')
      ? path.join(root, specifier.slice(2))
      : path.resolve(path.dirname(file), specifier)

    if (!extensions.some((extension) => fs.existsSync(`${base}${extension}`))) {
      failures.push(`${path.relative(root, file)} -> ${specifier}`)
    }
  }
}

if (failures.length) {
  console.error('PMD V2 IMPORT RESOLUTION AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`PMD V2 IMPORT RESOLUTION AUDIT: PASS (${sourceFiles.length} source files)`)
