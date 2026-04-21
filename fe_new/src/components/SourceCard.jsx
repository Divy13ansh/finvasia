import React from 'react'
import { formatRange } from '../lib/utils'

export default function SourceCard({ item }) {
  const meta = item?.metadata || {}
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-ink">{meta.section_title || 'Source'}</div>
        <div className="text-xs text-muted">{formatRange(meta.page_start, meta.page_end)}</div>
      </div>
      <div className="mt-2 line-clamp-3 text-muted">{item?.text}</div>
    </div>
  )
}
