export function parseValetEnabledValue(value: unknown): boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === "boolean") return value
  if (typeof value === "number") {
    if (value === 1) return true
    if (value === 0) return false
  }

  const normalized = String(value).trim().toLowerCase()
  if (!normalized || normalized === "null" || normalized === "undefined") return null
  if (["1", "true", "yes", "on", "enabled", "active", "available"].includes(normalized)) return true
  if (["0", "false", "no", "off", "disabled", "inactive", "unavailable"].includes(normalized)) return false
  return null
}

export function isValetFeatureEnabled(...sources: any[]): boolean {
  const keys = [
    "valet_enabled",
    "valetEnabled",
    "enable_valet",
    "enableValet",
    "valet_parking_enabled",
    "valetParkingEnabled",
    "valet_service_enabled",
    "valetServiceEnabled",
    "pmd_valet_enabled",
    "pmdValetEnabled",
    "show_valet",
    "showValet",
  ]

  const queue = [...sources.filter(Boolean)]

  while (queue.length > 0) {
    const source = queue.shift()
    if (!source || typeof source !== "object") continue

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const parsed = parseValetEnabledValue(source[key])
        if (parsed !== null) return parsed
      }
    }

    for (const nestedKey of ["data", "settings", "config", "features", "services", "restaurant", "merchant", "frontend", "theme"]) {
      if (source[nestedKey] && typeof source[nestedKey] === "object") {
        queue.push(source[nestedKey])
      }
    }
  }

  return true
}
