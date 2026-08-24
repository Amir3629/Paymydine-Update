import type {
  CustomerBootstrap,
  FeatureFlags,
  MenuCategory,
  MenuItem,
  MenuItemOption,
  OrderLine,
  PaymentMethod,
  RestaurantBrand,
  SocialLink,
  TableContext,
  TableOrderState,
  TaxConfig,
  ThemeConfiguration,
  TipConfig,
  ServiceChargeConfig,
} from '@/src/domain/model'
import { normalizeThemeId } from '@/src/themes/catalog'

const str = (value: unknown, fallback = '') => {
  const out = value == null ? '' : String(value).trim()
  return out || fallback
}
const num = (value: unknown, fallback = 0) => {
  const out = Number(value)
  return Number.isFinite(out) ? out : fallback
}
const yes = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const out = str(value).toLowerCase()
  if (['1','true','yes','on','enabled','active','available'].includes(out)) return true
  if (['0','false','no','off','disabled','inactive','unavailable'].includes(out)) return false
  return fallback
}
const list = <T = any>(value: unknown): T[] => Array.isArray(value) ? value as T[] : []
const object = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
const unwrap = (value: unknown) => {
  const root = object(value)
  const data = object(root.data)
  return Object.keys(data).length ? { ...root, ...data } : root
}
const first = (source: Record<string, any>, keys: string[], fallback: unknown = null) => {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

const nullableNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const out = Number(value)
  return Number.isFinite(out) ? out : null
}

function nutritionFrom(source: Record<string, any>): MenuItem['nutrition'] {
  const nested = object(source.nutrition)
  const nutrition = {
    calories: nullableNumber(first(source, ['calories'], first(nested, ['calories']))),
    protein: nullableNumber(first(source, ['protein'], first(nested, ['protein']))),
    carbs: nullableNumber(first(source, ['carbs','carbohydrates'], first(nested, ['carbs','carbohydrates']))),
    fat: nullableNumber(first(source, ['fat'], first(nested, ['fat']))),
    sugar: nullableNumber(first(source, ['sugar'], first(nested, ['sugar']))),
    servingSize: str(first(source, ['serving_size','servingSize'], first(nested, ['serving_size','servingSize']))) || null,
    disclaimer: str(first(nested, ['disclaimer'])) || null,
  }

  const hasNutrition =
    nutrition.calories !== null ||
    nutrition.protein !== null ||
    nutrition.carbs !== null ||
    nutrition.fat !== null ||
    nutrition.sugar !== null ||
    Boolean(nutrition.servingSize) ||
    Boolean(nutrition.disclaimer)

  return hasNutrition ? nutrition : null
}

// PMD_LEGACY_MEDIA_CONTRACT_R10
// The existing PayMyDine backend already owns menu media under /api/media/*.
// Keep that proven contract instead of inventing a second media authority.
function encodePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map(part => encodeURIComponent(decodeURIComponent(part)))
    .join('/')
}

function asset(value: unknown): string | null {
  const raw = str(value)
  if (!raw || ['null','undefined'].includes(raw)) return null
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) return raw

  let clean = raw.replace(/^\/+/, '')
  clean = clean.split('#')[0].split('?')[0]
  if (!clean) return null

  // Preserve non-media API contracts unchanged.
  if (clean.startsWith('api/') && !clean.startsWith('api/media/') && !clean.startsWith('api/v1/frontend-media-v2/')) {
    return `/${clean}`
  }

  // Restore the original, proven media contract used by the old customer frontend.
  if (clean.startsWith('api/media/')) {
    const relative = encodePath(clean.slice('api/media/'.length))
    return relative ? `/api/media/${relative}` : null
  }

  // R9/R8 URLs may still arrive from cached/backend-normalized payloads. Convert them back.
  if (clean.startsWith('api/v1/frontend-media-v2/')) {
    clean = clean.slice('api/v1/frontend-media-v2/'.length)
  }

  // Media Manager gallery/upload URLs were already public in the legacy frontend.
  if (clean.startsWith('assets/media/')) {
    return `/${encodePath(clean)}`
  }
  if (clean.startsWith('uploads/')) {
    return `/assets/media/${encodePath(clean)}`
  }
  if (clean.startsWith('storage/')) {
    return `/${encodePath(clean)}`
  }

  // attachment/public paths are served by the backend /api/media route.
  if (clean.startsWith('assets/media/attachments/public/')) {
    clean = clean.slice('assets/media/attachments/public/'.length)
  }

  // PMD_FOOD_BRAND_PLACEHOLDER_R3
  // Missing Food photos use the local PayMyDine brand asset. The backend now
  // emits /brand/paymydine-logo.svg; keep the old pasta sentinel compatible.
  if (clean === 'images/pasta.png') return '/brand/paymydine-logo.svg'
  if (clean.startsWith('brand/')) return `/${encodePath(clean)}`
  if (clean.startsWith('images/')) {
    const relative = encodePath(clean.slice('images/'.length))
    return relative ? `/api/media/${relative}` : null
  }

  const relative = encodePath(clean)
  return relative ? `/api/media/${relative}` : null
}

function translationMap(source: Record<string, any>): MenuItem['translations'] {
  const result: MenuItem['translations'] = {}
  const raw = object(source.translations)
  for (const [locale, value] of Object.entries(raw)) {
    const row = object(value)
    if (row.name || row.description) result[locale.toLowerCase()] = { name: str(row.name), description: str(row.description) }
  }
  for (const locale of ['en','de','fa','tr','ja','ar','fr','es','it']) {
    const name = str(first(source, [`name_${locale}`, `menu_name_${locale}`]))
    const description = str(first(source, [`description_${locale}`, `menu_description_${locale}`]))
    if (name || description) result[locale] = { name: name || undefined, description: description || undefined }
  }
  return result
}

function categoryTranslations(source: Record<string, any>): Record<string,string> {
  const result: Record<string,string> = {}
  const raw = object(source.translations)
  for (const [locale, value] of Object.entries(raw)) {
    const label = typeof value === 'string' ? value : object(value).name
    if (str(label)) result[locale.toLowerCase()] = str(label)
  }
  for (const locale of ['en','de','fa','tr','ja','ar','fr','es','it']) {
    const value = str(first(source, [`name_${locale}`, `category_name_${locale}`]))
    if (value) result[locale] = value
  }
  return result
}

function optionGroups(value: unknown): MenuItemOption[] {
  return list<Record<string, any>>(value)
    .map((group, groupIndex): MenuItemOption => {
      const rawDisplayType = str(first(group, ['display_type', 'displayType'])).toLowerCase()
      const displayType: MenuItemOption['displayType'] =
        rawDisplayType === 'checkbox' || rawDisplayType === 'select'
          ? rawDisplayType
          : 'radio'

      return {
        id: str(first(group, ['id','option_id','menu_option_id']), `option-${groupIndex}`),
        name: str(first(group, ['name','label','option_name']), `Option ${groupIndex + 1}`),
        displayType,
        required: yes(group.required),
        values: list<Record<string, any>>(first(group, ['values','option_values'], [])).map((row, valueIndex) => ({
          id: str(first(row, ['id','option_value_id','value_id']), `value-${groupIndex}-${valueIndex}`),
          name: str(first(row, ['value','name','label']), `Choice ${valueIndex + 1}`),
          price: num(first(row, ['price','price_delta','amount'])),
          isDefault: yes(first(row, ['is_default','default']))
        }))
      }
    })
    .filter(group => group.values.length > 0)
}

function gallery(source: Record<string, any>): string[] {
  const result: string[] = []
  const visit = (value: unknown) => {
    if (!value) return
    if (Array.isArray(value)) return value.forEach(visit)
    if (typeof value === 'object') return visit(first(object(value), ['url','image','src','path','name']))
    const normalized = asset(value)
    if (normalized && !result.includes(normalized)) result.push(normalized)
  }
  ;[source.image,source.image_url,source.images,source.gallery,source.media,source.additional_images].forEach(visit)
  return result
}

export function normalizeMenu(payload: unknown): CustomerBootstrap['menu'] {
  const root = unwrap(payload)
  const rows: Record<string, any>[] = Array.isArray((payload as any)?.data)
    ? (payload as any).data as Record<string, any>[]
    : list<Record<string, any>>(first(root, ['items','menu_items'], []))
  const categoriesRaw = list<Record<string, any>>(first(root, ['categories','menu_categories'], []))
  const items: MenuItem[] = rows.map((source, index) => {
    const images = gallery(source)
    const categoryName = str(first(source, ['category_name','category','categoryName']), 'Menu')
    const categoryId = str(first(source, ['category_id','categoryId']), categoryName.toLowerCase().replace(/[^a-z0-9]+/g,'-'))
    const allergenText = str(source.allergy_names)
    const allergens = [...list<string>(first(source, ['allergens','allergy_tags'], [])), ...allergenText.split('||')].map(value => str(value)).filter(Boolean)
    return {
      id: str(first(source, ['id','menu_id','combo_id']), `item-${index}`),
      name: str(first(source, ['name','menu_name','title']), `Menu item ${index + 1}`),
      description: str(first(source, ['description','menu_description','details'])),
      translations: translationMap(source),
      price: num(first(source, ['price','menu_price','combo_price'])),
      categoryId,
      categoryName,
      imageUrl: images[0] || null,
      gallery: images,
      allergens: allergens.filter((value, idx, all) => all.indexOf(value) === idx),
      halal: yes(source.halal),
      vegetarian: yes(source.vegetarian),
      vegan: yes(source.vegan),
      available: source.available === undefined ? !yes(source.is_stock_out) : yes(source.available, true),
      stockQty: source.stock_qty == null ? null : num(source.stock_qty),
      prepTimeMinutes: source.prep_time_minutes == null ? null : num(source.prep_time_minutes),
      nutrition: nutritionFrom(source),
      options: optionGroups(source.options),
      isChefRecommended: yes(first(source, ['is_chef_recommended','is_recommended','is_featured'])),
      isBestseller: yes(first(source, ['is_bestseller','is_manual_bestseller'])),
      popularityCount: num(source.popularity_count),
    }
  })
  const categoryMap = new Map<string, MenuCategory>()
  categoriesRaw.forEach((source, index) => {
    const name = str(first(source, ['name','category_name']), `Category ${index + 1}`)
    categoryMap.set(name.toLowerCase(), {
      id: str(first(source, ['id','category_id']), name.toLowerCase().replace(/[^a-z0-9]+/g,'-')),
      name,
      description: str(source.description),
      translations: categoryTranslations(source),
      imageUrl: asset(first(source, ['image','image_url'])),
      priority: num(source.priority, index + 1),
    })
  })
  for (const item of items) if (!categoryMap.has(item.categoryName.toLowerCase())) categoryMap.set(item.categoryName.toLowerCase(), { id:item.categoryId || item.categoryName, name:item.categoryName, description:'', translations:{}, imageUrl:null, priority:999 })
  const highlight = unwrap(root.menu_highlight_settings)
  return {
    categories: [...categoryMap.values()].sort((a,b) => a.priority-b.priority || a.name.localeCompare(b.name)),
    items,
    highlights: {
      showChefRecommendations: yes(first(highlight, ['chef_recommendations_enabled','show_chef_recommendations']), true),
      showBestsellers: yes(first(highlight, ['bestsellers_enabled','show_bestsellers']), true),
      chefTitle: str(first(highlight, ['chef_recommendation_title','recommendations_title']), "Chef's selections"),
      bestsellerTitle: str(first(highlight, ['bestseller_title','bestsellers_title']), 'Bestsellers'),
    },
    cacheVersion: str(first(root, ['menu_cache_version','version']), 'live'),
  }
}

export function normalizeRestaurant(settingsPayload: unknown, restaurantPayload: unknown): RestaurantBrand {
  const settings = unwrap(settingsPayload)
  const restaurant = unwrap(restaurantPayload)
  return {
    id: str(first(restaurant, ['id','restaurant_id']), 'restaurant'),
    name: str(first(settings, ['site_name','business_name','restaurant_name']), str(first(restaurant, ['name']), 'PayMyDine Restaurant')),
    description: str(first(restaurant, ['description']), str(first(settings, ['restaurant_description','site_description']))).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim(),
    // PMD_RESTAURANT_DEFAULT_LOGO_R25
    logoUrl: asset(first(settings, ['pmd_restaurant_identity_logo','site_logo_url','logo_url','site_logo','logo'])) || '/brand/paymydine-logo.svg',
    faviconUrl: asset(first(settings, ['favicon_logo_url','favicon_logo'])),
    heroImageUrl: asset(first(settings, ['pmd_hero_image_url','hero_image_url','hero_image'])),
    phone: str(first(restaurant, ['phone','telephone']), str(first(settings, ['phone','telephone']))) || null,
    whatsapp: str(first(settings, ['whatsapp','whatsapp_number'])) || null,
    address: str(first(restaurant, ['address']), str(settings.address)) || null,
    currency: str(first(restaurant, ['currency','location_currency']), str(first(settings, ['default_currency','currency']), 'EUR')),
    locale: str(first(settings, ['default_language','locale']), 'en'),
    timezone: str(first(restaurant, ['timezone']), 'UTC'),
    footerText: str(first(settings, ['pmd_footer_text','footer_text']), 'Thank you for dining with us.'),
  }
}

export function normalizeTheme(payload: unknown, previewTheme?: string | null): ThemeConfiguration {
  const root = unwrap(payload)
  const raw = previewTheme || str(first(root, ['frontend_theme','theme_id','theme_configuration','pmd_visual_theme_selection','admin_theme']), 'verdant_modern')
  return { id: normalizeThemeId(raw), version: str(first(root, ['theme_version','updated_at','version']), 'live-1'), rawAdminThemeId: raw, options: root }
}

export function normalizeSocial(settingsPayload: unknown, themePayload: unknown = null): SocialLink[] {
  const theme = unwrap(themePayload)
  const settings = unwrap(settingsPayload)
  const root = { ...theme, ...settings }
  const headerLinks = object(first(root, ['kazen_header_links', 'header_links'], {}))
  const genericSocial = object(headerLinks.social)
  const websiteLink = object(headerLinks.website)
  const genericPlatform = str(first(root, ['pmd_kazen_social_platform', 'social_platform']), str(genericSocial.platform)).toLowerCase()
  const genericUrl = str(first(root, ['pmd_kazen_social_url', 'social_url']), str(genericSocial.url))
  const genericEnabled = yes(first(root, ['pmd_kazen_social_enabled', 'social_enabled']), yes(genericSocial.enabled))

  const normalizeUrl = (platform: string, rawValue: unknown): string => {
    const raw = str(rawValue)
    if (!raw) return ''
    if (/^https?:\/\//i.test(raw)) return raw
    if (platform === 'whatsapp') {
      const digits = raw.replace(/[^0-9]/g, '')
      return digits ? `https://wa.me/${digits}` : ''
    }
    return ''
  }

  const platforms = ['instagram','facebook','tiktok','youtube','google','trustpilot','website','whatsapp','reviews','x'] as const
  return platforms
    .map((platform): SocialLink => {
      const isGeneric = genericPlatform === platform || (platform === 'reviews' && genericPlatform === 'review')
      const websiteUrl = platform === 'website'
        ? first(root, ['pmd_kazen_website_url', 'website_url', 'website'], websiteLink.url)
        : null
      const url = normalizeUrl(
        platform,
        first(
          root,
          [`pmd_social_${platform}_url`, `${platform}_url`],
          websiteUrl || (isGeneric ? genericUrl : ''),
        ),
      )
      const enabled = yes(
        first(
          root,
          [`pmd_social_${platform}_enabled`, `${platform}_enabled`],
          platform === 'website'
            ? first(root, ['pmd_kazen_website_enabled'], websiteLink.enabled)
            : (isGeneric ? genericEnabled : false),
        ),
      )
      return {
        platform,
        label: platform === 'x' ? 'X' : platform[0].toUpperCase() + platform.slice(1),
        url,
        enabled: enabled && Boolean(url),
      }
    })
    .filter((link) => link.enabled)
}

export function normalizeFeatures(settingsPayload: unknown, themePayload: unknown): FeatureFlags {
  const root = { ...unwrap(themePayload), ...unwrap(settingsPayload) }
  const read = (keys: string[], fallback = true) => {
    for (const key of keys) if (root[key] !== undefined && root[key] !== null && root[key] !== '') return yes(root[key], fallback)
    return fallback
  }
  return {
    waiterCall: read(['pmd_v2_waiter_call_enabled','waiter_call_enabled','pmd_waiter_call_enabled'], true),
    valet: read(['pmd_v2_valet_enabled','valet_enabled','enable_valet','pmd_valet_enabled','show_valet'], false),
    tableOrdering: read(['pmd_v2_table_order_enabled','table_order_enabled','guest_order'], true),
    splitBill: read(['pmd_v2_split_bill_enabled','split_bill_enabled','pmd_split_bill_enabled'], true),
    tips: read(['pmd_v2_tips_enabled','tips_enabled','tip_enabled'], true),
    coupons: read(['pmd_v2_coupons_enabled','coupons_enabled','coupon_enabled'], true),
    socialLinks: read(['pmd_v2_social_enabled','pmd_homepage_social_icons_enabled','pmd_kazen_social_enabled','pmd_kazen_website_enabled','social_links_enabled'], true),
  }
}

export function normalizeTax(settingsPayload: unknown): TaxConfig {
  const root = unwrap(settingsPayload)
  const percentage = num(first(root, ['vat_percentage','tax_percentage']))
  // PMD_SPLIT_PAYMENT_SAFETY_R35: backend contract is 0=included, 1=add at checkout.
  const addAtCheckout = yes(first(root, ['vat_menu_price','tax_menu_price']), false)
  return { enabled: yes(first(root, ['vat_mode','tax_mode']), percentage > 0), percentage, includedInMenuPrice: !addAtCheckout }
}

export function normalizeServiceCharge(settingsPayload: unknown, themePayload?: unknown): ServiceChargeConfig {
  const settings = unwrap(settingsPayload)
  const theme = unwrap(themePayload)
  const root = { ...theme, ...settings }
  const rawType = str(first(root, ['pmd_service_charge_type','service_charge_type']), 'percentage').toLowerCase()
  const type: 'percentage' | 'fixed' = rawType === 'fixed' ? 'fixed' : 'percentage'
  const value = Math.max(0, num(first(root, ['pmd_service_charge_value','service_charge_value'])))
  return {
    enabled: yes(first(root, ['pmd_service_charge_enabled','service_charge_enabled']), false) && value > 0,
    type,
    value,
    label: str(first(root, ['pmd_service_charge_label','service_charge_label']), 'Service charge'),
  }
}

export function normalizeTips(settingsPayload: unknown): TipConfig {
  const root = unwrap(settingsPayload)
  const raw = first(root, ['tip_presets','tips_presets'])
  const presets = Array.isArray(raw) ? raw.map(value => num(value)).filter(value => value >= 0) : [0,5,10]
  return { enabled: yes(first(root, ['tips_enabled','tip_enabled']), true), presets: presets.length ? presets : [0,5,10] }
}

export function normalizeTable(payload: unknown, query: { tableId?: string|null; tableNo?: string|null; qr?: string|null }): TableContext {
  const root = unwrap(payload)
  const resolvedId = str(first(root, ['table_id','id'])) || null
  const resolvedNumber = str(first(root, ['table_no','table_number','number'])) || null
  const resolvedQr = str(first(root, ['qr_code','qr'])) || null
  const valid = root.success !== false && Boolean(resolvedId || resolvedNumber || resolvedQr)
  return {
    valid,
    id: resolvedId || (valid ? query.tableId || null : null),
    number: resolvedNumber || (valid ? query.tableNo || null : null),
    name: str(first(root, ['table_name','name'])) || null,
    qr: resolvedQr || (valid ? query.qr || null : null),
    locationId: first(root, ['location_id']) == null ? null : num(root.location_id),
  }
}

function orderLines(value: unknown): OrderLine[] {
  return list<Record<string,any>>(value).map((row,index) => ({
    orderMenuId: first(row,['order_menu_id','id']) == null ? null : num(first(row,['order_menu_id','id'])),
    menuId: str(first(row,['menu_id','id']), String(index)),
    name: str(first(row,['name','menu_name']), `Item ${index+1}`),
    // PMD_ITEM_NOTE_NORMALIZER_R29
    note: (str(first(row,['note','comment'])) || '').replace(/\[guest_session:[^\]]*\]/gi, '').replace(/^\s*\|?|\|?\s*$/g, '').trim() || null,
    quantity: Math.max(1,num(row.quantity,1)),
    price: num(row.price),
    subtotal: num(row.subtotal,num(row.price)*Math.max(1,num(row.quantity,1))),
    guestSessionId: str(first(row,['guest_session_id','submitted_by'])) || null,
    paidQuantity: num(row.paid_quantity),
    unpaidQuantity: row.unpaid_quantity == null ? Math.max(1,num(row.quantity,1)) : num(row.unpaid_quantity),
  }))
}

export function normalizeOrder(payload: unknown): TableOrderState | null {
  const root = unwrap(payload)
  if (!Object.keys(root).length || root.success === false) return null
  const items = orderLines(root.items)
  const groups = list<Record<string,any>>(root.groups).map(group => ({ guestSessionId: str(group.guest_session_id) || null, items: orderLines(group.items), subtotal: num(group.subtotal) }))
  const totals = unwrap(root.totals)
  const settlement = unwrap(root.settlement)
  const subtotal = num(first(totals,['subtotal']), items.reduce((sum,item)=>sum+item.subtotal,0))
  const total = num(first(totals,['total','orderTotal']), num(root.total,subtotal))
  const orderTotal = num(first(settlement,['orderTotal']), total)
  const settledAmount = num(first(settlement,['settledAmount']), num(root.settled_amount))
  const remainingAmount = num(first(settlement,['remainingAmount']), Math.max(0,orderTotal-settledAmount))
  const orderId = first(root,['order_id','orderId']) == null ? null : num(first(root,['order_id','orderId']))
  const rawStatus = str(root.status, orderId ? 'submitted_unpaid' : 'empty').toLowerCase()
  return {
    success: root.success !== false,
    status: rawStatus,
    draftId: root.draft_id == null ? null : num(root.draft_id),
    orderId,
    orderNumber: str(first(root,['orderNumber','order_number'])) || null,
    payment: str(root.payment) || null,
    paymentStatus: str(root.paymentStatus, remainingAmount <= 0 && orderId ? 'paid' : settledAmount > 0 ? 'partial' : 'unpaid'),
    deliveryStatus: str(root.deliveryStatus) || null,
    statusName: str(root.status_name) || null,
    canShowToNewDevice: yes(root.canShowToNewDevice, Boolean(orderId)),
    hasActiveTableOrder: yes(root.hasActiveTableOrder, rawStatus !== 'empty'),
    items,
    groups,
    totals: { subtotal, tax:num(first(totals,['tax'])), total, orderTotal, settledAmount, remainingAmount },
    prepTimeMinutes: first(root, ['prep_time_minutes','preparation_time','estimated_prep_minutes','eta_minutes']) == null
      ? null
      : Math.max(0, num(first(root, ['prep_time_minutes','preparation_time','estimated_prep_minutes','eta_minutes']))),
    estimatedReadyAt: str(first(root, ['estimated_ready_at','estimatedReadyAt','ready_at','eta'])) || null,
    createdAt: str(first(root, ['created_at','order_created_at','createdAt'])) || null,
    updatedAt: str(first(root, ['updatedAt','updated_at'])) || null,
  }
}

export function normalizePayments(payload: unknown): PaymentMethod[] {
  const root = unwrap(payload)
  const rows: Record<string, any>[] = Array.isArray(payload)
    ? payload as Record<string, any>[]
    : Array.isArray((payload as any)?.data)
      ? (payload as any).data as Record<string, any>[]
      : list<Record<string, any>>(root.methods)

  const methods: PaymentMethod[] = rows.map((row, index) => {
    const legacy = str(first(row, ['code', 'payment_code', 'method'])).toLowerCase().replace(/[\s-]+/g, '_')
    const aliases: Record<string, string> = {
      stripe: 'card',
      credit_card: 'card',
      creditcard: 'card',
      applepay: 'apple_pay',
      googlepay: 'google_pay',
      cash_on_delivery: 'cod',
    }
    const code = aliases[legacy] || legacy

    return {
      code,
      name: str(first(row, ['name', 'label', 'title']), code === 'cod' ? 'Cash' : code === 'card' ? 'Card' : code),
      providerCode: str(first(row, ['provider_code', 'providerCode', 'provider'])) || null,
      enabled: row.enabled === undefined && row.status === undefined
        ? true
        : yes(first(row, ['enabled', 'status']), true),
      priority: num(first(row, ['priority', 'sort_order']), index + 1),
    }
  })

  return methods
    .filter(method => method.enabled && method.code)
    .sort((a, b) => a.priority - b.priority)
}
