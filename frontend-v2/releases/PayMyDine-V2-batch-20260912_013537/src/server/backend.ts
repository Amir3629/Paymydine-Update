import 'server-only'

type FetchJsonOptions = {
  host: string
  timeoutMs?: number
  cache?: RequestCache
}

function cleanHost(host: string): string {
  return String(host || 'localhost').replace(/^https?:\/\//, '').split('/')[0]
}

export function getBackendOrigin(host?: string): string {
  const configured = String(process.env.PMD_BACKEND_ORIGIN || 'auto').trim()
  if (configured && !['auto', 'tenant', 'same-host'].includes(configured.toLowerCase())) {
    return configured.replace(/\/$/, '')
  }

  const tenant = cleanHost(
    host || process.env.PMD_TENANT_HOST_OVERRIDE || process.env.PMD_PUBLIC_HOST || 'localhost',
  ).replace(/:\d+$/, '')
  return `https://${tenant}`
}

export async function fetchBackendJson<T = unknown>(
  path: string,
  { host, timeoutMs = 8000, cache = 'no-store' }: FetchJsonOptions,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const tenantHost = cleanHost(host)
  const url = `${getBackendOrigin(tenantHost)}${path.startsWith('/') ? path : `/${path}`}`

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Host: tenantHost,
        'X-Forwarded-Host': tenantHost,
        'X-PMD-Tenant-Host': tenantHost,
      },
      cache,
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Backend HTTP ${response.status} for ${path}: ${body.slice(0, 240)}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchBackendJsonOrNull<T = unknown>(
  path: string,
  options: FetchJsonOptions,
): Promise<T | null> {
  try {
    return await fetchBackendJson<T>(path, options)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[PMD V2] Optional backend request failed: ${path}`, error)
    }
    return null
  }
}

// PMD_BOOTSTRAP_SINGLE_FLIGHT_V1
// Coalesce only overlapping identical server-side JSON work. No settled result
// is retained: after the underlying request settles, the key is removed, so the
// next request still performs a fresh backend read.
const backendJsonInFlight = new Map<string, Promise<unknown>>()

// PMD_BOOTSTRAP_BATCH_R1
// Stable tenant-wide bootstrap reads can be served by one already-booted PHP
// request. This is not a TTL cache: the batch promise exists only while the
// request is in flight and is deleted immediately after it settles.
type BootstrapBatchResponse = {
  success?: boolean
  data?: Record<string, unknown>
  status?: Record<string, number>
}

const bootstrapBatchKeyByPath: Record<string, string> = {
  '/api/v1/settings': 'settings',
  '/api/v1/restaurant': 'restaurant',
  '/api/v1/menu': 'menu',
  '/api/v1/categories': 'categories',
  '/api/v1/menu-content-translations': 'menuTranslations',
  '/api/v1/frontend-theme-v2': 'theme',
  '/api/v1/payments': 'payments',
  '/api/v1/vat-settings': 'vatSettings',
  '/api/v1/tip-settings': 'tipSettings',
}

const bootstrapBatchInFlight = new Map<string, Promise<BootstrapBatchResponse | null>>()

async function fetchBootstrapBatchOrNull(
  options: FetchJsonOptions,
): Promise<BootstrapBatchResponse | null> {
  const tenantHost = cleanHost(options.host)
  const key = [
    getBackendOrigin(tenantHost),
    tenantHost,
    String(options.timeoutMs ?? 8000),
    String(options.cache ?? 'no-store'),
  ].join('\n')

  const existing = bootstrapBatchInFlight.get(key)
  if (existing) return await existing

  const request = fetchBackendJsonOrNull<BootstrapBatchResponse>(
    '/api/v1/frontend-bootstrap-batch-r1',
    options,
  )
  bootstrapBatchInFlight.set(key, request)

  try {
    return await request
  } finally {
    if (bootstrapBatchInFlight.get(key) === request) {
      bootstrapBatchInFlight.delete(key)
    }
  }
}

export async function fetchBackendJsonOrNullSingleFlight<T = unknown>(
  path: string,
  options: FetchJsonOptions,
): Promise<T | null> {
  const batchKey = bootstrapBatchKeyByPath[path]
  if (batchKey) {
    const batch = await fetchBootstrapBatchOrNull(options)
    const status = Number(batch?.status?.[batchKey] ?? 0)
    const hasBatchValue = Boolean(batch?.data && Object.prototype.hasOwnProperty.call(batch.data, batchKey))

    if (batch?.success === true && hasBatchValue && status >= 200 && status < 300) {
      return (batch?.data?.[batchKey] ?? null) as T | null
    }

    // A real non-2xx from inside the batch means the canonical endpoint itself
    // failed. Preserve the old optional-null behavior without immediately doing
    // the same PHP work twice. Existing VAT/theme fallbacks still run upstream.
    if (batch?.success === true && hasBatchValue && status > 0) {
      return null
    }
    // If the new batch endpoint is absent/malformed, fall through to the proven
    // per-endpoint path. This makes rollout and rollback backward-compatible.
  }

  const tenantHost = cleanHost(options.host)
  const key = [
    getBackendOrigin(tenantHost),
    tenantHost,
    path,
    String(options.timeoutMs ?? 8000),
    String(options.cache ?? 'no-store'),
  ].join('\n')

  const existing = backendJsonInFlight.get(key)
  if (existing) return (await existing) as T | null

  const request = fetchBackendJsonOrNull<T>(path, options)
  const sharedRequest: Promise<unknown> = request
  backendJsonInFlight.set(key, sharedRequest)

  try {
    return await request
  } finally {
    if (backendJsonInFlight.get(key) === sharedRequest) {
      backendJsonInFlight.delete(key)
    }
  }
}
