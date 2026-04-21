import React from 'react'
import { Skeleton } from './Skeleton'

export default function SkeletonLines({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
    </div>
  )
}
