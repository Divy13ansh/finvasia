import React from 'react'

export default function Brand() {
  return (
    <div className="flex flex-col leading-none">
      <div className="flex items-center gap-3">
        <span className="text-[24px] font-semibold tracking-[-0.07em] text-ink">Clarify</span>
        <span className="h-px w-10 rounded-full bg-brand/25" />
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.28em] text-muted">Policy intelligence</div>
    </div>
  )
}
