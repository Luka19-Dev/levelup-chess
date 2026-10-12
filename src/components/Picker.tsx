import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export type PickerOption = { id: string; label: string; preview: ReactNode }

/** A dropdown whose choices are shown with a picture, so nobody has to pick a piece set by its name. */
export function Picker({ label, value, options, onChange }: { label: string; value: string; options: PickerOption[]; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const listId = useId()
  const current = options.find((o) => o.id === value) ?? options[0]
  const [place, setPlace] = useState<CSSProperties>({})

  // The list floats over the card instead of pushing its content down, so opening it never
  // resizes the window. It opens below when there is room inside the card, otherwise above.
  useLayoutEffect(() => {
    if (!open || !box.current) return
    const card = box.current.closest('.card')?.getBoundingClientRect()
    const btn = box.current.getBoundingClientRect()
    if (!card) return
    const below = card.bottom - btn.bottom - 14
    const above = btn.top - card.top - 14
    setPlace(below >= 220 || below >= above ? { top: 'calc(100% + 4px)', maxHeight: below } : { bottom: 'calc(100% + 4px)', maxHeight: above })
  }, [open])

  // close on a click outside or on Escape
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc, true)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc, true)
    }
  }, [open])

  return (
    <div className="picker" ref={box}>
      <button className="picker-current" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={`${label}: ${current.label}`} onClick={() => setOpen((o) => !o)}>
        <span className="picker-preview">{current.preview}</span>
        <span className="picker-name">{current.label}</span>
        <span className="picker-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="picker-list" role="listbox" id={listId} aria-label={label} style={place}>
          {options.map((o) => (
            <button
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              className={`picker-option${o.id === value ? ' on' : ''}`}
              onClick={() => {
                onChange(o.id)
                setOpen(false)
              }}
            >
              <span className="picker-preview">{o.preview}</span>
              <span className="picker-name">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
