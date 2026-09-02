import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.resolve(root, '../..')

function read(relative) {
  const full = path.resolve(root, relative)
  if (!fs.existsSync(full)) throw new Error(`Missing required file: ${relative}`)
  return fs.readFileSync(full, 'utf8')
}

function expect(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`${label}: missing ${needle}`)
}

function reject(source, needle, label) {
  if (source.includes(needle)) throw new Error(`${label}: forbidden ${needle}`)
}

const component = read('src/runtime/components/GuestAiConcierge.tsx')
const css = read('src/runtime/components/GuestAiConcierge.module.css')
const rootPage = read('app/page.tsx')
const tablePage = read('app/table/[tableId]/page.tsx')
const catalog = read('src/themes/catalog.ts')

expect(component, 'bootstrap.table.locationId', 'location authority')
expect(component, "location_id: locationId", 'ask location payload')
expect(component, "data-pmd-guest-ai=\"v2\"", 'surface fingerprint')
expect(component, "payload.surface === 'frontend_v2'", 'backend surface handshake')
expect(component, 'response_locale', 'response locale handshake')
expect(component, "answerLocale !== 'auto'", 'auto-language accessibility handling')
expect(component, 'textDirection', 'mixed-language message direction')
expect(component, 'responseDirection', 'assistant response direction')
expect(rootPage, 'GuestAiConcierge', 'root menu mount')
expect(tablePage, 'GuestAiConcierge', 'table menu mount')
expect(css, 'var(--pmd-accent', 'theme token usage')
expect(css, 'unicode-bidi: plaintext', 'mixed-script bidi safety')
expect(css, '@media (max-width: 680px)', 'mobile regression guard')
expect(css, 'env(safe-area-inset-bottom', 'mobile safe-area guard')
expect(css, 'prefers-reduced-motion', 'motion accessibility guard')

const expectedThemes = [
  'noir_editorial',
  'verdant_modern',
  'lumiere_fine_dining',
  'kazen_japanese',
  'azzurra_coastal',
  'neon_cocktail_bar',
  'art_deco_speakeasy',
  'shahrazad_persian',
  'anatolia_turkish',
  'ember_steakhouse',
]
for (const theme of expectedThemes) expect(catalog, theme, '10-theme catalog')

const legacyLayout = path.resolve(repo, 'frontend/app/clientLayout.tsx')
if (fs.existsSync(legacyLayout)) {
  reject(fs.readFileSync(legacyLayout, 'utf8'), 'GuestAiConcierge', 'single frontend authority')
}

const backendRoute = fs.readFileSync(path.resolve(repo, 'app/main/routes/api-v1-guest-ai.php'), 'utf8')
const backendService = fs.readFileSync(path.resolve(repo, 'app/Services/AI/GuestMenuAiService.php'), 'utf8')
const momentService = fs.readFileSync(path.resolve(repo, 'app/Services/AI/GuestMenuMomentContext.php'), 'utf8')
const clockService = fs.readFileSync(path.resolve(repo, 'app/Services/Platform/LocationClockStateService.php'), 'utf8')
const popularityService = fs.readFileSync(path.resolve(repo, 'app/Services/MenuPopularityService.php'), 'utf8')
const config = fs.readFileSync(path.resolve(repo, 'config/pmd_ai.php'), 'utf8')

expect(backendRoute, "'location_id' => 'required|integer|min:1'", 'API location gate')
expect(backendRoute, "'surface' => 'frontend_v2'", 'API surface fingerprint')
expect(backendRoute, "const", 'route remains PHP source')
expect(backendRoute, "'auto'", 'open-ended response language mode')
expect(backendRoute, 'reply in the language the guest is using or explicitly asks for', 'any-language response policy')
expect(backendRoute, 'A cuisine name alone is not a language request', 'cuisine-vs-language regression rule')
expect(backendRoute, 'GuestMenuMomentContext', 'restaurant-now context')
expect(backendRoute, 'PMD_NOW:', 'restaurant-now prompt handoff')
expect(backendRoute, 'inactive mealtime is not sold out', 'time-vs-stock distinction')
reject(backendRoute, 'Reply entirely in {$language}', 'finite forced-language regression')
expect(backendRoute, "'response_locale' => $responseLocale", 'response locale contract')

expect(momentService, 'LocationClockStateService', 'canonical restaurant clock authority')
expect(momentService, 'Mealtimes_model', 'canonical mealtime authority')
expect(momentService, 'orderable_now=', 'current orderability projection')
expect(momentService, 'whereHasOrDoesntHaveLocation', 'moment location boundary')
expect(momentService, 'isActiveWindow', 'mealtime window evaluation')
expect(clockService, 'state(?int $requestedLocationId = null)', 'explicit clock location support')
expect(clockService, 'Locations_model::query()->find', 'clock explicit location resolver')

expect(backendService, 'guest_location_allowlist', 'location allowlist')
expect(backendService, 'RateLimiter', 'atomic rate limiter')
expect(backendService, 'looksLikePromptExtraction', 'prompt guard')
expect(backendService, 'is_stock_out', 'sold-out reconciliation')
expect(backendService, 'Allergy safety is strict', 'allergy contract')
expect(backendService, 'POPULARITY RULE:', 'measured popularity prompt contract')
expect(backendService, 'CUISINE SIMILARITY RULE:', 'cuisine comparison prompt contract')
expect(backendService, 'attachPopularityForLocation', 'location popularity projection')
expect(backendService, "'popularity_rank'", 'popularity rank model context')
expect(backendService, "'top_items' => $popularity['top_items']", 'salient popularity summary')
expect(popularityService, '?int $locationId = null', 'popularity location parameter')
expect(popularityService, "$query->where('o.location_id', $locationId)", 'popularity location boundary')
expect(popularityService, "['paid', 'settled']", 'settled popularity authority')
expect(popularityService, "where('o.processed', 1)", 'processed popularity authority')
reject(backendService, 'PmdReadAuthority', 'guest/admin isolation')
reject(backendService, 'PmdKitchenWorkforceService', 'guest/workforce isolation')
expect(config, "env('PMD_AI_GUEST_ENABLED', false)", 'fail-closed config')
expect(config, "env('PMD_AI_GUEST_TENANT_ALLOWLIST', '')", 'tenant canary')
expect(config, "env('PMD_AI_GUEST_LOCATION_ALLOWLIST', '')", 'location canary')
expect(config, "env('PMD_AI_GUEST_ALLOW_WILDCARD', false)", 'wildcard disabled')
expect(config, "env('PMD_AI_GUEST_MAX_OUTPUT_TOKENS', 1400)", 'complete-answer output budget')
expect(config, "env('PMD_AI_GUEST_MAX_ANSWER_CHARS', 3200)", 'complete-answer display budget')

console.log('PMD Guest AI V2 contract audit: PASS')
