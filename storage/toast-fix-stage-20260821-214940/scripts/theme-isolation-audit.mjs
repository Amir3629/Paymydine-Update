import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const themesRoot = path.join(root, 'src', 'themes')
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

const forbidden = [
  ['!important', /!important/],
  ['MutationObserver', /MutationObserver/],
  ['style.setProperty', /style\.setProperty/],
  ['iframe', /<iframe|\biframe\b/i],
  ['postMessage', /postMessage/],
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
]

const failures = []
for (const themeId of themeIds) {
  const dir = path.join(themesRoot, themeId)
  if (!fs.existsSync(dir)) {
    failures.push(`${themeId}: directory missing`)
    continue
  }
  const files = fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isFile())
  const tsx = files.filter((name) => name.endsWith('.tsx'))
  const css = files.filter((name) => name.endsWith('.module.css'))
  if (tsx.length !== 1) failures.push(`${themeId}: expected exactly one TSX entry, found ${tsx.length}`)
  if (css.length !== 1) failures.push(`${themeId}: expected exactly one CSS Module, found ${css.length}`)

  for (const name of [...tsx, ...css]) {
    const full = path.join(dir, name)
    const content = fs.readFileSync(full, 'utf8')
    for (const [label, regex] of forbidden) {
      if (regex.test(content)) failures.push(`${themeId}/${name}: forbidden ${label}`)
    }
    const importMatches = content.matchAll(/from\s+['"]@\/src\/themes\/([^/'"]+)/g)
    for (const match of importMatches) {
      if (match[1] !== themeId && match[1] !== 'shared') {
        failures.push(`${themeId}/${name}: imports another theme (${match[1]})`)
      }
    }
  }
}

const globalCss = fs.readFileSync(path.join(root, 'app', 'globals.css'), 'utf8')
if (/data-theme|noir|verdant|lumiere|kazen|azzurra|neon|deco|shahrazad|anatolia|ember/i.test(globalCss)) {
  failures.push('app/globals.css contains theme-specific selectors or names')
}

if (failures.length) {
  console.error('PMD V2 THEME ISOLATION AUDIT: FAILED')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`PMD V2 THEME ISOLATION AUDIT: PASS (${themeIds.length} isolated themes)`)
