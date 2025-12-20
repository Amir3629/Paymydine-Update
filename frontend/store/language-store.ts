import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { translations, type Language, type TranslationKey } from "@/lib/translations"

type LanguageState = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
      t: (key) => translations[get().language][key] || translations.en[key],
    }),
    {
      name: "paymydine-language-storage",
      storage: createJSONStorage(() => {
        // Check if we're on the client side
        if (typeof window !== "undefined") {
          return localStorage
        }
        // Return a mock storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
    },
  ),
)
