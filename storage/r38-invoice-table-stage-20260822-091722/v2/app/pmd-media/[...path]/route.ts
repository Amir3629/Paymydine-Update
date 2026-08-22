import { proxyBackendRequest, safeProxyPath } from '@/src/server/proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params
    const safe = safeProxyPath(path)
    const backendPath = `/${safe.map(encodeURIComponent).join('/')}`
    return proxyBackendRequest(request, backendPath)
  } catch {
    return Response.json({ success: false, error: 'INVALID_MEDIA_PATH' }, { status: 400 })
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context)
}

export async function HEAD(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return handle(request, context)
}
