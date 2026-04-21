import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatRange } from '../lib/utils'

export default function SectionAccordion({ title, items = [] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-border bg-white shadow-soft">
      <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen((v) => !v)}>
        <div>
          <div className="font-medium text-ink">{title}</div>
          <div className="text-xs text-muted">{items.length} items</div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border border-border bg-slate-50 p-3">
              <div className="font-medium text-ink">{item.title}</div>
              <div className="mt-1 text-sm text-muted">{item.description || item.evidence_quote}</div>
              <div className="mt-2 text-xs text-muted">{item.section_title} · {formatRange(item.page_start, item.page_end)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
