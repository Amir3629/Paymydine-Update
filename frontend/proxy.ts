import { NextRequest, NextResponse } from "next/server"

/**
 * PMD_KIOSK_LEGACY_ROOT_COMPAT_V5
 *
 * Device App V4 opened the restaurant root with ?pmd_kiosk=1 and used the
 * normal customer menu. Keep those installed devices compatible by rewriting
 * the root request to the dedicated kiosk routes before the customer homepage
 * renders. The visible URL stays unchanged so the native V4 reset/bridge logic
 * continues to work.
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
