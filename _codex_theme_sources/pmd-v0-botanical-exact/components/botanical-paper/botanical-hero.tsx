import { Phone } from "lucide-react"
import { WavyDivider } from "./botanical-ui"
import { OrnamentTwig } from "./botanical-icons"

export type BotanicalHeroProps = {
  restaurantName?: string
  tagline?: string
  heading?: string
  description?: string
  heroImageUrl?: string
  phoneNumber?: string
  onCallToOrder?: () => void
}

export function BotanicalHero({
  restaurantName = "Mimoza Restaurant",
  tagline = "Farm to Table",
  heading = "Nourished by Nature.",
  description = "Thoughtfully sourced. Beautifully prepared. Made to be shared.",
  heroImageUrl = "/themes/botanical-paper/hero-bg.png",
  phoneNumber = "(415) 555-0128",
  onCallToOrder,
}: BotanicalHeroProps) {
  return (
    <section className="relative">
      <div className="relative overflow-hidden">
        {/* background photo */}
        <img
          src={heroImageUrl || "/placeholder.svg"}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover"
        />
        {/* paper-tone gradient overlay keeps the left-side text legible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, var(--pmd-paper) 0%, color-mix(in srgb, var(--pmd-paper) 88%, transparent) 34%, color-mix(in srgb, var(--pmd-paper) 30%, transparent) 60%, transparent 78%)",
          }}
        />

        <div className="relative px-6 pb-16 pt-10 sm:px-8 md:pb-24 md:pt-14">
          {/* tagline ornament */}
          <div className="mx-auto mb-7 flex items-center justify-center gap-3 text-[var(--pmd-primary)] md:hidden">
            <OrnamentTwig className="h-3 w-10 opacity-70" />
            <OrnamentTwig mirror className="h-3 w-10 opacity-70" />
          </div>

          <div className="max-w-md">
            <h1 className="font-serif text-5xl font-semibold leading-[1.04] tracking-tight text-[var(--pmd-ink)] text-balance md:text-6xl">
              {heading}
            </h1>

            <div className="mt-5 flex items-center gap-2 text-[var(--pmd-accent)]">
              <span className="h-px w-8 bg-[var(--pmd-accent-soft)]" />
              <OrnamentTwig className="h-3 w-10" />
              <span className="h-px w-8 bg-[var(--pmd-accent-soft)]" />
            </div>

            <p className="mt-5 max-w-xs text-pretty text-[15px] leading-relaxed text-[var(--pmd-muted)]">
              {description}
            </p>

            <button
              type="button"
              onClick={onCallToOrder}
              className="group mt-7 inline-flex items-center gap-3 rounded-full bg-[var(--pmd-primary)] py-2 pl-2 pr-6 text-left shadow-[0_10px_24px_-12px_rgba(60,53,41,0.55)] transition-colors hover:bg-[var(--pmd-primary-dark)]"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-[var(--pmd-paper-soft)] text-[var(--pmd-primary)]">
                <Phone className="size-5" />
              </span>
              <span className="leading-tight text-[var(--pmd-paper-soft)]">
                <span className="block text-sm font-semibold uppercase tracking-[0.16em]">
                  Call to Order
                </span>
                <span className="block text-xs opacity-80">{phoneNumber}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <WavyDivider flip />
    </section>
  )
}
