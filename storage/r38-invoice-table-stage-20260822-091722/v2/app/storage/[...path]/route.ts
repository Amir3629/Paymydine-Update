import { proxyBackendRequest, safeProxyPath } from '@/src/server/proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params
    const safe = safeProxyPath(path)
    return proxyBackendRequest(request, `/storage/${safe.map(encodeURIComponent).join('/')}`)
  } catch {
    return Response.json({ success: false, error: 'INVALID_PROXY_PATH' }, { status: 400 })
  }
}

export { GET as HEAD }
