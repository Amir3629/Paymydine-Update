import 'server-only'

import { getBackendOrigin } from '@/src/server/backend'

const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  'authorization',
  'content-type',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-csrf-token',
  'x-requested-with',
] as const

const FORWARDED_RESPONSE_HEADERS = [
  'cache-control',
  'content-disposition',
  'content-language',
  'content-type',
  'etag',
  'expires',
  'last-modified',
  'location',
  'pragma',
  'retry-after',
  'set-cookie',
  'vary',
] as const

function cleanHost(value: string | null): string {
  return String(value || process.env.PMD_PUBLIC_HOST || 'localhost')
    .split(',')[0]
    .trim()
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
}

function publicHost(request: Request): string {
  return cleanHost(
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    process.env.PMD_PUBLIC_HOST ||
    null,
  )
}

function tenantHost(request: Request): string {
  const trustHeader = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.PMD_TRUST_TENANT_OVERRIDE_HEADER || '').trim().toLowerCase(),
  )
  return cleanHost(
    process.env.PMD_TENANT_HOST_OVERRIDE ||
    (trustHeader ? request.headers.get('x-pmd-tenant-host') : null) ||
    publicHost(request),
  )
}

function publicOrigin(request: Request): string {
  const host = publicHost(request)
  const proto = String(request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '') || 'https')
    .split(',')[0]
    .trim()
  return `${proto || 'https'}://${host}`
}

function rewriteLocation(value: string, request: Request): string {
  if (!value) return value
  const backend = getBackendOrigin().replace(/\/$/, '')
  if (value.startsWith(backend)) return `${publicOrigin(request)}${value.slice(backend.length)}`
  return value
}

function requestHeaders(request: Request): Headers {
  const headers = new Headers()
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const host = tenantHost(request)
  headers.set('Host', host)
  headers.set('X-Forwarded-Host', host)
  headers.set('X-Forwarded-Proto', String(request.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim())
  headers.set('X-PMD-Tenant-Host', host)
  headers.set('X-PMD-Public-Host', publicHost(request))
  if (!headers.has('User-Agent')) headers.set('User-Agent', 'PayMyDine-Frontend-V2')
  return headers
}

function responseHeaders(source: Headers, request: Request): Headers {
  const headers = new Headers()
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    if (name === 'set-cookie') continue
    const value = source.get(name)
    if (!value) continue
    headers.set(name, name === 'location' ? rewriteLocation(value, request) : value)
  }

  const sourceWithCookies = source as Headers & { getSetCookie?: () => string[] }
  const cookies = typeof sourceWithCookies.getSetCookie === 'function'
    ? sourceWithCookies.getSetCookie()
    : source.get('set-cookie')
      ? [String(source.get('set-cookie'))]
      : []
  for (const cookie of cookies) headers.append('set-cookie', cookie)

  headers.set('x-content-type-options', 'nosniff')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  return headers
}

export function safeProxyPath(parts: string[]): string[] {
  const safe = parts.map((part) => String(part || '').trim())
  if (safe.some((part) => !part || part === '.' || part === '..' || part.includes('\0'))) {
    throw new Error('INVALID_PROXY_PATH')
  }
  return safe
}

export async function proxyBackendRequest(request: Request, backendPath: string): Promise<Response> {
  const incoming = new URL(request.url)
  const target = new URL(backendPath, `${getBackendOrigin().replace(/\/$/, '')}/`)
  target.search = incoming.search

  const method = request.method.toUpperCase()
  const body = ['GET', 'HEAD'].includes(method) ? undefined : await request.arrayBuffer()

  let response: Response
  try {
    response = await fetch(target, {
      method,
      body,
      headers: requestHeaders(request),
      redirect: 'manual',
      cache: 'no-store',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backend request failed'
    return Response.json(
      { success: false, error: 'PAYMYDINE_BACKEND_UNAVAILABLE', message },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders(response.headers, request),
  })
}
