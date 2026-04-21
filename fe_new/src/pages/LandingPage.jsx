import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, FileUp, Shield, Sparkles, FileText, CheckCircle2 } from 'lucide-react'
import UploadDropzone from '../components/UploadDropzone'
import Brand from '../components/Brand'
import { displayPolicyName } from '../lib/utils'

export default function LandingPage({ onUpload, uploading, error, onRetry, policies = [], currentDocumentId }) {
  const navigate = useNavigate()
  const uploadRef = useRef(null)
  const latestPolicy = policies[0]

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-5 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Brand />
        </div>

        <div className="grid flex-1 gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:py-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              A clearer way to read insurance
            </div>

            <div className="max-w-2xl space-y-4">
              <h1 className="text-[40px] font-semibold tracking-[-0.05em] text-ink sm:text-[56px]">Three ways in. One policy system.</h1>
              <p className="max-w-xl text-[15px] leading-7 text-muted">
                Upload a PDF, browse the library, or jump back into a workspace. Clarify keeps the backend as the source of truth and turns policy language into something you can actually use.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <HeroCard
                icon={FileUp}
                title="Upload"
                text="Start a new policy workspace from PDF."
                foot="Best for fresh documents"
                onClick={() => uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
              <HeroCard
                icon={BookOpen}
                title="Library"
                text="Review everything already indexed."
                foot="Best for browsing and reopening"
                onClick={() => navigate('/library')}
              />
              <HeroCard
                icon={Clock3}
                title="Resume"
                text={currentDocumentId ? 'Return to the last policy you opened.' : 'Your latest workspace appears here after upload.'}
                foot={currentDocumentId ? 'One click back to work' : 'No active workspace yet'}
                onClick={() => currentDocumentId && navigate(`/policy/${currentDocumentId}`)}
                disabled={!currentDocumentId}
              />
            </div>

            {latestPolicy ? (
              <div className="rounded-[24px] border border-border bg-white p-5 shadow-soft">
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Latest policy</div>
                <div className="mt-2 text-[18px] font-medium text-ink">{displayPolicyName(latestPolicy)}</div>
                <div className="mt-1 text-sm text-muted">{latestPolicy.filename || latestPolicy.document_id}</div>
              </div>
            ) : null}
          </div>

          <div ref={uploadRef} className="space-y-4 rounded-[28px] border border-border bg-white p-5 shadow-soft lg:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[18px] font-medium text-ink">Upload a policy</div>
                <div className="mt-1 text-sm leading-6 text-muted">We use the backend dashboard, chat, and scenario APIs directly.</div>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
                <button className="ml-3 font-medium underline" onClick={onRetry}>Retry</button>
              </div>
            ) : null}

            <UploadDropzone onUpload={onUpload} uploading={uploading} />

            <div className="grid gap-3 rounded-2xl border border-border bg-slate-50 p-4 sm:grid-cols-3">
              <InfoPill icon={FileText} label="Real PDFs" value="No fake content" />
              <InfoPill icon={CheckCircle2} label="Backend first" value="Policy APIs only" />
              <InfoPill icon={Shield} label="Workspace ready" value="Chat + scenarios" />
            </div>

            <div className="grid gap-3">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Recent policies</div>
              {policies.slice(0, 3).length ? policies.slice(0, 3).map((policy) => (
                <button key={policy.document_id} className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 text-left transition hover:bg-slate-50" onClick={() => navigate(`/policy/${policy.document_id}`)}>
                  <div>
                    <div className="text-sm font-medium text-ink">{displayPolicyName(policy)}</div>
                    <div className="text-xs text-muted">{policy.filename || policy.document_id}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-border bg-slate-50 px-4 py-6 text-sm text-muted">Upload a policy to see it here.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroCard({ icon: Icon, title, text, foot, onClick, disabled }) {
  return (
    <button
      className={`rounded-[24px] border border-border bg-white p-4 text-left shadow-soft transition ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5 hover:shadow-lift'}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="rounded-full border border-border bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        Clarify
      </div>
      <div className="mt-4 text-[15px] font-medium text-ink">{title}</div>
      <div className="mt-1 text-sm leading-6 text-muted">{text}</div>
      <div className="mt-4 border-t border-border pt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{foot}</div>
    </button>
  )
}

function InfoPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
        <Icon className="h-3.5 w-3.5 text-brand" />
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-ink">{value}</div>
    </div>
  )
}
