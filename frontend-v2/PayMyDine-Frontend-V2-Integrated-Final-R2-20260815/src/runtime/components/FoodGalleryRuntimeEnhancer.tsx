'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'

function uniqueImages(item: any): string[] {
  const out: string[] = []
  const visit = (value: unknown) => {
    if (!value) return
    if (Array.isArray(value)) { value.forEach(visit); return }
    if (typeof value === 'object') {
      const row = value as Record<string, unknown>
      visit(row.url || row.image || row.src || row.path || row.name)
      return
    }
    const url = String(value).trim()
    if (url && !out.includes(url)) out.push(url)
  }
  visit(item?.imageUrl)
  visit(item?.gallery)
  return out
}

type GalleryTarget = {
  parent: HTMLElement
  top: number
  left: number
  width: number
  height: number
}

// PMD_MENU_GALLERY_OPTIONS_V1
// Adds arrows + touch swipe over the proven ItemDialog without replacing any
// ordering, payment, option-selection or cart behavior.
export function FoodGalleryRuntimeEnhancer() {
  const runtime = useMenuRuntime()
  const item = runtime.selectedItem as any
  const images = useMemo(() => uniqueImages(item), [item])
  const [index, setIndex] = useState(0)
  const [target, setTarget] = useState<GalleryTarget | null>(null)
  const touchStart = useRef<number | null>(null)

  useEffect(() => { setIndex(0) }, [item?.id])

  useEffect(() => {
    if (runtime.overlay !== 'item' || !item || images.length < 2) {
      setTarget(null)
      return
    }

    let disposed = false
    let resize: ResizeObserver | null = null
    let observer: MutationObserver | null = null

    const locate = () => {
      if (disposed) return false
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('section[role="dialog"]'))
      const dialog = dialogs.find((node) => node.getAttribute('aria-label') === String(item.name || ''))
      const image = dialog?.querySelector<HTMLImageElement>('img') || null
      const parent = image?.parentElement || null
      if (!image || !parent) return false

      const measure = () => {
        if (disposed) return
        const parentRect = parent.getBoundingClientRect()
        const imageRect = image.getBoundingClientRect()
        if (window.getComputedStyle(parent).position === 'static') parent.style.position = 'relative'
        setTarget({
          parent,
          top: imageRect.top - parentRect.top + parent.scrollTop,
          left: imageRect.left - parentRect.left + parent.scrollLeft,
          width: imageRect.width,
          height: imageRect.height,
        })
      }

      measure()
      resize = new ResizeObserver(measure)
      resize.observe(image)
      resize.observe(parent)
      return true
    }

    if (!locate()) {
      observer = new MutationObserver(() => {
        if (locate()) observer?.disconnect()
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }

    const timer = window.setTimeout(() => observer?.disconnect(), 4000)
    return () => {
      disposed = true
      window.clearTimeout(timer)
      observer?.disconnect()
      resize?.disconnect()
    }
  }, [runtime.overlay, item, images.length])

  if (!target || images.length < 2) return null

  const move = (delta: number) => setIndex((current) => (current + delta + images.length) % images.length)

  return createPortal(
    <div
      data-pmd-food-gallery="v1"
      onTouchStart={(event) => { touchStart.current = event.changedTouches[0]?.clientX ?? null }}
      onTouchEnd={(event) => {
        if (touchStart.current == null) return
        const end = event.changedTouches[0]?.clientX ?? touchStart.current
        const delta = end - touchStart.current
        touchStart.current = null
        if (Math.abs(delta) >= 42) move(delta < 0 ? 1 : -1)
      }}
      style={{
        position: 'absolute', top: target.top, left: target.left,
        width: target.width, height: target.height, zIndex: 4,
        overflow: 'hidden', borderRadius: '1.1rem',
        background: 'var(--pmd-soft, #eee)', touchAction: 'pan-y',
      }}
    >
      <img src={images[index]} alt={`${item.name || 'Food'} — ${index + 1} of ${images.length}`} draggable={false}
        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', userSelect:'none' }} />
      <button type="button" aria-label="Previous image" onClick={() => move(-1)}
        style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:38, height:38, border:0, borderRadius:999, background:'rgba(0,0,0,.52)', color:'#fff', fontSize:25, lineHeight:'36px', cursor:'pointer' }}>‹</button>
      <button type="button" aria-label="Next image" onClick={() => move(1)}
        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', width:38, height:38, border:0, borderRadius:999, background:'rgba(0,0,0,.52)', color:'#fff', fontSize:25, lineHeight:'36px', cursor:'pointer' }}>›</button>
      <div style={{ position:'absolute', left:'50%', bottom:10, transform:'translateX(-50%)', display:'flex', gap:6, padding:'6px 8px', borderRadius:999, background:'rgba(0,0,0,.34)' }}>
        {images.map((_, dotIndex) => (
          <button type="button" key={dotIndex} aria-label={`Show image ${dotIndex + 1}`} onClick={() => setIndex(dotIndex)}
            style={{ width:dotIndex === index ? 20 : 7, height:7, padding:0, border:0, borderRadius:999, background:dotIndex === index ? '#fff' : 'rgba(255,255,255,.55)', cursor:'pointer', transition:'width .18s ease' }} />
        ))}
      </div>
    </div>,
    target.parent,
  )
}
