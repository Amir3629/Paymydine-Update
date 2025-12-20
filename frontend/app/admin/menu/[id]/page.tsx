"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useCmsStore } from "@/store/cms-store"
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

  if (!item) {
    return <div>Item not found</div>
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
      calories: Number(formData.get("calories")),
      allergens: (formData.get("allergens") as string)?.split(",").map((s) => s.trim()) || [],
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
            <Input id="calories" name="calories" type="number" defaultValue={item.calories} />
          </div>
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
