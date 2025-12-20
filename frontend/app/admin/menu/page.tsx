"use client"

import Link from "next/link"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { useCmsStore } from "@/store/cms-store"
import { Button } from "@/components/ui/button"

export default function MenuManagementPage() {
  const { menuItems } = useCmsStore()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Menu Management</h1>
      <div className="space-y-4">
        {menuItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-white p-4 rounded-xl shadow">
            <div className="flex items-center space-x-4">
              <OptimizedImage
                src={item.image || "/placeholder.svg"}
                alt={item.name}
                width={64}
                height={64}
                className="rounded-md object-contain"
              />
              <div>
                <h2 className="font-semibold">{item.name}</h2>
                <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
              </div>
            </div>
            <Button asChild>
              <Link href={`/admin/menu/${item.id}`}>Edit</Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
