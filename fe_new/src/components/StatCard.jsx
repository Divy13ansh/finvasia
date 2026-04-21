import React from 'react'

export default function StatCard({ value, label, tone = 'slate' }) {
  const toneClass = {
    blue: 'text-brand',
    green: 'text-covered',
    red: 'text-excluded',
    amber: 'text-partial',
    slate: 'text-ink',
  }[tone]
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-soft">
      <div className={`text-[28px] font-medium leading-none ${toneClass}`}>{value}</div>
      <div className="mt-2 text-[13px] text-muted">{label}</div>
    </div>
  )
}
