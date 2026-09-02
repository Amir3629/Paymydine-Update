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
expect(component, 'guestSessionId', 'guest-private chat identity')
expect(component, "table_id: String(tableId)", 'history table identity')
expect(component, 'requestBody.table_id = tableId', 'ask table identity')
expect(component, 'requestBody.guest_session_id = guestSessionId', 'ask guest identity')
expect(component, '/api/v1/guest-ai/history?', 'saved chat hydration')
expect(component, 'tableOrderRevision', 'shared table-poll visit reset bridge')
expect(component, 'tableOrders.map', 'shared order state fingerprint')
reject(component, 'setInterval(', 'no second Guest AI polling timer')
expect(component, 'pmd-v2:guest-ai-chat:', 'same-device persistence fallback')
expect(component, 'window.localStorage.setItem', 'local fallback write')
expect(component, 'clearLocalSnapshot(localKey)', 'staff-free fallback reset')
expect(component, 'Never erase an already-visible/local transcript', 'empty-history wipe regression guard')
expect(component, "payload.storage_ready === false", 'storage readiness handshake')
expect(component, 'messages.map', 'multi-turn chat rendering')
expect(component, 'role="log"', 'chat-room transcript semantics')
expect(component, "message.locale !== 'auto'", 'auto-language accessibility handling')
expect(component, "data-pmd-guest-ai=\"v2\"", 'surface fingerprint')
expect(component, "payload.surface === 'frontend_v2'", 'backend surface handshake')
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
const conversationStore = fs.readFileSync(path.resolve(repo, 'app/Services/AI/GuestAiConversationStore.php'), 'utf8')
const momentService = fs.readFileSync(path.resolve(repo, 'app/Services/AI/GuestMenuMomentContext.php'), 'utf8')
const clockService = fs.readFileSync(path.resolve(repo, 'app/Services/Platform/LocationClockStateService.php'), 'utf8')
const popularityService = fs.readFileSync(path.resolve(repo, 'app/Services/MenuPopularityService.php'), 'utf8')
const config = fs.readFileSync(path.resolve(repo, 'config/pmd_ai.php'), 'utf8')

expect(backendRoute, "'location_id' => 'required|integer|min:1'", 'API location gate')
expect(backendRoute, "Route::get('/guest-ai/history'", 'saved chat history endpoint')
expect(backendRoute, "'guest_session_id' => 'required|string|min:8|max:100'", 'history guest identity validation')
expect(backendRoute, 'GuestAiConversationStore', 'chat persistence authority')
expect(backendRoute, 'PMD_PREVIOUS:', 'compact follow-up context')
expect(backendRoute, "'persisted' => $persisted", 'persistence response contract')
expect(backendRoute, "'storage_ready' =>", 'storage readiness response contract')
expect(backendRoute, "'surface' => 'frontend_v2'", 'API surface fingerprint')
expect(backendRoute, "'auto'", 'open-ended response language mode')
expect(backendRoute, 'Reply in the language the guest is using or explicitly requests', 'any-language response policy')
expect(backendRoute, 'cuisine name alone is not a language request', 'cuisine-vs-language regression rule')
expect(backendRoute, 'GuestMenuMomentContext', 'restaurant-now context')
expect(backendRoute, 'PMD_NOW:', 'restaurant-now prompt handoff')
expect(backendRoute, 'Inactive mealtime is not sold out', 'time-vs-stock distinction')
expect(backendRoute, 'PMD AI Fixture', 'internal fixture response guard')
expect(backendRoute, 'never invent restaurant atmosphere', 'unsupported occasion claim guard')
reject(backendRoute, 'Reply entirely in {$language}', 'finite forced-language regression')
expect(backendRoute, "'response_locale' => $responseLocale", 'response locale contract')

expect(conversationStore, "private const TABLE = 'pmd_guest_ai_conversations'", 'dedicated guest chat storage')
expect(conversationStore, "where('reason', 'cashier_manual_free')", 'staff-free visit boundary')
expect(conversationStore, "hash('sha256', trim($guestSessionId))", 'guest id hashing')
expect(conversationStore, 'MAX_MESSAGES = 200', 'bounded saved chat')
expect(conversationStore, 'COMPAT_EXPIRES_HOURS = 87600', 'non-authoritative schema expiry compatibility')
expect(conversationStore, 'purgeOlderVisits', 'staff-free visit cleanup')
expect(conversationStore, "->where('visit_key', '!=', $visitKey)", 'old visit purge')
expect(conversationStore, "'storage_ready' => false", 'explicit storage failure contract')
reject(conversationStore, "orWhere('expires_at'", 'time expiry must not end an active table visit')
reject(conversationStore, 'ip_address', 'no IP persistence in guest chat')
reject(conversationStore, 'provider_response', 'no provider payload persistence')

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
expect(config, "env('PMD_AI_GUEST_MAX_QUESTION_CHARS', 1200)", 'internal follow-up context budget')
expect(config, "env('PMD_AI_GUEST_MAX_OUTPUT_TOKENS', 1400)", 'complete-answer output budget')
expect(config, "env('PMD_AI_GUEST_MAX_ANSWER_CHARS', 3200)", 'complete-answer display budget')

console.log('PMD Guest AI V2 contract audit: PASS')
