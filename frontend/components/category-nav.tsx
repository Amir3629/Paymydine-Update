"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useLanguageStore } from "@/store/language-store"
import { useRef, useEffect, useState } from "react"

// FIXED: Update interface to use dynamic categories
interface CategoryNavProps {
  categories: string[] // FIXED: Changed from hardcoded union to string array
  selectedCategory: string // FIXED: Changed from hardcoded union to string
  onSelectCategory: (category: string) => void // FIXED: Changed parameter type
}

export function CategoryNav({ categories, selectedCategory, onSelectCategory }: CategoryNavProps) {
  const { t } = useLanguageStore()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)

  // FIXED: Remove all mapping - use API category names directly
  const getCategoryDisplayName = (category: string): string => {
    // FIXED: Return the original category name from API, no mapping
    return category
  }

  // FIXED: Check scroll position for shadow effects
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setShowLeftShadow(scrollLeft > 0)
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1)
  }

  // FIXED: Handle scroll events
  const handleScroll = () => {
    checkScrollPosition()
  }

  // FIXED: Initialize shadow states
  useEffect(() => {
    checkScrollPosition()
    const container = scrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [categories])

  return (
    <div className="relative w-full mb-8">
      {/* FIXED: Scrollable container with elegant scroll */}
      <div 
        ref={scrollContainerRef}
        className={cn(
          "w-full overflow-x-auto scroll-smooth pb-2 no-scrollbar",
          showLeftShadow && "mask-gradient-left",
          showRightShadow && "mask-gradient-right"
        )}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <div className="flex space-x-3 px-4 min-w-max">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={cn(
                "relative whitespace-nowrap rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300 category-tab",
                selectedCategory === category ? "is-active" : "text-gray-500 hover:text-theme",
              )}
            >
              {selectedCategory === category && (
                <motion.div
                  layoutId="category-underline"
                  className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--theme-category-active)' }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{getCategoryDisplayName(category)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}