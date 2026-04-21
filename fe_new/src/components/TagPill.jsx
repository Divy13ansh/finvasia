import React from 'react'
import { cn } from '../lib/utils'

const toneClass = {
  coverage: 'bg-covered/10 text-covered border-covered/20',
  exclusion: 'bg-excluded/10 text-excluded border-excluded/20',
  condition: 'bg-partial/10 text-partial border-partial/20',
  limit: 'bg-slate-100 text-slate-700 border-slate-200',
  general: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function TagPill({ tone = 'general', children }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium', toneClass[tone] || toneClass.general)}>{children}</span>
}
