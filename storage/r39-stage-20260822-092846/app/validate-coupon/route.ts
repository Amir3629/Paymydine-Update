import { proxyBackendRequest } from '@/src/server/proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handler(request: Request) {
  return proxyBackendRequest(request, '/validate-coupon')
}

export { handler as GET, handler as POST, handler as HEAD, handler as OPTIONS }
