import { proxyBackendRequest } from '@/src/server/proxy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  return proxyBackendRequest(request, '/api/v1/frontend-theme-v2')
}
