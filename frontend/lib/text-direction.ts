const RTL_REGEX = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/

export function containsRTL(text: string | null | undefined): boolean {
  if (!text) return false
  return RTL_REGEX.test(text)
}

export function getTextDirection(text: string | null | undefined): "rtl" | "ltr" {
  return containsRTL(text) ? "rtl" : "ltr"
}

export function getTextAlignClass(text: string | null | undefined): string {
  return containsRTL(text) ? "text-right" : "text-left"
}
