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
expect(component, "location_id: locationId", 'ask location payload')
expect(component, 'requestBody.table_id = tableId', 'ask table identity')
expect(component, 'requestBody.guest_session_id = guestSessionId', 'ask guest identity')
expect(component, '/api/v1/guest-ai/history?', 'saved chat hydration')
expect(component, 'pmd-v2:guest-ai-chat:', 'same-device fallback')
expect(component, 'tableOrderRevision', 'shared table-poll visit reset bridge')
reject(component, 'setInterval(', 'no second Guest AI polling timer')
expect(component, 'normalizeActionIds', 'server action-id validation')
expect(component, "id === 'call_waiter'", 'waiter action mapping')
expect(component, "id === 'view_cart'", 'cart action mapping')
expect(component, "id === 'checkout'", 'checkout action mapping')
expect(component, 'await callWaiter()', 'existing waiter authority reuse')
expect(component, 'openCart()', 'existing cart authority reuse')
expect(component, 'openCheckout()', 'existing checkout authority reuse')
expect(component, 'bootstrap.features.waiterCall', 'waiter feature gate')
expect(component, 'messages.map', 'multi-turn chat rendering')
expect(component, 'role="log"', 'chat-room semantics')
expect(component, "data-pmd-guest-ai=\"v2\"", 'surface fingerprint')
expect(component, "payload.surface === 'frontend_v2'", 'backend surface handshake')
expect(rootPage, 'GuestAiConcierge', 'root menu mount')
expect(tablePage, 'GuestAiConcierge', 'table menu mount')
expect(css, 'var(--pmd-accent', 'theme token usage')
expect(css, '.actionButton', 'contextual action styling')
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
const config = fs.readFileSync(path.resolve(repo, 'config/pmd_ai.php'), 'utf8')

expect(backendRoute, "'location_id' => 'required|integer|min:1'", 'API location gate')
expect(backendRoute, "Route::get('/guest-ai/history'", 'saved chat history endpoint')
expect(backendRoute, 'pmd_guest_ai_extract_actions_20260904', 'server action parser')
expect(backendRoute, '[[PMD_ACTION:call_waiter]]', 'waiter marker contract')
expect(backendRoute, '[[PMD_ACTION:view_cart]]', 'cart marker contract')
expect(backendRoute, '[[PMD_ACTION:checkout]]', 'checkout marker contract')
expect(backendRoute, "$allowed = ['call_waiter', 'view_cart', 'checkout']", 'closed guest action allowlist')
expect(backendRoute, "'actions' => $actions", 'guest action response contract')
reject(backendRoute, 'PMD_ACTION:http', 'no model URL action')
expect(backendRoute, "'surface' => 'frontend_v2'", 'API surface fingerprint')
expect(backendService, 'guest_location_allowlist', 'location allowlist')
expect(backendService, 'RateLimiter', 'atomic rate limiter')
expect(backendService, 'looksLikePromptExtraction', 'prompt guard')
expect(backendService, 'is_stock_out', 'sold-out reconciliation')
expect(backendService, 'Allergy safety is strict', 'allergy contract')
reject(backendService, 'PmdReadAuthority', 'guest/admin isolation')
reject(backendService, 'PmdKitchenWorkforceService', 'guest/workforce isolation')
expect(conversationStore, "private const TABLE = 'pmd_guest_ai_conversations'", 'dedicated guest chat storage')
expect(conversationStore, "where('reason', 'cashier_manual_free')", 'staff-free visit boundary')
expect(conversationStore, "hash('sha256', trim($guestSessionId))", 'guest id hashing')
expect(conversationStore, 'MAX_MESSAGES = 200', 'bounded table-visit chat')
reject(conversationStore, 'ip_address', 'no IP in guest chat persistence')
reject(conversationStore, 'provider_response', 'no provider payload in guest chat persistence')
expect(config, "env('PMD_AI_GUEST_ENABLED', false)", 'fail-closed config')
expect(config, "env('PMD_AI_GUEST_TENANT_ALLOWLIST', '')", 'tenant canary')
expect(config, "env('PMD_AI_GUEST_LOCATION_ALLOWLIST', '')", 'location canary')
expect(config, "env('PMD_AI_GUEST_ALLOW_WILDCARD', false)", 'wildcard disabled')

console.log('PMD Guest AI V2 contract audit: PASS')
