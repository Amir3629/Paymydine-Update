"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { useCmsStore } from "@/store/cms-store"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

export default function EditMenuItemPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { menuItems, updateMenuItem } = useCmsStore()
  const { toast } = useToast()
  const item = menuItems.find((i) => i.id === Number(resolvedParams.id))
  const [isSuggestingNutrition, setIsSuggestingNutrition] = useState(false)
  const [nutritionMessage, setNutritionMessage] = useState<string | null>(null)
  const [nutritionValues, setNutritionValues] = useState({
    calories: item?.calories ?? "",
    protein: item?.protein ?? "",
    fat: item?.fat ?? "",
    carbs: item?.carbs ?? "",
    sugar: item?.sugar ?? "",
  })
  const [ingredientNotes, setIngredientNotes] = useState(item?.description ?? "")

  if (!item) {
    return <div>Item not found</div>
  }

  const setNutritionValue = (field: keyof typeof nutritionValues, value: string) => {
    setNutritionValues((current) => ({ ...current, [field]: value }))
  }

  const handleSuggestNutrition = async () => {
    setIsSuggestingNutrition(true)
    setNutritionMessage(null)

    const response = await apiClient.suggestNutrition({
      food_name: item.name,
      ingredients: ingredientNotes,
    })

    setIsSuggestingNutrition(false)

    if (!response.success || !response.data) {
      const message = response.message || "Unable to suggest nutrition right now."
      setNutritionMessage(message)
      toast({ title: "AI nutrition suggestion failed", description: message })
      return
    }

    setNutritionValues({
      calories: response.data.calories,
      protein: response.data.protein,
      fat: response.data.fat,
      carbs: response.data.carbs,
      sugar: response.data.sugar,
    })

    const source = response.data.source === "openai" ? "AI" : "fallback estimate"
    setNutritionMessage(response.data.disclaimer || `Applied ${source} nutrition values. Review before saving.`)
    toast({ title: "Nutrition suggested", description: `Applied ${source} values. Review before saving.` })
  }

  const toOptionalNumber = (value: FormDataEntryValue | null) => {
    if (value === null || value === "") return null
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : null
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const updatedItem = {
      ...item,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: Number(formData.get("price")),
      image: formData.get("image") as string,
      calories: toOptionalNumber(formData.get("calories")),
      protein: toOptionalNumber(formData.get("protein")),
      fat: toOptionalNumber(formData.get("fat")),
      carbs: toOptionalNumber(formData.get("carbs")),
      sugar: toOptionalNumber(formData.get("sugar")),
      allergens: (formData.get("allergens") as string)?.split(",").map((s) => s.trim()).filter(Boolean) || [],
    }
    updateMenuItem(updatedItem)
    toast({ title: "Menu Item Updated", description: `${updatedItem.name} has been saved.` })
    router.push("/admin/menu")
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Edit: {item.name}</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl bg-white p-8 rounded-xl shadow space-y-6">
        {/* Form fields for all item properties */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={item.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={item.description} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" step="0.01" defaultValue={item.price} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calories">Calories</Label>
            <Input
              id="calories"
              name="calories"
              type="number"
              min="0"
              value={nutritionValues.calories}
              onChange={(event) => setNutritionValue("calories", event.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-ingredients">Ingredients / preparation notes for AI suggestion</Label>
            <Textarea
              id="ai-ingredients"
              value={ingredientNotes}
              onChange={(event) => setIngredientNotes(event.target.value)}
              placeholder="Example: grilled chicken, rice, garlic sauce, salad"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input id="protein" name="protein" type="number" min="0" step="0.1" value={nutritionValues.protein} onChange={(event) => setNutritionValue("protein", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input id="fat" name="fat" type="number" min="0" step="0.1" value={nutritionValues.fat} onChange={(event) => setNutritionValue("fat", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input id="carbs" name="carbs" type="number" min="0" step="0.1" value={nutritionValues.carbs} onChange={(event) => setNutritionValue("carbs", event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sugar">Sugar (g)</Label>
              <Input id="sugar" name="sugar" type="number" min="0" step="0.1" value={nutritionValues.sugar} onChange={(event) => setNutritionValue("sugar", event.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSuggestNutrition}
              disabled={isSuggestingNutrition}
              aria-label="Suggest calories and nutrition with AI"
            >
              {isSuggestingNutrition ? "Suggesting…" : "AI Suggest"}
            </Button>
            <p className="text-xs text-gray-600">
              Suggestions are estimates. Review and edit values before saving.
            </p>
          </div>
          {nutritionMessage && (
            <p className="rounded-lg bg-white px-3 py-2 text-sm text-gray-700" role="status">
              {nutritionMessage}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Image URL</Label>
          <Input id="image" name="image" defaultValue={item.image} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="allergens">Allergens (comma-separated)</Label>
          <Input id="allergens" name="allergens" defaultValue={item.allergens?.join(", ") || ""} />
        </div>
        <Button type="submit">Save Changes</Button>
      </form>
    </div>
  )
}
