"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

const effectNames = [
  "Button Animation",
  "Fly to Cart",
  "Toast Notification",
  "Cart Icon Animation",
  "Smoothie Card Toast",
  "Mini Cart Preview",
  "Expanding Bottom Toolbar"
]

export function EffectNavigation() {
  const pathname = usePathname()
  const currentEffect = parseInt(pathname.split('/')[1]) || 1

  return (
    <div className="flex justify-center items-center py-8 bg-white border-b border-gray-100 overflow-x-auto">
      <div className="flex space-x-6 px-4">
        {effectNames.map((name, i) => {
          const effectNumber = i + 1
          const isActive = currentEffect === effectNumber
          
          return (
            <Link
              key={i}
              href={`/${effectNumber}`}
              className={clsx(
                "flex flex-col items-center space-y-2 px-4 py-2 rounded-lg transition-all duration-200",
                "hover:bg-paydine-champagne/10",
                isActive && "bg-paydine-champagne/20"
              )}
            >
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-200",
                  isActive
                    ? "bg-paydine-champagne text-paydine-elegant-gray shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-paydine-champagne/30"
                )}
              >
                {effectNumber}
              </div>
              <span
                className={clsx(
                  "text-xs font-medium text-center max-w-20 leading-tight",
                  isActive ? "text-paydine-elegant-gray" : "text-gray-500"
                )}
              >
                {name}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
} 