import 'server-only'

type FetchJsonOptions = {
  host: string
  timeoutMs?: number
  cache?: RequestCache
}

function cleanHost(host: string): string {
  return String(host || 'localhost').replace(/^https?:\/\//, '').split('/')[0]
}

export function getBackendOrigin(): string {
  return String(process.env.PMD_BACKEND_ORIGIN || 'http://127.0.0.1:8000').replace(/\/$/, '')
}

export async function fetchBackendJson<T = unknown>(
  path: string,
  { host, timeoutMs = 8000, cache = 'no-store' }: FetchJsonOptions,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const tenantHost = cleanHost(host)
  const url = `${getBackendOrigin()}${path.startsWith('/') ? path : `/${path}`}`

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
