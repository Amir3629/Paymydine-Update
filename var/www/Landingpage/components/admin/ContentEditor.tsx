"use client"

import { useState } from "react"
import type { CMSContent } from "@/lib/db"
import { Plus, Trash2 } from "lucide-react"

interface ContentEditorProps {
  content: CMSContent
  onUpdate: (updates: Partial<CMSContent>) => void
}

export default function ContentEditor({ content, onUpdate }: ContentEditorProps) {
  const [activeSection, setActiveSection] = useState("hero")

  const updateSection = (section: keyof CMSContent, data: any) => {
    onUpdate({ [section]: data })
  }

  const renderHeroEditor = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Hero Section</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input
          type="text"
          value={content.hero.title}
          onChange={(e) => updateSection("hero", { ...content.hero, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
        <textarea
          value={content.hero.subtitle}
          onChange={(e) => updateSection("hero", { ...content.hero, subtitle: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary CTA</label>
          <input
            type="text"
            value={content.hero.primaryCTA}
            onChange={(e) => updateSection("hero", { ...content.hero, primaryCTA: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Secondary CTA</label>
          <input
            type="text"
            value={content.hero.secondaryCTA}
            onChange={(e) => updateSection("hero", { ...content.hero, secondaryCTA: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
          />
        </div>
      </div>
    </div>
  )

  const renderFeaturesEditor = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Features Section</h3>
        <button
          onClick={() => {
            const newFeature = {
              id: Date.now().toString(),
              title: "New Feature",
              description: "Feature description",
              icon: "Star",
              order: content.features.length + 1,
            }
            updateSection("features", [...content.features, newFeature])
          }}
          className="bg-accent-600 text-white px-4 py-2 rounded-lg hover:bg-accent-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Feature
        </button>
      </div>

      <div className="space-y-4">
        {content.features.map((feature, index) => (
          <div key={feature.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium">Feature {index + 1}</h4>
              <button
                onClick={() => {
                  const updatedFeatures = content.features.filter((f) => f.id !== feature.id)
                  updateSection("features", updatedFeatures)
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={feature.title}
                  onChange={(e) => {
                    const updatedFeatures = content.features.map((f) =>
                      f.id === feature.id ? { ...f, title: e.target.value } : f,
                    )
                    updateSection("features", updatedFeatures)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                <input
                  type="text"
                  value={feature.icon}
                  onChange={(e) => {
                    const updatedFeatures = content.features.map((f) =>
                      f.id === feature.id ? { ...f, icon: e.target.value } : f,
                    )
                    updateSection("features", updatedFeatures)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={feature.description}
                onChange={(e) => {
                  const updatedFeatures = content.features.map((f) =>
                    f.id === feature.id ? { ...f, description: e.target.value } : f,
                  )
                  updateSection("features", updatedFeatures)
                }}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderPricingEditor = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Pricing Section</h3>
        <button
          onClick={() => {
            const newPlan = {
              id: Date.now().toString(),
              name: "New Plan",
              price: "€99",
              period: "/month",
              description: "Plan description",
              features: ["Feature 1", "Feature 2"],
              popular: false,
              stripeLink: "",
              order: content.pricing.length + 1,
            }
            updateSection("pricing", [...content.pricing, newPlan])
          }}
          className="bg-accent-600 text-white px-4 py-2 rounded-lg hover:bg-accent-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      <div className="space-y-6">
        {content.pricing.map((plan, index) => (
          <div key={plan.id} className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium">{plan.name}</h4>
              <button
                onClick={() => {
                  const updatedPlans = content.pricing.filter((p) => p.id !== plan.id)
                  updateSection("pricing", updatedPlans)
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => {
                    const updatedPlans = content.pricing.map((p) =>
                      p.id === plan.id ? { ...p, name: e.target.value } : p,
                    )
                    updateSection("pricing", updatedPlans)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="text"
                  value={plan.price}
                  onChange={(e) => {
                    const updatedPlans = content.pricing.map((p) =>
                      p.id === plan.id ? { ...p, price: e.target.value } : p,
                    )
                    updateSection("pricing", updatedPlans)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={plan.description}
                onChange={(e) => {
                  const updatedPlans = content.pricing.map((p) =>
                    p.id === plan.id ? { ...p, description: e.target.value } : p,
                  )
                  updateSection("pricing", updatedPlans)
                }}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Link</label>
              <input
                type="url"
                value={plan.stripeLink}
                onChange={(e) => {
                  const updatedPlans = content.pricing.map((p) =>
                    p.id === plan.id ? { ...p, stripeLink: e.target.value } : p,
                  )
                  updateSection("pricing", updatedPlans)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
                placeholder="https://buy.stripe.com/..."
              />
            </div>

            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id={`popular-${plan.id}`}
                checked={plan.popular}
                onChange={(e) => {
                  const updatedPlans = content.pricing.map((p) =>
                    p.id === plan.id ? { ...p, popular: e.target.checked } : p,
                  )
                  updateSection("pricing", updatedPlans)
                }}
                className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded"
              />
              <label htmlFor={`popular-${plan.id}`} className="ml-2 block text-sm text-gray-900">
                Mark as Popular
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Features (one per line)</label>
              <textarea
                value={plan.features.join("\n")}
                onChange={(e) => {
                  const updatedPlans = content.pricing.map((p) =>
                    p.id === plan.id ? { ...p, features: e.target.value.split("\n").filter((f) => f.trim()) } : p,
                  )
                  updateSection("pricing", updatedPlans)
                }}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: "hero", label: "Hero" },
            { id: "features", label: "Features" },
            { id: "pricing", label: "Pricing" },
            { id: "testimonials", label: "Testimonials" },
            { id: "faqs", label: "FAQs" },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === section.id
                  ? "border-accent-500 text-accent-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {activeSection === "hero" && renderHeroEditor()}
        {activeSection === "features" && renderFeaturesEditor()}
        {activeSection === "pricing" && renderPricingEditor()}
        {/* Add other section editors as needed */}
      </div>
    </div>
  )
}
