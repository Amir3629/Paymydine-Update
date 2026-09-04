'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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

type TouchPoint = {
  x: number
  y: number
}

type GalleryImageState = {
  ready: boolean
  panStart: number
}

const AUTO_ADVANCE_MS = 4800
const SLIDE_MS = 620
const PAN_MS = 4300

// PMD_MENU_GALLERY_SMOOTH_V7
// Multi-image food gallery that keeps the proven ItemDialog underneath intact.
// - smooth automatic advance every few seconds
// - direct finger swipe (no arrow controls)
// - restores the original smart side-pan feel on every active gallery image
// - respects prefers-reduced-motion
export function FoodGalleryRuntimeEnhancer() {
  const runtime = useMenuRuntime()
  const item = runtime.selectedItem as any
  const images = useMemo(() => uniqueImages(item), [item])
  const [index, setIndex] = useState(0)
  const [target, setTarget] = useState<GalleryTarget | null>(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [interactionTick, setInteractionTick] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [imageState, setImageState] = useState<Record<string, GalleryImageState>>({})
  const touchStart = useRef<TouchPoint | null>(null)

  useEffect(() => {
    setIndex(0)
    setDragX(0)
    setDragging(false)
    touchStart.current = null
  }, [item?.id])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener?.('change', sync)
    return () => media.removeEventListener?.('change', sync)
  }, [])

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

  useEffect(() => {
    if (!target || images.length < 2 || dragging || reducedMotion || document.visibilityState !== 'visible') return
    const timer = window.setTimeout(() => {
      setDragX(0)
      setIndex((current) => (current + 1) % images.length)
    }, AUTO_ADVANCE_MS)
    return () => window.clearTimeout(timer)
  }, [target, images.length, index, dragging, reducedMotion, interactionTick])

  if (!target || images.length < 2) return null

  const move = (delta: number) => {
    setDragX(0)
    setIndex((current) => (current + delta + images.length) % images.length)
    setInteractionTick((value) => value + 1)
  }

  const finishTouch = (clientX: number | null) => {
    const start = touchStart.current
    touchStart.current = null
    setDragging(false)

    if (!start || clientX == null) {
      setDragX(0)
      setInteractionTick((value) => value + 1)
      return
    }

    const delta = clientX - start.x
    const threshold = Math.max(38, Math.min(72, target.width * 0.14))
    if (Math.abs(delta) >= threshold) {
      move(delta < 0 ? 1 : -1)
    } else {
      setDragX(0)
      setInteractionTick((value) => value + 1)
    }
  }

  const trackOffset = (-index * target.width) + dragX

  return createPortal(
    <div
      data-pmd-food-gallery="v7"
      onTouchStart={(event) => {
        const touch = event.changedTouches[0]
        if (!touch) return
        touchStart.current = { x: touch.clientX, y: touch.clientY }
        setDragging(true)
        setDragX(0)
      }}
      onTouchMove={(event) => {
        const start = touchStart.current
        const touch = event.changedTouches[0]
        if (!start || !touch) return
        const dx = touch.clientX - start.x
        const dy = touch.clientY - start.y
        if (Math.abs(dx) <= Math.abs(dy)) return
        if (event.cancelable) event.preventDefault()
        const resistance = target.width * 0.9
        setDragX(Math.max(-resistance, Math.min(resistance, dx)))
      }}
      onTouchEnd={(event) => finishTouch(event.changedTouches[0]?.clientX ?? null)}
      onTouchCancel={() => finishTouch(null)}
      style={{
        position: 'absolute',
        top: target.top,
        left: target.left,
        width: target.width,
        height: target.height,
        zIndex: 4,
        overflow: 'hidden',
        borderRadius: '1.1rem',
        background: 'var(--pmd-soft, #eee)',
        touchAction: 'pan-y',
      }}
    >
      <style>{`
        @keyframes pmdFoodGalleryPanV7 {
          from { object-position: var(--pmd-gallery-pan-start, 28%) 50%; }
          to { object-position: 50% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-pmd-food-gallery="v7"] [data-pmd-gallery-image] {
            animation: none !important;
            object-position: 50% 50% !important;
          }
        }
      `}</style>

      <div
        data-pmd-food-gallery-track
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          transform: `translate3d(${trackOffset}px, 0, 0)`,
          transition: dragging || reducedMotion
            ? 'none'
            : `transform ${SLIDE_MS}ms cubic-bezier(.22,.72,.22,1)`,
          willChange: 'transform',
        }}
      >
        {images.map((src, slideIndex) => {
          const state = imageState[src]
          const active = slideIndex === index
          const imageStyle: CSSProperties & Record<'--pmd-gallery-pan-start', string> = {
            '--pmd-gallery-pan-start': `${state?.panStart ?? 28}%`,
            width: '100%',
            height: '100%',
            flex: '0 0 100%',
            objectFit: 'cover',
            objectPosition: 'var(--pmd-gallery-pan-start) 50%',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none',
            animation: !reducedMotion && active && state?.ready
              ? `pmdFoodGalleryPanV7 ${PAN_MS}ms cubic-bezier(.25,.20,.40,1) both`
              : 'none',
          }

          return (
            <img
              key={src}
              data-pmd-gallery-image
              src={src}
              alt={`${item.name || 'Food'} — ${slideIndex + 1} of ${images.length}`}
              draggable={false}
              onLoad={(event) => {
                const image = event.currentTarget
                const naturalWidth = Math.max(1, image.naturalWidth || 1)
                const naturalHeight = Math.max(1, image.naturalHeight || 1)
                const sourceRatio = naturalWidth / naturalHeight
                const frameRatio = 16 / 10
                const overflowRatio = Math.max(0, sourceRatio / frameRatio - 1)
                const targetVisibleTravel = 0.04
                const calculatedStart = overflowRatio > 0
                  ? (0.5 - (targetVisibleTravel / overflowRatio)) * 100
                  : 28
                const panStart = Math.max(28, Math.min(48, calculatedStart))

                setImageState((current) => {
                  const previous = current[src]
                  if (previous?.ready && Math.abs(previous.panStart - panStart) < 0.01) return current
                  return { ...current, [src]: { ready: true, panStart } }
                })
              }}
              style={imageStyle}
            />
          )
        })}
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 10,
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 6,
          pointerEvents: 'none',
        }}
      >
        {images.map((_, dotIndex) => (
          <span
            key={dotIndex}
            style={{
              width: dotIndex === index ? 18 : 6,
              height: 6,
              borderRadius: 999,
              background: dotIndex === index ? '#fff' : 'rgba(255,255,255,.56)',
              boxShadow: '0 1px 4px rgba(0,0,0,.28)',
              transition: reducedMotion ? 'none' : 'width .22s ease, background .22s ease',
            }}
          />
        ))}
      </div>
    </div>,
    target.parent,
  )
}
