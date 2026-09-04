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

type TouchPoint = {
  x: number
  y: number
}

type GalleryImageState = {
  ready: boolean
  panStart: number
}

const AUTO_ADVANCE_MS = 5000
const SLIDE_MS = 1800
const PAN_MS = 4400

// PMD_MENU_GALLERY_SMOOTH_V8
// Multi-image food gallery that keeps the proven ItemDialog underneath intact.
// - seamless circular track: last -> first never races backwards across the gallery
// - slower, softer automatic advance every few seconds
// - direct finger swipe (no arrow controls)
// - restores the original smart side-pan feel on every active gallery image
// - respects prefers-reduced-motion
export function FoodGalleryRuntimeEnhancer() {
  const runtime = useMenuRuntime()
  const item = runtime.selectedItem as any
  const images = useMemo(() => uniqueImages(item), [item])
  const slides = useMemo(() => {
    if (images.length < 2) return images
    return [images[images.length - 1], ...images, images[0]]
  }, [images])
  const [index, setIndex] = useState(0)
  const [trackIndex, setTrackIndex] = useState(1)
  const [trackTransition, setTrackTransition] = useState(true)
  const [target, setTarget] = useState<GalleryTarget | null>(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [interactionTick, setInteractionTick] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [imageState, setImageState] = useState<Record<string, GalleryImageState>>({})
  const touchStart = useRef<TouchPoint | null>(null)
  const resetRaf = useRef<number | null>(null)

  useEffect(() => {
    setIndex(0)
    setTrackIndex(1)
    setTrackTransition(true)
    setDragX(0)
    setDragging(false)
    touchStart.current = null
  }, [item?.id])

  useEffect(() => {
    return () => {
      if (resetRaf.current != null) window.cancelAnimationFrame(resetRaf.current)
    }
  }, [])

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
      setTrackTransition(true)
      setDragX(0)
      setTrackIndex((current) => current + 1)
      setIndex((current) => (current + 1) % images.length)
    }, AUTO_ADVANCE_MS)
    return () => window.clearTimeout(timer)
  }, [target, images.length, index, dragging, reducedMotion, interactionTick])

  if (!target || images.length < 2) return null

  const move = (delta: number) => {
    setTrackTransition(true)
    setDragX(0)
    setTrackIndex((current) => current + delta)
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

  const finishTrackTransition = () => {
    const lastRealTrackIndex = images.length
    let resetTo: number | null = null

    if (trackIndex === 0) resetTo = lastRealTrackIndex
    if (trackIndex === images.length + 1) resetTo = 1
    if (resetTo == null) return

    setTrackTransition(false)
    setTrackIndex(resetTo)

    if (resetRaf.current != null) window.cancelAnimationFrame(resetRaf.current)
    resetRaf.current = window.requestAnimationFrame(() => {
      resetRaf.current = window.requestAnimationFrame(() => {
        setTrackTransition(true)
        resetRaf.current = null
      })
    })
  }

  const trackOffset = (-trackIndex * target.width) + dragX

  return createPortal(
    <div
      data-pmd-food-gallery="v8"
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
      <div
        data-pmd-food-gallery-track
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
          finishTrackTransition()
        }}
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          transform: `translate3d(${trackOffset}px, 0, 0)`,
          transition: dragging || reducedMotion || !trackTransition
            ? 'none'
            : `transform ${SLIDE_MS}ms cubic-bezier(.16,1,.3,1)`,
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        {slides.map((src, slideIndex) => {
          const state = imageState[src]
          const active = slideIndex === trackIndex
          const logicalIndex = slideIndex === 0
            ? images.length - 1
            : slideIndex === images.length + 1
              ? 0
              : slideIndex - 1

          return (
            <img
              key={`${src}-${slideIndex}`}
              data-pmd-gallery-image
              src={src}
              alt={`${item.name || 'Food'} — ${logicalIndex + 1} of ${images.length}`}
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
              style={{
                width: '100%',
                height: '100%',
                flex: '0 0 100%',
                objectFit: 'cover',
                objectPosition: active && state?.ready
                  ? '50% 50%'
                  : `${state?.panStart ?? 28}% 50%`,
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                transition: !reducedMotion && active && state?.ready
                  ? `object-position ${PAN_MS}ms cubic-bezier(.25,.20,.40,1)`
                  : 'none',
              }}
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
              transition: reducedMotion ? 'none' : 'width .32s ease, background .32s ease',
            }}
          />
        ))}
      </div>
    </div>,
    target.parent,
  )
}
