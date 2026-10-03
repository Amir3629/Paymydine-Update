function localeCookie(locale: string): string {
  const parts = [
    `pmd_locale=${encodeURIComponent(locale)}`,
    'Path=/',
    `Max-Age=${60 * 60 * 24 * 365}`,
    'SameSite=Lax',
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json().catch(() => ({}))
  const locale = String(payload?.locale || '').trim().toLowerCase()

  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(locale)) {
    return Response.json({ success: false, error: 'Invalid locale' }, { status: 422 })
  }

  return Response.json(
    { success: true, locale },
    { headers: { 'Set-Cookie': localeCookie(locale), 'Cache-Control': 'no-store' } },
  )
}
