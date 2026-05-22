import { NextRequest, NextResponse } from "next/server"

function normalizeMediaUrl(value: unknown, host: string): string {
  const raw = String(value ?? "").trim()
  if (!raw) return ""

  if (/^https?:\/\//i.test(raw)) return raw

  const cleanHost = host.replace(/^www\./, "")
  const tenantHost = cleanHost || "mimoza.paymydine.com"

  if (raw.startsWith("/assets/media/uploads/")) {
    return `https://${tenantHost}${raw}`
  }

  if (raw.startsWith("/storage/")) {
    return `https://${tenantHost}${raw}`
  }

  return `https://${tenantHost}/assets/media/uploads/${raw.replace(/^\/+/, "")}`
}

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "mimoza.paymydine.com"
  const proto = request.headers.get("x-forwarded-proto") || "https"

  const apiUrl = `${proto}://${host}/api/v1/settings`

  try {
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `settings upstream ${res.status}`,
          upstream: apiUrl,
        },
        { status: res.status }
      )
    }

    const data = await res.json()

    const siteLogoUrl = normalizeMediaUrl(data?.site_logo, host)
    const faviconLogoUrl = normalizeMediaUrl(data?.favicon_logo || data?.site_logo, host)

    return NextResponse.json(
      {
        ...data,
        success: true,

        // keep original fields but normalized, so old frontend code can use them directly
        site_logo: siteLogoUrl,
        favicon_logo: faviconLogoUrl,

        // extra aliases for any newer code
        logo_url: siteLogoUrl,
        site_logo_url: siteLogoUrl,
        favicon_logo_url: faviconLogoUrl,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown settings proxy error",
        upstream: apiUrl,
      },
      { status: 500 }
    )
  }
}
