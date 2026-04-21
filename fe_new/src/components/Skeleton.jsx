import React from 'react'
import { cn } from '../lib/utils'

export function Skeleton({ className }) {
  return <div className={cn('animate-shimmer rounded-xl bg-[linear-gradient(90deg,#e2e8f0_25%,#f8fafc_37%,#e2e8f0_63%)] bg-[length:200%_100%]', className)} />
}

export function CardSkeleton({ className }) {
  return (
    <div className={cn('rounded-xl border border-border bg-white p-4 shadow-soft', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
    </div>
  )
}
