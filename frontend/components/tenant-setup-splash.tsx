import Link from "next/link"

export function TenantSetupSplash() {
  return (
    <div className="min-h-[55vh] flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/30 bg-white/35 backdrop-blur-xl shadow-2xl p-8 text-center">
        <h2 className="text-2xl font-semibold text-paydine-elegant-gray mb-3">Welcome to PayMyDine</h2>
        <p className="text-sm md:text-base text-gray-700 mb-6">
          Your restaurant frontend is ready. Set up your menu, categories, images, and restaurant details from the admin panel.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--theme-button)", color: "var(--theme-background)" }}
        >
          Set up your restaurant
        </Link>
      </div>
    </div>
  )
}
