import { NextRequest, NextResponse } from "next/server"

/**
 * PMD_KIOSK_LEGACY_ROOT_COMPAT_V6_1
 *
 * Older Device App builds opened the restaurant root with ?pmd_kiosk=1.
 * Rewrite those requests into the dedicated kiosk routes before the regular
 * customer homepage renders. The visible URL stays unchanged so the native
 * reset/payment bridge remains compatible.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next()
  }

  const isReset = request.nextUrl.searchParams.get("pmd_kiosk_reset") === "1"
  const isKiosk = request.nextUrl.searchParams.get("pmd_kiosk") === "1"

  if (!isReset && !isKiosk) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = isReset ? "/kiosk-reset" : "/kiosk"

  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ["/"],
}
