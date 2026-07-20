"use client"

import { motion } from "framer-motion"
import type { MenuItem } from "@/lib/data"
import { MenuItemCard } from "./menu-item-card"

interface MenuSectionProps {
  title: string
  items: MenuItem[]
  onSelectItem: (item: MenuItem) => void
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export function MenuSection({ title, items, onSelectItem }: MenuSectionProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-gray-500">No items available in this category yet.</p>
      </div>
    )
  }

  return (
    <section className="w-full mb-12">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8 px-4 pb-24"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {items.map((item) => (
          <MenuItemCard key={item.id} item={item} onSelect={onSelectItem} />
        ))}
      </motion.div>
    </section>
  )
}
