export type PmdSetter<T = any> = (value: T | ((prev: T) => T)) => void
export type PmdToast = (options: any) => void

// Phase 4 route boundary type.
// Keep broad for now because all route props are passed from CustomerMenuPage.
// Later we can split this into strict per-theme prop interfaces after visual QA.
export type CustomerMenuThemeRouteProps = Record<string, any>
