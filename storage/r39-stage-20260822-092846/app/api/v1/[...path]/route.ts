import { proxyBackendRequest, safeProxyPath } from '@/src/server/proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ path: string[] }> }

async function handler(request: Request, context: Context) {
  try {
    const { path } = await context.params
    const safe = safeProxyPath(path)
    return proxyBackendRequest(request, `/api/v1/${safe.map(encodeURIComponent).join('/')}`)
  } catch {
    return Response.json({ success: false, error: 'INVALID_PROXY_PATH' }, { status: 400 })
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as HEAD, handler as OPTIONS }
