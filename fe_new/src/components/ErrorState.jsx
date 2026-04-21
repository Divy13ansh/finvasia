import React from 'react'

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
      <div className="font-medium">Something went wrong</div>
      <div className="mt-1 text-sm">{error}</div>
      {onRetry ? <button className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white" onClick={onRetry}>Retry</button> : null}
    </div>
  )
}
