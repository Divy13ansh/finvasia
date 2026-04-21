import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, LayoutGrid, FileText } from 'lucide-react'
import Brand from '../components/Brand'
import TagPill from '../components/TagPill'
import { CardSkeleton } from '../components/Skeleton'
import { displayPolicyName } from '../lib/utils'

export default function LibraryPage({ policies, loading, error, onRetry }) {
  const navigate = useNavigate()

  const toneFor = (type) => {
    if (type === 'coverage') return 'coverage'
    if (type === 'exclusion') return 'exclusion'
    if (type === 'condition') return 'condition'
    return 'general'
  }

  const totalSections = policies.reduce((sum, policy) => sum + (policy.sections_indexed || 0), 0)
  const ocrCount = policies.filter((policy) => policy.ocr_used).length

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="border-b border-border bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Brand />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted shadow-sm">
              <LayoutGrid className="h-3.5 w-3.5 text-brand" />
              Policy library
            </div>
            <h1 className="text-[36px] font-semibold tracking-tight text-ink sm:text-[52px]">Browse, reopen, and inspect every policy.</h1>
            <p className="max-w-2xl text-[15px] leading-7 text-muted">See what has been indexed, which policies needed OCR, and jump directly into any workspace.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Policies" value={policies.length} />
            <MetricCard label="Sections" value={totalSections} />
            <MetricCard label="OCR used" value={ocrCount} />
          </div>
        </div>

        {error ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}<button className="ml-3 underline" onClick={onRetry}>Retry</button></div> : null}

        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : policies.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-border bg-white p-8 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-slate-50 text-brand"><BookOpen className="h-7 w-7" /></div>
            <div className="mt-5 text-[18px] font-medium text-ink">No policies yet. Upload your first policy to get started.</div>
            <div className="mt-2 text-sm text-muted">Once a PDF is uploaded, this page becomes your launchpad.</div>
            <button className="mt-6 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm" onClick={() => navigate('/')}>Upload Policy</button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {policies.map((policy) => (
              <button
                key={policy.document_id}
                onClick={() => navigate(`/policy/${policy.document_id}`)}
                className="group rounded-[24px] border border-border bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[16px] font-medium text-ink">{displayPolicyName(policy)}</div>
                    <div className="mt-1 truncate text-[13px] text-muted">{policy.filename || policy.document_id}</div>
                  </div>
                  {policy.ocr_used ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">OCR</span> : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(policy.section_types || []).map((type) => <TagPill key={type} tone={toneFor(type)}>{type}</TagPill>)}
                </div>

                <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
                  <span>{policy.sections_indexed} sections · {policy.page_count} pages</span>
                  <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[24px] border border-border bg-white p-4 shadow-soft">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-ink">{value}</div>
    </div>
  )
}
