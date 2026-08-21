import { apiClient, type MenuItem as ApiMenuItem, type Category as ApiCategory } from './api-client'
import { EnvironmentConfig } from './environment-config'

// FIXED: Use dynamic category type instead of hardcoded union
export type MenuItem = {
  images?: string[]
  gallery?: string[]
  media?: any[]
  id: number
  name: string
  nameKey?: string
  description: string
  descriptionKey?: string
  price: number
  image: string
  category: string // FIXED: Changed from hardcoded union to dynamic string
  category_id?: number
  category_name?: string
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
  sugar?: number | null
  serving_size?: string | null
  color?: string | null
  nutrition?: {
    calories?: number | null
    protein?: number | null
    carbs?: number | null
    fat?: number | null
    sugar?: number | null
    serving_size?: string | null
    disclaimer?: string
  } | null
  allergens?: string[]
  allergy_tags?: string[]
  halal?: boolean
  vegetarian?: boolean
  vegan?: boolean
  stock_qty?: number
  minimum_qty?: number
  available?: boolean
  options?: MenuItemOption[]
  prep_time_minutes?: number
  is_chef_recommended?: boolean
  is_bestseller?: boolean
  bestseller_source?: 'manual' | 'auto' | null
  popularity_count?: number
}


export type MenuHighlightSettings = {
  chef_section_enabled: boolean
  bestseller_section_enabled: boolean
  show_card_badges: boolean
  show_modal_badges: boolean
  chef_label: string
  bestseller_label: string
  max_chef_items: number
  max_bestseller_items: number
  badge_display_mode: 'priority_only' | 'show_all'
  badge_style: 'minimal_circle' | 'corner_ribbon' | 'soft_pill' | 'luxury_label'
  badge_position: 'image_top_left' | 'image_top_right' | 'title_inline' | 'hidden'
  show_badge_text_on_cards: boolean
  show_badge_text_in_modal: boolean
  section_placement: 'top' | 'after_categories' | 'hidden'
}

export const defaultMenuHighlightSettings: MenuHighlightSettings = {
  chef_section_enabled: false,
  bestseller_section_enabled: false,
  show_card_badges: true,
  show_modal_badges: true,
  chef_label: "Chef’s Choice",
  bestseller_label: 'Best Seller',
  max_chef_items: 8,
  max_bestseller_items: 8,
  badge_display_mode: 'priority_only',
  badge_style: 'corner_ribbon',
  badge_position: 'image_top_left',
  show_badge_text_on_cards: false,
  show_badge_text_in_modal: true,
  section_placement: 'hidden',
}

export interface MenuItemOption {
  id: number
  name: string
  display_type: 'radio' | 'checkbox' | 'select'
  required: boolean
  values: MenuItemOptionValue[]
}

export interface MenuItemOptionValue {
  id: number
  value: string
  price: number
  is_default?: boolean
}

// FIXED: Remove the mapping function - use API categories directly
// const mapCategoryName = (apiCategoryName: string): MenuItem["category"] => { ... }

const toBoolean = (value: unknown): boolean => value === true || value === 1 || value === '1'

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

// FIXED: Convert API MenuItem to frontend MenuItem

// PMD_PRESERVE_GALLERY_IMAGES_START
const normalizeApiMenuImagePath = (value: unknown): string => {
  if (!value) return ""

  const raw = String(value).trim()
  if (!raw) return ""

  if (/^https?:\/\//i.test(raw)) return raw

  if (raw.startsWith("/")) return raw

  if (raw.startsWith("assets/media/")) return `/${raw}`

  if (raw.startsWith("attachments/public/")) return `/assets/media/${raw}`

  if (raw.startsWith("uploads/")) return `/assets/media/${raw}`

  // Plain upload filenames from ti_menu_images.
  if (/\.(png|jpe?g|webp|gif|svg)(\?|#)?$/i.test(raw)) {
    return `/assets/media/uploads/${raw}`
  }

  return raw
}

const normalizeApiMenuImageList = (value: unknown): string[] => {
  const arr = Array.isArray(value) ? value : []
  const seen = new Set<string>()
  const result: string[] = []

  arr.forEach((entry: any) => {
    const candidate =
      typeof entry === "string"
        ? entry
        : entry?.url || entry?.image || entry?.src || entry?.image_path || entry?.path || ""

    const normalized = normalizeApiMenuImagePath(candidate)
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized)
      result.push(normalized)
    }
  })

  return result
}
// PMD_PRESERVE_GALLERY_IMAGES_END

const convertApiMenuItem = (apiItem: ApiMenuItem, categoryName?: string): MenuItem => {
  // Convert relative image path to full URL (same as logo system)
  let imageUrl = apiItem.image || '/placeholder.svg?width=200&height=200';
  
  // Check if image path starts with /api/media/ (relative path)
  if (imageUrl && imageUrl.startsWith('/api/media/')) {
    // Convert to full URL (same as logo system does with toUploadsUrl)
    const baseUrl = EnvironmentConfig.getInstance().backendBaseUrl();
    imageUrl = `${baseUrl}${imageUrl}`;
    // Result: "http://mimoza.paymydine.com/api/media/6776d2d9145fc496723456.jpg"
  }
  // If already a full URL (http://...), leave as-is
  // If empty or default placeholder, leave as-is
  
  return {
    id: apiItem.id,
    name: apiItem.name,
    // Don't set nameKey for API items - use direct name instead of translation
    nameKey: undefined,
    description: apiItem.description || '',
    // Don't set descriptionKey for API items - use direct description instead of translation
    descriptionKey: undefined,
    price: apiItem.price,
    image: imageUrl,  // Now uses full URL for /api/media/ paths!
    images: normalizeApiMenuImageList((apiItem as any).images),
    gallery: normalizeApiMenuImageList((apiItem as any).gallery),
    media: Array.isArray((apiItem as any).media) ? (apiItem as any).media : [],
    // FIXED: Use API category name directly, no mapping at all
    category: categoryName || apiItem.category_name || 'Main Course',
    category_id: apiItem.category_id,
    category_name: apiItem.category_name,
    calories: toNumberOrNull(apiItem.calories ?? apiItem.nutrition?.calories),
    protein: toNumberOrNull(apiItem.protein ?? apiItem.nutrition?.protein),
    carbs: toNumberOrNull(apiItem.carbs ?? apiItem.nutrition?.carbs),
    fat: toNumberOrNull(apiItem.fat ?? apiItem.nutrition?.fat),
    sugar: toNumberOrNull(apiItem.sugar ?? apiItem.nutrition?.sugar),
    serving_size: apiItem.serving_size || apiItem.nutrition?.serving_size || null,
    color: apiItem.color || null,
    nutrition: apiItem.nutrition || null,
    allergens: apiItem.allergens || [],
    allergy_tags: apiItem.allergy_tags || apiItem.allergens || [],
    halal: toBoolean(apiItem.halal),
    vegetarian: toBoolean(apiItem.vegetarian),
    vegan: toBoolean(apiItem.vegan),
    stock_qty: apiItem.stock_qty,
    minimum_qty: apiItem.minimum_qty || 1,
    available: apiItem.available !== false && (apiItem.stock_qty === null || (apiItem.stock_qty ?? 0) > 0),
    options: apiItem.options || [],
    prep_time_minutes: Number((apiItem as any).prep_time_minutes || 15),
    is_chef_recommended: toBoolean((apiItem as any).is_chef_recommended),
    is_bestseller: toBoolean((apiItem as any).is_bestseller),
    bestseller_source: (apiItem as any).bestseller_source || null,
    popularity_count: Number((apiItem as any).popularity_count || 0)
  }
}


const normalizeMenuHighlightSettings = (value: any): MenuHighlightSettings => {
  const raw = value && typeof value === 'object' ? value : {}
  const firstValue = (keys: string[], fallback: any) => {
    for (const key of keys) {
      const v = raw[key]
      if (v !== undefined && v !== null && v !== '') return v
    }
    return fallback
  }
  const boolValue = (keys: string[], fallback: boolean): boolean => {
    const v = firstValue(keys, fallback)
    if (typeof v === 'boolean') return v
    const normalized = String(v).trim().toLowerCase()
    if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true
    if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false
    return fallback
  }
  const intValue = (keys: string[], fallback: number): number => {
    const parsed = Number(firstValue(keys, fallback))
    return Number.isFinite(parsed) ? Math.max(1, Math.min(24, Math.round(parsed))) : fallback
  }
  const textValue = (keys: string[], fallback: string): string => {
    const text = String(firstValue(keys, fallback) ?? '').trim()
    return text || fallback
  }
  const enumValue = <T extends string>(keys: string[], fallback: T, allowed: readonly T[]): T => {
    const value = textValue(keys, fallback) as T
    return allowed.includes(value) ? value : fallback
  }

  return {
    chef_section_enabled: boolValue(['enable_chef_recommendations_section', 'chef_section_enabled'], false),
    bestseller_section_enabled: boolValue(['enable_best_sellers_section', 'bestseller_section_enabled'], false),
    show_card_badges: boolValue(['show_badges_on_cards', 'show_card_badges'], true),
    show_modal_badges: boolValue(['show_badges_in_modal', 'show_modal_badges'], true),
    chef_label: textValue(['chef_recommendation_label', 'chef_label'], defaultMenuHighlightSettings.chef_label),
    bestseller_label: textValue(['best_seller_label', 'bestseller_label'], defaultMenuHighlightSettings.bestseller_label),
    max_chef_items: intValue(['max_chef_recommendation_items', 'max_chef_items'], 8),
    max_bestseller_items: intValue(['max_best_seller_items', 'max_bestseller_items'], 8),
    badge_display_mode: enumValue(['badge_display_mode'], 'priority_only', ['priority_only', 'show_all'] as const),
    badge_style: enumValue(['badge_style'], 'corner_ribbon', ['minimal_circle', 'corner_ribbon', 'soft_pill', 'luxury_label'] as const),
    badge_position: enumValue(['badge_position'], 'image_top_left', ['image_top_left', 'image_top_right', 'title_inline', 'hidden'] as const),
    show_badge_text_on_cards: boolValue(['show_badge_text_on_cards'], false),
    show_badge_text_in_modal: boolValue(['show_badge_text_in_modal'], true),
    section_placement: enumValue(['section_placement'], 'hidden', ['top', 'after_categories', 'hidden'] as const),
  }
}

// FIXED: Update getMenuData to return categoryNames from API
export async function getMenuData(): Promise<{ categories: MenuItem[][], menuItems: MenuItem[], categoryNames: string[], isFrontendConfigured: boolean, menuHighlightSettings: MenuHighlightSettings, menuCacheVersion: string }> {
  try {
    const menuResponse = await apiClient.getMenu()
    
    // Convert API items to frontend format
    const rawItems = (menuResponse?.data?.items ?? menuResponse?.data ?? []);
    const safeItems = Array.isArray(rawItems) ? rawItems : [];
    const menuItems: MenuItem[] = safeItems.map(apiItem => 
      convertApiMenuItem(apiItem, apiItem.category_name)
    ) || []
    
    // FIXED: Get category names directly from API response
    const catsResp = await apiClient.getCategories();
    const categoryNames = (catsResp?.data ?? []).map((c: any) => c.category_name ?? c.name).filter(Boolean);
    
    // Group items by category
    const categoryGroups: Record<string, MenuItem[]> = {}
    menuItems.forEach(item => {
      const categoryName = item.category
      if (!categoryGroups[categoryName]) {
        categoryGroups[categoryName] = []
      }
      categoryGroups[categoryName].push(item)
    })
    
    const categories = Object.values(categoryGroups)
    
    return { categories, menuItems, categoryNames, isFrontendConfigured: menuResponse?.data?.is_frontend_configured !== false, menuHighlightSettings: normalizeMenuHighlightSettings((menuResponse?.data as any)?.menu_highlight_settings), menuCacheVersion: String((menuResponse?.data as any)?.menu_cache_version || 'default') }
  } catch (error) {
    console.error('Failed to fetch menu data from API:', error)
    return { categories: [], menuItems: [], categoryNames: [], isFrontendConfigured: true, menuHighlightSettings: defaultMenuHighlightSettings, menuCacheVersion: 'fallback' }
  }
}

export async function getCategories(): Promise<string[]> {
  try {
    const apiResponse = await apiClient.getCategories()
    return apiResponse.data.map(cat => cat.name)
  } catch (error) {
    console.error('Failed to fetch categories from API:', error)
    return []
  }
}

export async function getMenuItems(categoryId?: number): Promise<MenuItem[]> {
  try {
    const apiResponse = await apiClient.getMenuItems(categoryId)
    return apiResponse.data.map(apiItem => convertApiMenuItem(apiItem))
  } catch (error) {
    console.error('Failed to fetch menu items from API:', error)
    return []
  }
}

export async function getRestaurantInfo() {
  try {
    return await apiClient.getRestaurantInfo()
  } catch (error) {
    console.error('Failed to fetch restaurant info:', error)
    return {
      id: 1,
      name: 'PayMyDine',
      domain: 'localhost',
      description: 'A luxurious dining experience',
      address: '123 Main St',
      phone: '+1234567890',
      email: 'info@paymydine.com',
      status: 'active',
      settings: {
        currency: 'EUR',
        timezone: 'UTC',
        delivery_enabled: false,
        pickup_enabled: true
      }
    }
  }
}

// Empty defaults – menu and categories come from API (admin) only
export const categories: string[] = []
export const menuData: MenuItem[] = []
