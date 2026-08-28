'use client'

import type { MenuItem } from '@/src/domain/model'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import styles from './FoodDetails.module.css'

type FoodGlyphKind =
  | 'halal' | 'vegetarian' | 'vegan'
  | 'celery' | 'crustaceans' | 'eggs' | 'fish' | 'gluten' | 'lupin'
  | 'milk' | 'molluscs' | 'mustard' | 'nuts' | 'peanuts' | 'sesame' | 'soy' | 'sulphites'
  | 'allergen' | 'calories' | 'serving' | 'protein' | 'carbs' | 'fat' | 'sugar' | 'prep'

function FoodGlyph({ kind }: { kind: FoodGlyphKind }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (kind) {
    case 'halal': return <svg {...common}><path d="M15.8 4.2a7.8 7.8 0 1 0 4 11.6 6.6 6.6 0 1 1-4-11.6Z"/><path d="m18.3 4.2.55 1.15 1.25.18-.9.88.21 1.24-1.11-.58-1.11.58.21-1.24-.9-.88 1.25-.18.55-1.15Z"/></svg>
    case 'vegetarian': return <svg {...common}><path d="M20 4.5C12.2 4.7 7.2 8.2 6 15.8c5.9.7 10.6-2.4 14-11.3Z"/><path d="M5 20c2.2-4.4 5.5-7.5 10.5-9.6"/></svg>
    case 'vegan': return <svg {...common}><path d="M12 20V10"/><path d="M12 13c-4.2 0-6.8-2.2-7.5-6.4 4.4-.3 7 1.7 7.5 5.9"/><path d="M12 10c.5-3.8 3.1-5.8 7.3-5.6-.5 4.2-3 6.5-7.3 6.6"/></svg>
    case 'celery': return <svg {...common}><path d="M10 21V9M14 21V8M7 21h10"/><path d="M10 10C6.5 9.4 5 7.2 5.2 4c3.2.2 5.1 1.7 5.5 4.8M14 9c.5-3.5 2.3-5.2 5.3-5.3.1 3.3-1.7 5.4-5.3 6"/></svg>
    case 'crustaceans': return <svg {...common}><path d="M5 13c1.3-4.7 7.7-7.4 12.7-3.7 2.5 1.8 1.4 5.4-1.4 6.8-3.7 1.9-8.8.8-11.3-3.1Z"/><path d="M8 9.3 5.8 7.2M11.5 8.1 11 5.2M15 8.2l1-2.6M6 14l-2.5 1.4M9 16.2 7.8 19M13 16.7l.2 2.8"/></svg>
    case 'eggs': return <svg {...common}><path d="M12 3.5c-3 0-6.2 6-6.2 10.6A6.2 6.2 0 0 0 18.2 14C18.2 9.5 15 3.5 12 3.5Z"/></svg>
    case 'fish': return <svg {...common}><path d="M4 12c3.6-4.5 8.2-5.4 12.8-2.2L21 7.5v9l-4.2-2.3C12.2 17.4 7.6 16.5 4 12Z"/><path d="M9 12h.01"/></svg>
    case 'gluten': return <svg {...common}><path d="M12 21V5"/><path d="M12 9c-3 0-4.7-1.4-5-4.2 3-.1 4.7 1.3 5 4.2ZM12 13c-3 0-4.7-1.4-5-4.2 3-.1 4.7 1.3 5 4.2ZM12 17c-3 0-4.7-1.4-5-4.2 3-.1 4.7 1.3 5 4.2Z"/><path d="M12 9c3 0 4.7-1.4 5-4.2-3-.1-4.7 1.3-5 4.2ZM12 13c3 0 4.7-1.4 5-4.2-3-.1-4.7 1.3-5 4.2ZM12 17c3 0 4.7-1.4 5-4.2-3-.1-4.7 1.3-5 4.2Z"/></svg>
    case 'lupin': return <svg {...common}><path d="M12 21v-7"/><path d="M12 5.2c1.7-2.1 4.8-.6 4.4 2-.3 1.7-2 2.8-4.4 3.5-2.4-.7-4.1-1.8-4.4-3.5-.4-2.6 2.7-4.1 4.4-2Z"/><path d="M12 11.2c2.8-1.6 5.2-.8 6 1.4-1.6 2.2-4.1 2.5-6 1.3-1.9 1.2-4.4.9-6-1.3.8-2.2 3.2-3 6-1.4Z"/></svg>
    case 'milk': return <svg {...common}><path d="M8 3h8l1 4v14H7V7l1-4Z"/><path d="M8 7h9M10 3v4"/></svg>
    case 'molluscs': return <svg {...common}><path d="M4 18c.8-7.6 4-12 8-12s7.2 4.4 8 12H4Z"/><path d="M12 6v12M8.2 7.8 10 18M15.8 7.8 14 18M5.7 12.2 8 18M18.3 12.2 16 18"/></svg>
    case 'mustard': return <svg {...common}><path d="M8 7h8l1 3v10H7V10l1-3Z"/><path d="M9 4h6v3M9.5 13h5M10 16h4"/></svg>
    case 'nuts': return <svg {...common}><path d="M12 5c3.8 0 6 2.6 6 6.4 0 4.4-2.6 7.6-6 7.6s-6-3.2-6-7.6C6 7.6 8.2 5 12 5Z"/><path d="M8.5 8.2c1.1 1.3 2.3 2 3.5 2s2.4-.7 3.5-2M9 13h6M10 16h4"/></svg>
    case 'peanuts': return <svg {...common}><path d="M9.4 4.7c2.2-1 4.3.2 4.6 2.5.2 1.2.6 1.7 1.6 2.4 2 1.5 2.1 4.5.3 6.2-1.7 1.7-4.4 1.5-5.8-.3-.7-.9-1.2-1.2-2.3-1.4-2.4-.4-3.7-2.9-2.8-5.1.8-2 2.4-3 4.4-4.3Z"/><path d="M8.2 8.2 15 14.8M10.3 6.8l5.9 5.8M6.9 10.7l5.9 5.8"/></svg>
    case 'sesame': return <svg {...common}><path d="M9 7.2c0 1.4-1 2.4-2.1 2.4S5 8.6 5 7.2s.9-2.7 1.9-3.7C8.1 4.5 9 5.8 9 7.2ZM15 8c0 1.4-1 2.4-2.1 2.4S11 9.4 11 8s.9-2.7 1.9-3.7C14.1 5.3 15 6.6 15 8ZM19 13c0 1.4-1 2.4-2.1 2.4S15 14.4 15 13s.9-2.7 1.9-3.7C18.1 10.3 19 11.6 19 13ZM11 15c0 1.4-1 2.4-2.1 2.4S7 16.4 7 15s.9-2.7 1.9-3.7C10.1 12.3 11 13.6 11 15Z"/></svg>
    case 'soy': return <svg {...common}><path d="M4 14c4.4-5.2 9.4-6.8 16-5.2-1.2 6-5.8 9.4-12 8.6-2.3-.3-3.6-1.3-4-3.4Z"/><circle cx="9" cy="13.3" r="1.1"/><circle cx="13" cy="12" r="1.1"/><circle cx="17" cy="11.2" r="1.1"/></svg>
    case 'sulphites': return <svg {...common}><path d="M9 3h6M10 3v5l-5 9.3A2.5 2.5 0 0 0 7.2 21h9.6a2.5 2.5 0 0 0 2.2-3.7L14 8V3"/><path d="M7.5 16h9"/></svg>
    case 'calories': return <svg {...common}><path d="M13.5 3.5c.6 3-1.1 4.4-2.5 5.9-1.1 1.2-1.9 2.4-1.6 4 .3 1.5 1.4 2.5 2.9 2.7-1.1-1.4-.7-2.8.4-4 1.5-1.6 3.2-3.3 2.7-6.4 2.9 2.3 4.2 5.2 3.4 8.5-.9 3.8-3.6 6.1-7 6.1-3.7 0-6.8-2.7-6.8-6.4 0-3.1 1.8-5.2 4.3-7.2-.1 2 .5 3.2 1.4 4.1.1-3.1 1.4-5.2 2.8-7.3Z"/></svg>
    case 'serving': return <svg {...common}><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.8"/><path d="M3 20h18"/></svg>
    case 'protein': return <svg {...common}><path d="M4 10v4M7 8v8M17 8v8M20 10v4M7 12h10"/></svg>
    case 'carbs': return <svg {...common}><path d="M5 16c0-4.5 3-8 7-8s7 3.5 7 8H5Z"/><path d="M8 11.3c1.3 1.2 2.6 1.7 4 1.7s2.7-.5 4-1.7M4 18h16"/></svg>
    case 'fat': return <svg {...common}><path d="M12 3.5S6.5 10 6.5 14a5.5 5.5 0 0 0 11 0c0-4-5.5-10.5-5.5-10.5Z"/></svg>
    case 'sugar': return <svg {...common}><path d="m12 4 6 3.3v6.9L12 17.5 6 14.2V7.3L12 4Z"/><path d="m6 7.3 6 3.4 6-3.4M12 10.7v6.8"/></svg>
    case 'prep': return <svg {...common}><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3.2 2"/></svg>
    default: return <svg {...common}><path d="M12 3.5 21 20H3L12 3.5Z"/><path d="M12 9v4.5M12 17h.01"/></svg>
  }
}

type FoodInfoCopy = {
  dietary: string
  allergens: string
  nutrition: string
  calories: string
  serving: string
  protein: string
  carbs: string
  fat: string
  sugar: string
  prep: string
  halal: string
  vegetarian: string
  vegan: string
}

function foodInfoCopy(locale: string): FoodInfoCopy {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return { dietary: 'Ernährung', allergens: 'Allergene', nutrition: 'Nährwerte & Zubereitung', calories: 'Kalorien', serving: 'Portionsgröße', protein: 'Protein', carbs: 'Kohlenhydrate', fat: 'Fett', sugar: 'Zucker', prep: 'Zubereitungszeit', halal: 'Halal', vegetarian: 'Vegetarisch', vegan: 'Vegan' }
  if (lang === 'fa') return { dietary: 'ویژگی‌های غذایی', allergens: 'آلرژن‌ها', nutrition: 'ارزش غذایی و آماده‌سازی', calories: 'کالری', serving: 'اندازه سرو', protein: 'پروتئین', carbs: 'کربوهیدرات', fat: 'چربی', sugar: 'قند', prep: 'زمان آماده‌سازی', halal: 'حلال', vegetarian: 'گیاه‌خواری', vegan: 'وگان' }
  if (lang === 'tr') return { dietary: 'Beslenme özellikleri', allergens: 'Alerjenler', nutrition: 'Besin değerleri ve hazırlık', calories: 'Kalori', serving: 'Porsiyon', protein: 'Protein', carbs: 'Karbonhidrat', fat: 'Yağ', sugar: 'Şeker', prep: 'Hazırlık süresi', halal: 'Helal', vegetarian: 'Vejetaryen', vegan: 'Vegan' }
  if (lang === 'ja') return { dietary: '食事情報', allergens: 'アレルゲン', nutrition: '栄養・調理情報', calories: 'カロリー', serving: '1食分', protein: 'たんぱく質', carbs: '炭水化物', fat: '脂質', sugar: '糖類', prep: '調理時間', halal: 'ハラール', vegetarian: 'ベジタリアン', vegan: 'ヴィーガン' }
  return { dietary: 'Food features', allergens: 'Allergens', nutrition: 'Nutrition & preparation', calories: 'Calories', serving: 'Serving size', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', sugar: 'Sugar', prep: 'Prep time', halal: 'Halal', vegetarian: 'Vegetarian', vegan: 'Vegan' }
}

function normalizeName(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9äöüßşğıç]+/g, ' ').trim()
}

function allergenKind(name: string): FoodGlyphKind {
  const key = normalizeName(name)
  if (/celery|sellerie|kereviz/.test(key)) return 'celery'
  if (/crustace|shellfish|krebst|kabuklu/.test(key)) return 'crustaceans'
  if (/egg|eier|yumurta/.test(key)) return 'eggs'
  if (/fish|fisch|balik/.test(key)) return 'fish'
  if (/gluten|wheat|weizen|bugday/.test(key)) return 'gluten'
  if (/lupin|lupine/.test(key)) return 'lupin'
  if (/milk|lactose|milch|laktose|sut/.test(key)) return 'milk'
  if (/mollusc|weichtier|yumusakca/.test(key)) return 'molluscs'
  if (/mustard|senf|hardal/.test(key)) return 'mustard'
  if (/peanut|erdnuss|yer fistik/.test(key)) return 'peanuts'
  if (/nut|nuss|findik|ceviz/.test(key)) return 'nuts'
  if (/sesame|sesam|susam/.test(key)) return 'sesame'
  if (/soy|soja|soya/.test(key)) return 'soy'
  if (/sulph|sulf|schwefel/.test(key)) return 'sulphites'
  return 'allergen'
}

function metric(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10)
}

function prepTimeLabel(value: number): string {
  const rounded = Math.round(value)
  if (rounded === 10) return '5–10 min'
  if (rounded === 20) return '10–20 min'
  if (rounded === 30) return '20–30 min'
  if (rounded === 45) return '30–45 min'
  return `~${metric(value)} min`
}

export function FoodDetails({ item }: { item: MenuItem }) {
  const { locale } = useMenuRuntime()
  const copy = foodInfoCopy(locale)
  const allergens = Array.from(new Set(item.allergens.map((value) => String(value || '').trim()).filter(Boolean)))
  const diets = [
    item.halal ? { key: 'halal' as const, label: copy.halal } : null,
    item.vegetarian ? { key: 'vegetarian' as const, label: copy.vegetarian } : null,
    item.vegan ? { key: 'vegan' as const, label: copy.vegan } : null,
  ].filter(Boolean) as Array<{ key: 'halal' | 'vegetarian' | 'vegan'; label: string }>

  const nutrition = item.nutrition
  const nutrients = nutrition ? [
    nutrition.calories != null ? { key: 'calories' as const, label: copy.calories, value: `${metric(nutrition.calories)} kcal` } : null,
    nutrition.servingSize ? { key: 'serving' as const, label: copy.serving, value: nutrition.servingSize } : null,
    nutrition.protein != null ? { key: 'protein' as const, label: copy.protein, value: `${metric(nutrition.protein)} g` } : null,
    nutrition.carbs != null ? { key: 'carbs' as const, label: copy.carbs, value: `${metric(nutrition.carbs)} g` } : null,
    nutrition.fat != null ? { key: 'fat' as const, label: copy.fat, value: `${metric(nutrition.fat)} g` } : null,
    nutrition.sugar != null ? { key: 'sugar' as const, label: copy.sugar, value: `${metric(nutrition.sugar)} g` } : null,
  ].filter(Boolean) as Array<{ key: FoodGlyphKind; label: string; value: string }> : []

  if (item.prepTimeMinutes != null) {
    nutrients.push({ key: 'prep', label: copy.prep, value: prepTimeLabel(item.prepTimeMinutes) })
  }

  if (!diets.length && !allergens.length && !nutrients.length) return null

  return (
    <div className={styles.root} data-pmd-food-details="r43">
      {diets.length > 0 && (
        <section className={styles.section} data-pmd-food-features="r43">
          <div className={styles.heading}><FoodGlyph kind="vegetarian" /><strong>{copy.dietary}</strong></div>
          <div className={styles.dietRow}>
            {diets.map((diet) => (
              <span className={styles.dietChip} key={diet.key}>
                <FoodGlyph kind={diet.key} />
                <span>{diet.label}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {allergens.length > 0 && (
        <section className={styles.section} data-pmd-allergens="r43">
          <div className={styles.heading}><FoodGlyph kind="allergen" /><strong>{copy.allergens}</strong></div>
          <div className={styles.allergenGrid}>
            {allergens.map((allergen) => (
              <span className={styles.allergenChip} key={allergen}>
                <FoodGlyph kind={allergenKind(allergen)} />
                <span>{allergen}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {nutrients.length > 0 && (
        <section className={styles.section} data-pmd-nutrition="r43">
          <div className={styles.heading}><FoodGlyph kind="calories" /><strong>{copy.nutrition}</strong></div>
          <div className={styles.nutritionGrid}>
            {nutrients.map((entry) => (
              <div className={styles.nutritionCell} key={`${entry.key}:${entry.label}`}>
                <span className={styles.metricIcon}><FoodGlyph kind={entry.key} /></span>
                <span className={styles.metricText}><small>{entry.label}</small><strong>{entry.value}</strong></span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
