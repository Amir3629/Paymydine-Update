import type { Category, MenuSectionData } from "./types"
import { LeafGlyph, BowlGlyph, SproutGlyph, CakeGlyph, Grid2Glyph } from "./botanical-icons"

const IMG = "/themes/botanical-paper"

export const sampleCategories: Category[] = [
  { id: "all", name: "All", icon: <Grid2Glyph className="size-7" /> },
  { id: "seasonal", name: "Seasonal", icon: <LeafGlyph className="size-7" /> },
  { id: "appetizer", name: "Appetizer", icon: <BowlGlyph className="size-7" /> },
  { id: "main", name: "Main Course", icon: <SproutGlyph className="size-7" /> },
  { id: "drinks", name: "Drinks", icon: <BowlGlyph className="size-7" /> },
  { id: "desserts", name: "Desserts", icon: <CakeGlyph className="size-7" /> },
]

export const sampleSections: MenuSectionData[] = [
  {
    id: "seasonal",
    title: "Seasonal",
    subtitle: "Inspired by what's fresh right now.",
    categoryId: "seasonal",
    items: [
      {
        id: "heirloom-tomato",
        name: "Heirloom Tomato Salad",
        description: "Burrata, basil oil, pickled shallot, herb crumble.",
        price: 16,
        image: `${IMG}/heirloom-tomato-salad.png`,
        categoryName: "Seasonal",
        isNew: true,
        isVegetarian: true,
        isGlutenFree: true,
        allergens: ["Dairy"],
        options: [
          {
            id: "size",
            name: "Portion",
            required: true,
            values: [
              { id: "half", name: "Starter" },
              { id: "full", name: "Sharing", price: 7 },
            ],
          },
          {
            id: "addons",
            name: "Add to your plate",
            multiple: true,
            values: [
              { id: "burrata", name: "Extra burrata", price: 4 },
              { id: "prosciutto", name: "Prosciutto", price: 5 },
            ],
          },
        ],
      },
      {
        id: "stone-fruit",
        name: "Grilled Stone Fruit & Greens",
        description: "Arugula, goat cheese, toasted almonds, sherry vinaigrette.",
        price: 15,
        image: `${IMG}/grilled-stone-fruit.png`,
        categoryName: "Seasonal",
        isVegetarian: true,
        allergens: ["Nuts", "Dairy"],
      },
    ],
  },
  {
    id: "main",
    title: "Main Course",
    subtitle: "Wholesome. Balanced. Satisfying.",
    categoryId: "main",
    items: [
      {
        id: "harvest-bowl",
        name: "Harvest Grain Bowl",
        description: "Farro, roasted squash, kale, chickpeas, tahini drizzle.",
        price: 18,
        image: `${IMG}/harvest-grain-bowl.png`,
        categoryName: "Main Course",
        isBestSeller: true,
        isVegan: true,
        isVegetarian: true,
        allergens: ["Sesame"],
        options: [
          {
            id: "protein",
            name: "Add protein",
            values: [
              { id: "none", name: "Keep it plant-based" },
              { id: "chicken", name: "Roast chicken", price: 5 },
              { id: "salmon", name: "Seared salmon", price: 7 },
            ],
          },
        ],
      },
      {
        id: "roasted-chicken",
        name: "Herb Roasted Chicken",
        description: "Free-range chicken, seasonal roots, pan jus.",
        price: 26,
        image: `${IMG}/roasted-chicken.png`,
        categoryName: "Main Course",
        isChefRecommended: true,
        isHalal: true,
        isGlutenFree: true,
      },
    ],
  },
  {
    id: "drinks",
    title: "Drinks",
    subtitle: "Brewed and pressed in-house.",
    categoryId: "drinks",
    items: [
      {
        id: "herbal-tea",
        name: "Garden Herbal Infusion",
        description: "Chamomile, lemon verbena, raw honey.",
        price: 6,
        image: `${IMG}/herbal-tea.png`,
        categoryName: "Drinks",
        isVegetarian: true,
        isSoldOut: true,
      },
    ],
  },
  {
    id: "desserts",
    title: "Desserts",
    subtitle: "A gentle, sweet finish.",
    categoryId: "desserts",
    items: [
      {
        id: "honey-cake",
        name: "Honey Lavender Cake",
        description: "Crème fraîche, wildflower honey, edible blossoms.",
        price: 11,
        image: `${IMG}/honey-cake.png`,
        categoryName: "Desserts",
        isChefRecommended: true,
        isVegetarian: true,
        allergens: ["Gluten", "Dairy", "Eggs"],
      },
    ],
  },
]
