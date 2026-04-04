import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncates text to a maximum length without cutting words
 * @param text - The text to truncate
 * @param maxLength - Maximum length (default: 66)
 * @returns Truncated text with "..." appended if truncated
 */
export function truncateText(text: string, maxLength: number = 66): string {
  if (!text || text.length <= maxLength) {
    return text
  }

  // Find the last space before maxLength
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  // If we found a space, truncate at that space
  // Otherwise, truncate at maxLength (edge case: very long word)
  const cutPoint = lastSpace > 0 ? lastSpace : maxLength
  
  return text.substring(0, cutPoint) + '...'
}
