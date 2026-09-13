declare var process: { env: Record<string, string | undefined> }

declare namespace React {
  type ReactNode = any
  type CSSProperties = Record<string, string | number | undefined>
  type FormEvent<T = any> = { preventDefault(): void; currentTarget: T; target: any }
}

declare namespace JSX {
  type Element = any
  interface ElementChildrenAttribute { children: {} }
  interface ElementClass {}
  interface IntrinsicElements { [elementName: string]: any }
  interface IntrinsicAttributes { key?: string | number }
}

declare module 'react' {
  export type ReactNode = any
  export type CSSProperties = Record<string, string | number | undefined>
  export type FormEvent<T = any> = { preventDefault(): void; currentTarget: T; target: any }
  export type Dispatch<A> = (value: A) => void
  export type SetStateAction<S> = S | ((previous: S) => S)
  export type MutableRefObject<T> = { current: T }
  export interface Context<T> { Provider: any; __type?: T }
  export function createContext<T>(defaultValue: T): Context<T>
  export function useContext<T>(context: Context<T>): T
  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>]
  export function useRef<T>(initial: T): MutableRefObject<T>
  export function useMemo<T>(factory: () => T, dependencies: readonly unknown[]): T
  export function useCallback<T extends (...args: any[]) => any>(callback: T, dependencies: readonly unknown[]): T
  export function useEffect(effect: () => void | (() => void), dependencies?: readonly unknown[]): void
}

declare module 'next' {
  export type Metadata = any
  export type Viewport = any
}

declare module 'next/headers' {
  export function headers(): Promise<{ get(name: string): string | null }>
  export function cookies(): Promise<{ get(name: string): { value: string } | undefined }>
}

declare module 'next/navigation' {
  export function notFound(): never
  export function redirect(url: string): never
}

declare module 'next/server' {
  export class NextRequest extends Request {
    nextUrl: { searchParams: URLSearchParams }
    headers: Headers
  }
  export class NextResponse {
    static json(body: unknown, init?: any): NextResponse
    cookies: { set(name: string, value: string, options?: any): void }
  }
}

declare module 'server-only' {}

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare module 'lucide-react' {
  export const ArrowUp: any
  export const Beef: any
  export const Bell: any
  export const Car: any
  export const Check: any
  export const CheckCircle2: any
  export const ChefHat: any
  export const Clock: any
  export const ChevronDown: any
  export const ChevronRight: any
  export const CreditCard: any
  export const Crown: any
  export const ExternalLink: any
  export const Facebook: any
  export const Flame: any
  export const Globe2: any
  export const Instagram: any
  export const Leaf: any
  export const LoaderCircle: any
  export const MapPin: any
  export const Menu: any
  export const MessageCircle: any
  export const Minus: any
  export const NotebookPen: any
  export const Phone: any
  export const Plus: any
  export const Receipt: any
  export const ReceiptText: any
  export const RefreshCw: any
  export const RotateCcw: any
  export const Search: any
  export const Send: any
  export const ShoppingBag: any
  export const ShoppingCart: any
  export const Sparkles: any
  export const Split: any
  export const Star: any
  export const StickyNote: any
  export const Tag: any
  export const Trash2: any
  export const Users: any
  export const Utensils: any
  export const UtensilsCrossed: any
  export const Waves: any
  export const X: any
  export const XCircle: any
  export const Youtube: any
  export const Zap: any
}
