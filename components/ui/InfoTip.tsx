'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'

type InfoTipPosition = {
  left: number
  top: number
  width: number
  placement: 'top' | 'bottom'
}

const VIEWPORT_MARGIN = 12
const POPOVER_GAP = 8
const MAX_POPOVER_WIDTH = 304
const ESTIMATED_POPOVER_HEIGHT = 132

export function InfoTip({
  title = 'Información',
  children,
  className = '',
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<InfoTipPosition>({ left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN, width: MAX_POPOVER_WIDTH, placement: 'bottom' })
  const popoverId = useId()
  const titleId = `${popoverId}-title`

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const triggerRect = trigger.getBoundingClientRect()
    const width = Math.min(MAX_POPOVER_WIDTH, Math.max(160, window.innerWidth - VIEWPORT_MARGIN * 2))
    const popoverHeight = popoverRef.current?.offsetHeight ?? ESTIMATED_POPOVER_HEIGHT
    const left = Math.min(
      Math.max(triggerRect.right - width, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN),
    )
    const fitsBelow = triggerRect.bottom + POPOVER_GAP + popoverHeight <= window.innerHeight - VIEWPORT_MARGIN
    const top = fitsBelow
      ? triggerRect.bottom + POPOVER_GAP
      : Math.max(VIEWPORT_MARGIN, triggerRect.top - POPOVER_GAP - popoverHeight)

    setPosition({ left, top, width, placement: fitsBelow ? 'bottom' : 'top' })
  }, [])

  useEffect(() => {
    const closeOtherInfoTips = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail !== popoverId) setOpen(false)
    }

    document.addEventListener('sercoprev:infotip-open', closeOtherInfoTips)
    return () => document.removeEventListener('sercoprev:infotip-open', closeOtherInfoTips)
  }, [popoverId])

  useEffect(() => {
    if (!open) return

    const isInside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false
      return Boolean(triggerRef.current?.contains(target) || popoverRef.current?.contains(target))
    }
    const closeOnOutsideInteraction = (event: Event) => {
      if (!isInside(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOnOutsideInteraction)
    document.addEventListener('focusin', closeOnOutsideInteraction)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideInteraction)
      document.removeEventListener('focusin', closeOnOutsideInteraction)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }

    updatePosition()
    document.dispatchEvent(new CustomEvent('sercoprev:infotip-open', { detail: popoverId }))
    setOpen(true)
    window.requestAnimationFrame(updatePosition)
  }

  return (
    <>
      <span className={`relative ml-1 inline-flex shrink-0 align-top ${className}`.trim()}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={title}
          aria-expanded={open}
          aria-controls={open ? popoverId : undefined}
          title={title}
          onClick={toggle}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#174f7a]/30 bg-white text-[9px] font-black leading-none text-[#174f7a] shadow-[0_1px_3px_rgba(16,40,61,0.12)] transition hover:border-[#174f7a]/55 hover:bg-[#edf4f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cfa84b] focus-visible:ring-offset-1"
        >
          <span aria-hidden="true" className="translate-y-[-0.25px]">i</span>
        </button>
      </span>

      {open && createPortal(
        <div
          ref={popoverRef}
          id={popoverId}
          role="tooltip"
          aria-labelledby={titleId}
          data-placement={position.placement}
          style={{ left: position.left, top: position.top, width: position.width }}
          className="fixed z-[1000] rounded-xl border border-slate-200 bg-white p-3 text-left text-xs font-medium leading-5 text-slate-600 shadow-[0_18px_50px_rgba(16,40,61,0.18)]"
        >
          <p id={titleId} className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#10283d]">{title}</p>
          <div>{children}</div>
        </div>,
        document.body,
      )}
    </>
  )
}

export function CalculationLabel({ label, help }: { label: string; help: ReactNode }) {
  return <span className="inline-flex items-center gap-0.5">{label}<InfoTip>{help}</InfoTip></span>
}
