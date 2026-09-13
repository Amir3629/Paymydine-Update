export const dynamic = 'force-dynamic'

export function GET(): Response {
  return Response.json(
    {
      success: true,
      service: 'paymydine-frontend-v2',
      version: '1.1.1-staging.20260815-integrated-r2',
      port: Number(process.env.PORT || 3002),
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
