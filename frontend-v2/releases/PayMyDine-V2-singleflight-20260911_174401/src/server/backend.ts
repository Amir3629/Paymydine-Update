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

// PMD_BOOTSTRAP_SINGLE_FLIGHT_RC_V8
// Coalesce only overlapping identical server-side JSON work.
// No settled result is retained: after the request settles, the key is removed.
const backendJsonInFlight = new Map<string, Promise<unknown>>()

export async function fetchBackendJsonOrNullSingleFlight<T = unknown>(
  path: string,
  options: FetchJsonOptions,
): Promise<T | null> {
  const tenantHost = cleanHost(options.host)
  const key = [
    getBackendOrigin(tenantHost),
    tenantHost,
    path,
    String(options.timeoutMs ?? 8000),
    String(options.cache ?? 'no-store'),
  ].join('\\n')

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

