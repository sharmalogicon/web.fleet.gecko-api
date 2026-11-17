'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Minimal pointer-driven drag & drop.
 *
 * HTML5 `draggable` does not work on SVG elements nor on touch devices, so we
 * track the pointer ourselves and hit-test drop targets with
 * `document.elementFromPoint`. Any element carrying `data-drop-target="<id>"`
 * is a drop target.
 */

export type DragPayload =
  | { source: 'inventory'; serialNo: string }
  | { source: 'position'; code: string }

export interface ActiveDrag {
  payload: DragPayload
  label: string
  color: string
  x: number
  y: number
  over: string | null
}

const THRESHOLD = 5

/**
 * Non-DOM drop targets (e.g. meshes inside a WebGL canvas) register a resolver
 * that maps a screen point to a target id. Called when no DOM target is hit.
 */
type DropResolver = (x: number, y: number, el: Element | null) => string | null
const resolvers = new Set<DropResolver>()
export function registerDropResolver(fn: DropResolver): () => void {
  resolvers.add(fn)
  return () => {
    resolvers.delete(fn)
  }
}

export function useTireDrag(onDrop: (payload: DragPayload, target: string) => void) {
  const [drag, setDrag] = useState<ActiveDrag | null>(null)
  const pending = useRef<{ payload: DragPayload; label: string; color: string; x: number; y: number } | null>(null)
  const active = useRef(false)
  const suppressClick = useRef(false)
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  }, [onDrop])

  const targetAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as Element | null
    const hit = el?.closest('[data-drop-target]')
    if (hit) return hit.getAttribute('data-drop-target')
    for (const r of resolvers) {
      const id = r(x, y, el)
      if (id) return id
    }
    return null
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = pending.current
      if (!p) return
      if (!active.current) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < THRESHOLD) return
        active.current = true
        document.body.style.userSelect = 'none'
      }
      e.preventDefault()
      setDrag({ payload: p.payload, label: p.label, color: p.color, x: e.clientX, y: e.clientY, over: targetAt(e.clientX, e.clientY) })
    }
    const end = (e: PointerEvent) => {
      const p = pending.current
      pending.current = null
      if (p && active.current) {
        const target = e.type === 'pointerup' ? targetAt(e.clientX, e.clientY) : null
        suppressClick.current = true
        setTimeout(() => (suppressClick.current = false), 0)
        if (target) onDropRef.current(p.payload, target)
      }
      active.current = false
      document.body.style.userSelect = ''
      setDrag(null)
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [])

  const startDrag = useCallback(
    (e: { button: number; clientX: number; clientY: number }, payload: DragPayload, label: string, color: string) => {
      if (e.button !== 0) return
      pending.current = { payload, label, color, x: e.clientX, y: e.clientY }
    },
    [],
  )

  /** Call at the top of click handlers: returns true if the click ended a drag. */
  const consumedByDrag = useCallback(() => suppressClick.current, [])

  return { drag, startDrag, consumedByDrag }
}
