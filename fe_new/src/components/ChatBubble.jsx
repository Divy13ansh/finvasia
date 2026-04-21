import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SourceCard from './SourceCard'

export default function ChatBubble({ role, text, sources = [] }) {
  const [open, setOpen] = useState(false)
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[780px] rounded-2xl border px-4 py-3 ${isUser ? 'border-brand bg-brand text-white shadow-lift' : 'border-border bg-white text-ink shadow-soft'}`}>
        {!isUser ? <div className="mb-1 text-xs font-medium text-brand">Assistant</div> : null}
        <div className="prose prose-sm max-w-none prose-slate text-sm leading-6 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-strong:font-semibold prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || ''}</ReactMarkdown>
        </div>
        {!isUser && sources.length ? (
          <div className="mt-3 border-t border-border pt-3">
            <button className="flex items-center gap-2 text-xs font-medium text-muted" onClick={() => setOpen((v) => !v)}>
              Sources <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open ? <div className="mt-3 grid gap-2">{sources.slice(0, 3).map((source, index) => <SourceCard key={index} item={source} />)}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
