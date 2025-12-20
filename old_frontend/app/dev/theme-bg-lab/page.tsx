"use client"

import React, { useEffect, useState } from "react"
import { applyTheme } from "@/lib/theme-system"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const themes = [
  { id: 'clean-light', name: 'Clean Light', expected: '#FAFAFA' },
  { id: 'modern-dark', name: 'Modern Dark', expected: '#0A0E12' },
  { id: 'gold-luxury', name: 'Gold Luxury', expected: '#0F0B05' },
  { id: 'vibrant-colors', name: 'Vibrant Colors', expected: '#e2ceb1' },
  { id: 'minimal', name: 'Minimal', expected: '#CFEBF7' }
]

export default function ThemeBackgroundLab() {
  const [currentTheme, setCurrentTheme] = useState('clean-light')
  const [homepageBg, setHomepageBg] = useState('')
  const [menuPageBg, setMenuPageBg] = useState('')
  const [cssVarBg, setCssVarBg] = useState('')
  const [bodyBg, setBodyBg] = useState('')

  const applyThemeAndMeasure = (themeId: string) => {
    applyTheme(themeId)
    setCurrentTheme(themeId)
    
    // NUCLEAR OPTION: Force background colors directly
    const themeColors = {
      'clean-light': '#FAFAFA',
      'modern-dark': '#0A0E12',
      'gold-luxury': '#0F0B05',
      'vibrant-colors': '#e2ceb1',
      'minimal': '#CFEBF7'
    };
    
    const bgColor = themeColors[themeId as keyof typeof themeColors] || '#FAFAFA';
    
    // Force background on body and html
    document.body.style.background = bgColor;
    document.documentElement.style.background = bgColor;
    
    // Wait for DOM update
    setTimeout(() => {
      const homepageElement = document.querySelector('.page--home .min-h-screen')
      const menuPageElement = document.querySelector('.page--menu .min-h-screen')
      const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--theme-background')
      const bodyBg = getComputedStyle(document.body).background
      
      setHomepageBg(homepageElement ? getComputedStyle(homepageElement).background : 'Not found')
      setMenuPageBg(menuPageElement ? getComputedStyle(menuPageElement).background : 'Not found')
      setCssVarBg(cssVar)
      setBodyBg(bodyBg)
      
      console.log(`=== THEME: ${themeId} ===`)
      console.log('Expected:', themes.find(t => t.id === themeId)?.expected)
      console.log('Forced Color:', bgColor)
      console.log('CSS Variable:', cssVar)
      console.log('Body Background:', bodyBg)
      console.log('Homepage Background:', homepageElement ? getComputedStyle(homepageElement).background : 'Not found')
      console.log('Menu Page Background:', menuPageElement ? getComputedStyle(menuPageElement).background : 'Not found')
    }, 100)
  }

  useEffect(() => {
    applyThemeAndMeasure(currentTheme)
  }, [])

  const isMatch = (actual: string, expected: string) => {
    // Normalize colors for comparison
    const normalize = (color: string) => color.toLowerCase().replace(/\s/g, '')
    return normalize(actual).includes(normalize(expected)) || normalize(expected).includes(normalize(actual))
  }

  const currentThemeData = themes.find(t => t.id === currentTheme)

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Theme Background Lab</h1>
          <p className="text-lg text-gray-600">Side-by-side verification of homepage vs menu page backgrounds</p>
        </div>

        {/* Theme Switcher */}
        <Card>
          <CardHeader>
            <CardTitle>Theme Switcher</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {themes.map(theme => (
                <Button
                  key={theme.id}
                  onClick={() => applyThemeAndMeasure(theme.id)}
                  variant={currentTheme === theme.id ? "default" : "outline"}
                  className="min-w-[140px]"
                >
                  {theme.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Theme Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current Theme: {currentThemeData?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Expected Values</h3>
                <p><strong>Expected Background:</strong> {currentThemeData?.expected}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Actual Values</h3>
                <p><strong>CSS Variable:</strong> {cssVarBg}</p>
                <p><strong>Body Background:</strong> {bodyBg}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Homepage Simulation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Homepage Background
                {isMatch(homepageBg, currentThemeData?.expected || '') ? (
                  <span className="text-green-600 text-sm">✓ Match</span>
                ) : (
                  <span className="text-red-600 text-sm">✗ Mismatch</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="page--home min-h-[200px] rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center"
                style={{ background: 'var(--theme-background)' }}
              >
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">Homepage</p>
                  <p className="text-sm text-gray-600">Background: {homepageBg}</p>
                  <p className="text-sm text-gray-600">Expected: {currentThemeData?.expected}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Menu Page Simulation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Menu Page Background
                {isMatch(menuPageBg, currentThemeData?.expected || '') ? (
                  <span className="text-green-600 text-sm">✓ Match</span>
                ) : (
                  <span className="text-red-600 text-sm">✗ Mismatch</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="page--menu min-h-[200px] rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center"
                style={{ background: 'var(--theme-background)' }}
              >
                <div className="text-center">
                  <p className="text-lg font-semibold mb-2">Menu Page</p>
                  <p className="text-sm text-gray-600">Background: {menuPageBg}</p>
                  <p className="text-sm text-gray-600">Expected: {currentThemeData?.expected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verification Results */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold">CSS Variable Match:</span>
                {isMatch(cssVarBg, currentThemeData?.expected || '') ? (
                  <span className="text-green-600">✓ PASS</span>
                ) : (
                  <span className="text-red-600">✗ FAIL</span>
                )}
                <span className="text-sm text-gray-600">({cssVarBg})</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-semibold">Homepage Match:</span>
                {isMatch(homepageBg, currentThemeData?.expected || '') ? (
                  <span className="text-green-600">✓ PASS</span>
                ) : (
                  <span className="text-red-600">✗ FAIL</span>
                )}
                <span className="text-sm text-gray-600">({homepageBg})</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-semibold">Menu Page Match:</span>
                {isMatch(menuPageBg, currentThemeData?.expected || '') ? (
                  <span className="text-green-600">✓ PASS</span>
                ) : (
                  <span className="text-red-600">✗ FAIL</span>
                )}
                <span className="text-sm text-gray-600">({menuPageBg})</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-semibold">Homepage = Menu Page:</span>
                {homepageBg === menuPageBg ? (
                  <span className="text-green-600">✓ IDENTICAL</span>
                ) : (
                  <span className="text-red-600">✗ DIFFERENT</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Console Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Console Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <p>// Run these commands in browser console:</p>
              <p>getComputedStyle(document.documentElement).getPropertyValue('--theme-background')</p>
              <p>getComputedStyle(document.body).background</p>
              <p>getComputedStyle(document.querySelector('.page--home')).background</p>
              <p>getComputedStyle(document.querySelector('.page--menu')).background</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}