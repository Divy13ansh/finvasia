import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, FileText, MessageCircle, Shield, Sparkles, Zap, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Sidebar from '../components/Sidebar'
import TagPill from '../components/TagPill'
import ErrorState from '../components/ErrorState'
import SkeletonLines from '../components/SkeletonLines'
import StatCard from '../components/StatCard'
import SectionAccordion from '../components/SectionAccordion'
import ChatBubble from '../components/ChatBubble'
import SourceCard from '../components/SourceCard'
import { askClarify, evaluateScenario, getDashboard } from '../lib/api'
import { displayPolicyName, displaySectionTitle, formatRange, verdictTone } from '../lib/utils'

function usePolicy(documentId, refreshSignal) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (!documentId) return
    setLoading(true)
    setError('')
    try {
      const data = await getDashboard(documentId)
      setDashboard(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [documentId, refreshSignal])
  return { dashboard, loading, error, reload: load }
}

export default function PolicyWorkspace() {
  const { document_id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [refreshSignal, setRefreshSignal] = useState(0)
  const { dashboard, loading, error } = usePolicy(document_id, refreshSignal)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [scenarioText, setScenarioText] = useState('')
  const [scenarioResult, setScenarioResult] = useState(null)
  const [scenarioLoading, setScenarioLoading] = useState(false)

  const pathParts = location.pathname.split('/').filter(Boolean)
  const activeTab = pathParts[2] || 'overview'
  const scenarioMode = pathParts.includes('preauth') ? 'preauth' : 'scenario'
  const coverageSection = pathParts[2] === 'coverage' ? (pathParts[3] || 'covered') : 'covered'

  const policy = dashboard || {
    policy_name: '',
    filename: '',
    overview: '',
    stats: { sections: 0, coverage_items: 0, exclusions: 0, limits: 0 },
    sections: [], coverage: [], exclusions: [], limits: [], conditions: [], conflicts: [],
  }

  const coverageSummary = [
    { label: 'Covered', value: policy.coverage?.length || 0, tone: 'coverage' },
    { label: 'Not covered', value: policy.exclusions?.length || 0, tone: 'exclusion' },
    { label: 'Limits', value: policy.limits?.length || 0, tone: 'limit' },
  ]

  const onChat = async (question) => {
    if (!document_id || !question) return
    setChatLoading(true)
    setChatMessages((prev) => [...prev, { role: 'user', text: question }])
    try {
      const res = await askClarify({ document_id, question })
      setChatMessages((prev) => [...prev, { role: 'assistant', text: res.answer, sources: res.sources || [] }])
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: e.message, sources: [] }])
    } finally {
      setChatLoading(false)
    }
  }

  const parseScenarioPayload = (payload = {}) => {
    const raw = String(payload.explanation || '')
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
    try {
      const parsed = JSON.parse(cleaned)
      if (parsed && typeof parsed === 'object') {
        const explanation = String(parsed.explanation || parsed.message || cleaned)
        return { verdict: reconcileVerdict(payload.verdict || parsed.verdict, inferVerdictFromText(explanation)), explanation, sources: payload.sources || [] }
      }
    } catch {
      // ignore
    }
    return { verdict: reconcileVerdict(payload.verdict, inferVerdictFromText(cleaned)), explanation: cleaned, sources: payload.sources || [] }
  }

  const reconcileVerdict = (verdict, inferred) => {
    const normalized = String(verdict || 'unknown').toLowerCase()
    if (inferred !== 'unknown' && inferred !== normalized) return inferred
    return ['covered', 'not covered', 'partial', 'unknown'].includes(normalized) ? normalized : (inferred || 'unknown')
  }

  const inferVerdictFromText = (text = '') => {
    const lower = String(text || '').toLowerCase()
    if (lower.includes('not covered') || lower.includes('excluded') || lower.includes('does not cover') || lower.includes('not payable')) return 'not covered'
    if (lower.includes('partial') || lower.includes('subject to limits') || lower.includes('sub-limits')) return 'partial'
    if (lower.includes('covered') || lower.includes('payable under this policy')) return 'covered'
    return 'unknown'
  }

  const onScenario = async (scenario) => {
    if (!document_id || !scenario) return
    setScenarioLoading(true)
    setScenarioResult(null)
    try {
      const res = await evaluateScenario({ document_id, scenario })
      setScenarioResult(parseScenarioPayload(res))
    } catch (e) {
      setScenarioResult({ verdict: 'unknown', explanation: e.message, sources: [] })
    } finally {
      setScenarioLoading(false)
    }
  }

  const onPreAuth = async (procedure, hospitalType) => {
    await onScenario(`Pre-authorization check: ${procedure || 'unspecified procedure'} at ${hospitalType || 'not sure'} hospital`)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-bg text-ink">
        <div className="w-[250px] border-r border-border bg-white p-4"><SkeletonLines rows={10} /></div>
        <main className="flex-1 p-6"><SkeletonLines rows={20} /></main>
      </div>
    )
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-bg p-6"><ErrorState error={error} onRetry={() => setRefreshSignal((v) => v + 1)} /></div>
  }

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <Sidebar policy={policy} />
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Policy workspace</div>
              <div className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-ink">{displayPolicyName(policy) || 'Policy Workspace'}</div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1600px] p-6">
          {activeTab === 'overview' ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-border bg-white p-6 shadow-soft">
                  <div className="flex items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3 py-1 text-xs font-medium text-muted">
                        <Sparkles className="h-3.5 w-3.5 text-brand" />
                        Policy summary
                      </div>
                      <h2 className="mt-4 text-[28px] font-semibold tracking-tight text-ink">One clean snapshot of the document.</h2>
                      <p className="mt-3 text-sm leading-6 text-muted">Use this as the quick read: what the policy is, how large it is, and where the important sections live.</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-slate-50 p-3 text-brand"><FileText className="h-5 w-5" /></div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard value={policy.stats?.sections || 0} label="Sections" tone="blue" />
                    <StatCard value={policy.stats?.coverage_items || 0} label="Coverage Items" tone="green" />
                    <StatCard value={policy.stats?.exclusions || 0} label="Exclusions" tone="red" />
                    <StatCard value={policy.stats?.limits || 0} label="Limits" tone="amber" />
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-blue-50 p-4 text-[14px] leading-7 text-ink">{policy.overview || 'No overview available.'}</div>
                </div>

                <div className="rounded-[28px] border border-border bg-white p-6 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Key sections</div>
                      <div className="mt-1 text-[18px] font-medium text-ink">First indexed sections</div>
                    </div>
                    <div className="text-xs text-muted">{policy.sections?.length || 0} total</div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(policy.sections || []).slice(0, 4).map((section) => (
                      <div key={section.section_id} className="rounded-xl border border-border bg-slate-50 p-3">
                        <div className="text-sm font-medium text-ink">{displaySectionTitle(section)}</div>
                        <div className="mt-0.5 text-xs text-muted">{formatRange(section.page_start, section.page_end)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-[28px] border border-border bg-white p-5 shadow-soft xl:sticky xl:top-28 xl:self-start">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Watch-outs</div>
                    <div className="mt-1 text-[18px] font-medium text-ink">Conflicts and clauses</div>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-partial" />
                </div>
                <div className="space-y-3">
                  {policy.conflicts?.length ? policy.conflicts.map((conflict, idx) => (
                    <div key={idx} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-ink">
                      <div className="font-medium">{conflict.title}</div>
                      <div className="mt-1 text-muted">{conflict.description}</div>
                    </div>
                  )) : <div className="rounded-2xl border border-covered/20 bg-covered/5 p-4 text-sm text-covered">No conflicts detected.</div>}
                </div>

                <div className="h-px bg-border" />

                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Document details</div>
                  <div className="mt-1 text-[18px] font-medium text-ink">At a glance</div>
                </div>

                <div className="grid gap-3">
                  <DetailRow label="Policy name" value={displayPolicyName(policy)} />
                  <DetailRow label="File name" value={policy.filename || 'Unknown file'} />
                  <DetailRow label="Document ID" value={policy.document_id || 'N/A'} mono />
                </div>

                <div className="rounded-2xl border border-border bg-slate-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Section mix</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(policy.section_types || ['coverage', 'exclusion', 'limit', 'condition']).map((type) => (
                      <TagPill key={type} tone={type === 'coverage' ? 'coverage' : type === 'exclusion' ? 'exclusion' : type === 'limit' ? 'limit' : type === 'condition' ? 'condition' : 'general'}>
                        {type}
                      </TagPill>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'coverage' ? (
            <div className="mt-6 grid gap-6">
              <div className="space-y-5 rounded-[28px] border border-border bg-white p-5 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Coverage map</div>
                    <div className="mt-1 text-[18px] font-medium text-ink">What this policy covers</div>
                  </div>
                  <TagPill tone="coverage">Coverage</TagPill>
                </div>

                <div className="flex flex-wrap gap-2 rounded-[24px] border border-border bg-slate-50 p-2 shadow-soft">
                  {[
                    { key: 'covered', label: 'Covered', icon: Shield, tone: 'coverage' },
                    { key: 'exclusions', label: 'Not Covered', icon: X, tone: 'exclusion' },
                    { key: 'limits', label: 'Limits', icon: FileText, tone: 'limit' },
                    { key: 'conditions', label: 'Conditions', icon: AlertTriangle, tone: 'condition' },
                  ].map((item) => {
                    const Icon = item.icon
                    const isActive = coverageSection === item.key
                    return (
                      <button
                        key={item.key}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${isActive ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-slate-50 hover:text-ink'}`}
                        onClick={() => navigate(`/policy/${document_id}/coverage/${item.key}`)}
                      >
                        <Icon className="h-4 w-4" /> {item.label}
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-[28px] border border-border bg-white p-5 shadow-soft">
                  <div className="mb-4 text-[18px] font-medium text-ink">{coverageSectionLabel(coverageSection)}</div>
                  <div className="max-h-[calc(100vh-320px)] overflow-hidden">
                    {renderCoverage(policy, coverageSection)}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'chat' ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4 rounded-[28px] border border-border bg-white p-5 shadow-soft">
                <div className="text-[18px] font-medium text-ink">Ask Clarify</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {['Is OPD covered?', 'What is the room rent limit?', 'What is the pre-existing waiting period?', 'What if I use a non-network hospital?'].map((chip) => (
                    <button key={chip} className="rounded-full border border-border bg-slate-50 px-3 py-2 text-sm text-ink" onClick={() => onChat(chip)}>{chip}</button>
                  ))}
                </div>
                <div className="rounded-2xl border border-border bg-slate-50 p-4 text-sm text-muted">Ask a question in plain language. Answers are rendered with markdown and backed by source snippets.</div>
              </div>

              <div className="flex h-[calc(100vh-260px)] flex-col gap-4 rounded-[28px] border border-border bg-white p-5 shadow-soft">
                <div className="flex-1 space-y-4 overflow-auto rounded-2xl border border-border bg-slate-50 p-4">
                  {chatMessages.length === 0 ? <div className="flex h-full items-center justify-center text-muted">Ask Clarify anything about this policy.</div> : chatMessages.map((msg, idx) => <ChatBubble key={idx} role={msg.role} text={msg.text} sources={msg.sources || []} />)}
                  {chatLoading ? <TypingIndicator /> : null}
                </div>
                <div className="rounded-2xl border border-border bg-white p-3 shadow-soft">
                  <div className="flex gap-3">
                    <input className="flex-1 rounded-xl border border-border px-4 py-3 text-sm text-ink" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask anything about this policy..." onKeyDown={(e) => e.key === 'Enter' && onChat(chatInput)} />
                    <button className="rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white shadow-sm" onClick={() => onChat(chatInput)}>Send</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4 rounded-[28px] border border-border bg-white p-5 shadow-soft">
                <div className="text-[18px] font-medium text-ink">Scenario simulator</div>
                {scenarioMode === 'preauth' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink">What treatment or procedure are you planning?</label>
                      <input className="w-full rounded-xl border border-border px-4 py-3 text-sm text-ink" value={scenarioText} onChange={(e) => setScenarioText(e.target.value)} placeholder="Knee replacement surgery" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink">Hospital type</label>
                      <select className="w-full rounded-xl border border-border px-4 py-3 text-sm text-ink" defaultValue="Not sure" onChange={(e) => setScenarioText((prev) => prev)}>
                        <option>Network</option>
                        <option>Non-network</option>
                        <option>Not sure</option>
                      </select>
                    </div>
                    <button className="rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white shadow-sm" onClick={() => onPreAuth(scenarioText, 'Not sure')}>Check requirements →</button>
                  </div>
                ) : (
                  <>
                    <textarea className="mt-1 w-full rounded-xl border border-border px-4 py-3 text-sm text-ink" rows={8} value={scenarioText} onChange={(e) => setScenarioText(e.target.value)} placeholder="Describe a situation, e.g. A 45-year-old undergoes knee replacement surgery 14 months after purchasing this policy at a non-network hospital..." />
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['Appendectomy after 18 months', 'Emergency hospitalization abroad', 'Pre-existing diabetes treatment after 2 years'].map((s) => <button key={s} className="rounded-full border border-border bg-slate-50 px-3 py-2 text-sm text-ink" onClick={() => setScenarioText(s)}>{s}</button>)}
                    </div>
                    <button className="mt-5 rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white shadow-sm" onClick={() => onScenario(scenarioText)}>Evaluate Scenario →</button>
                  </>
                )}
              </div>

              <div className="space-y-4 rounded-[28px] border border-border bg-white p-5 shadow-soft">
                <div className="mb-4 text-[18px] font-medium text-ink">{scenarioMode === 'preauth' ? 'Pre-Authorization Assessment' : 'Your scenario result'}</div>
                {scenarioLoading ? <ScenarioSkeleton /> : scenarioResult ? <ScenarioResultPanel scenarioResult={scenarioResult} /> : <div className="flex h-full min-h-[280px] items-center justify-center text-muted">Your scenario result will appear here.</div>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-border bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={`mt-1 text-sm ${mono ? 'font-mono break-all text-[12px] text-ink' : 'font-medium text-ink'}`}>{value}</div>
    </div>
  )
}

function coverageSectionLabel(section) {
  if (section === 'covered') return "What's Covered"
  if (section === 'exclusions') return "What's Not Covered"
  if (section === 'limits') return 'Limits & Sub-limits'
  return 'Conditions'
}

function renderCoverage(policy, section) {
  if (section === 'covered' || section === 'exclusions') {
    const items = section === 'covered' ? (policy.coverage || []) : (policy.exclusions || [])
    return (
      <div className="space-y-4">
        <div className="max-h-[calc(100vh-390px)] overflow-auto pr-2">
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => <CoverageItem key={`${item.title}-${item.section_id}`} item={item} tone={section === 'covered' ? 'coverage' : 'exclusion'} />)}
          </div>
        </div>
      </div>
    )
  }

  if (section === 'limits') {
    return (
      <div className="max-h-[calc(100vh-390px)] overflow-auto pr-2">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="py-2 pr-4 font-medium">Limit Name</th>
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 font-medium">Section</th>
            </tr>
          </thead>
          <tbody>
            {(policy.limits || []).map((item, idx) => (
              <tr key={idx} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-ink">{item.title}</td>
                <td className="py-3 pr-4 text-muted">{item.description}</td>
                <td className="py-3 text-muted">{item.section_title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return <div className="max-h-[calc(100vh-390px)] space-y-3 overflow-auto pr-2">{(policy.conditions || []).map((item, idx) => <SectionAccordion key={idx} title={item.title} items={[item]} />)}</div>
}

function CoverageItem({ item, tone }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-ink">{item.title}</div>
          <div className="mt-1 line-clamp-3 text-sm leading-6 text-muted">{item.description}</div>
        </div>
        <TagPill tone={tone}>{tone}</TagPill>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
        <span>{item.section_title} · {formatRange(item.page_start, item.page_end)}</span>
        <button className="font-medium text-brand" onClick={() => setOpen((v) => !v)}>{open ? 'Hide evidence' : 'View evidence'}</button>
      </div>
      {open ? (
        <div className="mt-3 rounded-xl border border-border bg-slate-50 p-3 font-mono text-xs text-muted">
          {item.evidence_quote}
        </div>
      ) : null}
    </div>
  )
}

function TypingIndicator() {
  return <div className="inline-flex items-center gap-1 text-sm text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" /><span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" /><span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" /></div>
}

function ScenarioResultPanel({ scenarioResult }) {
  const tone = verdictTone(scenarioResult.verdict)
  const labelMap = { covered: 'COVERED', excluded: 'NOT COVERED', partial: 'PARTIAL', 'not covered': 'NOT COVERED', neutral: 'UNKNOWN', unknown: 'UNKNOWN' }

  return (
    <div className="space-y-4">
      <div className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${tone === 'covered' ? 'bg-covered/10 text-covered' : tone === 'excluded' ? 'bg-excluded/10 text-excluded' : tone === 'partial' ? 'bg-partial/10 text-partial' : 'bg-slate-100 text-muted'}`}>{labelMap[tone] || labelMap[scenarioResult.verdict] || labelMap.neutral}</div>
      <div className="prose prose-sm max-w-none prose-slate text-[15px] leading-7">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{scenarioResult.explanation || ''}</ReactMarkdown>
      </div>
      <div className="rounded-2xl border border-border bg-white p-4 shadow-soft">
        <div className="mb-3 text-sm font-medium text-ink">Evidence from your policy</div>
        <div className="grid gap-2">
          {(scenarioResult.sources || []).slice(0, 3).map((source, idx) => <SourceCard key={idx} item={source} />)}
        </div>
      </div>
    </div>
  )
}

function ScenarioSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-8 w-32 rounded-full bg-slate-200 animate-shimmer" />
      <div className="h-4 w-full rounded-full bg-slate-200 animate-shimmer" />
      <div className="h-4 w-5/6 rounded-full bg-slate-200 animate-shimmer" />
      <div className="h-24 w-full rounded-xl bg-slate-200 animate-shimmer" />
    </div>
  )
}
