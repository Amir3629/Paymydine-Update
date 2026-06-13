"use client"

export function pmdForceKazenFrontendThemePayload(payload: any) {
  if (!payload || typeof payload !== "object") return payload

  const normalize = (value: any) => String(value || "").trim().replace(/-/g, "_").toLowerCase()
  const topAdmin = normalize(payload.admin_theme)
  const nestedAdmin = normalize(payload.data?.admin_theme)
  const topFrontend = normalize(payload.frontend_theme)
  const nestedFrontend = normalize(payload.data?.frontend_theme)

  const hasKazen =
    topAdmin === "kazen_japanese" ||
    nestedAdmin === "kazen_japanese" ||
    topFrontend === "kazen_japanese" ||
    nestedFrontend === "kazen_japanese"

  if (hasKazen) {
    payload.admin_theme = "kazen_japanese"
    payload.frontend_theme = "kazen_japanese"
    payload.theme_id = "kazen_japanese"
    if (payload.data && typeof payload.data === "object") {
      payload.data.admin_theme = "kazen_japanese"
      payload.data.frontend_theme = "kazen_japanese"
      payload.data.theme_id = "kazen_japanese"
    }
  }

  return payload
}
