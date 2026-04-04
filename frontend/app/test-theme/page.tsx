"use client"

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

export default function TestThemePage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadThemeSettings() {
      try {
        console.log('🔍 Fetching theme settings...')
        const response = await apiClient.getThemeSettings()
        console.log('📦 API Response:', response)
        
        if (response.success) {
          setSettings(response.data)
          console.log('✅ Settings loaded:', response.data)
          
          // Apply CSS variables immediately
          if (response.data.primary_color) {
            document.documentElement.style.setProperty('--test-primary', response.data.primary_color)
          }
          if (response.data.secondary_color) {
            document.documentElement.style.setProperty('--test-secondary', response.data.secondary_color)
          }
        } else {
          setError('Failed to load settings')
        }
      } catch (err) {
        console.error('❌ Error loading theme settings:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadThemeSettings()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading theme settings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-2xl">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--test-secondary, #F5E6D3)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8" style={{ color: 'var(--test-primary, #D4AF37)' }}>
          🎨 Theme Settings Test
        </h1>
        
        <div className="bg-white rounded-lg p-6 shadow-lg mb-6">
          <h2 className="text-2xl font-semibold mb-4">Current Settings from Admin Panel:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Restaurant Name:</strong> {settings?.restaurant_name || 'Not set'}
            </div>
            <div>
              <strong>Table Number:</strong> {settings?.table_number || 'Not set'}
            </div>
            <div>
              <strong>Primary Color:</strong> 
              <span 
                className="inline-block w-6 h-6 rounded ml-2 border border-gray-300"
                style={{ backgroundColor: settings?.primary_color }}
              ></span>
              {settings?.primary_color}
            </div>
            <div>
              <strong>Secondary Color:</strong> 
              <span 
                className="inline-block w-6 h-6 rounded ml-2 border border-gray-300"
                style={{ backgroundColor: settings?.secondary_color }}
              ></span>
              {settings?.secondary_color}
            </div>
            <div>
              <strong>Enable Tips:</strong> {settings?.enable_tips ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Tip Percentage:</strong> {settings?.default_tip_percentage}%
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg p-6 text-white text-center"
          style={{ backgroundColor: 'var(--test-primary, #D4AF37)' }}
        >
          <h3 className="text-2xl font-bold">This box uses PRIMARY COLOR from admin panel</h3>
          <p className="mt-2">Change the Primary Color in admin panel and refresh this page!</p>
        </div>

        <div className="mt-6 bg-gray-100 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">🔧 Testing Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to TastyIgniter Admin → Design → Themes</li>
            <li>Click Edit on PayMyDine theme</li>
            <li>Change the Primary Color (any bright color)</li>
            <li>Change Restaurant Name</li>
            <li>Click Save</li>
            <li>Refresh this page - colors and name should update!</li>
          </ol>
        </div>

        <div className="mt-6 text-center">
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            🔄 Refresh to Test Changes
          </button>
        </div>
      </div>
    </div>
  )
} 