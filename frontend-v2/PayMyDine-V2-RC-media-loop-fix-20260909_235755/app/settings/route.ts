import { proxyBackendRequest } from '@/src/server/proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handler(request: Request) {
  return proxyBackendRequest(request, '/api/v1/settings')
}

export { handler as GET, handler as HEAD }
