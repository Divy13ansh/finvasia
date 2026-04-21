import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ChevronLeft, FileText, Shield, MessageCircle, Zap } from 'lucide-react'
import Brand from './Brand'
import { displayPolicyName } from '../lib/utils'

const items = [
  { to: '', label: 'Overview', icon: FileText },
  { to: 'coverage/covered', label: 'Coverage', icon: Shield },
  { to: 'chat', label: 'Ask Clarify', icon: MessageCircle },
  { to: 'scenario', label: 'Scenario Sim', icon: Zap },
]

export default function Sidebar({ policy, basePath = '/policy' }) {
  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-border bg-white px-4 py-4">
      <Link to="/library" className="mb-6 inline-flex items-center text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Policy Library
      </Link>
      <Brand />
      <div className="mt-6">
        <div className="text-[14px] font-medium text-ink">{displayPolicyName(policy) || 'Select a policy'}</div>
        <div className="mt-1 text-xs text-muted">{policy?.filename || policy?.document_id || '...'}</div>
      </div>
      <div className="my-5 h-px bg-border" />
      <nav className="grid gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={label}
            to={to ? `${basePath}/${policy?.document_id}/${to}` : `${basePath}/${policy?.document_id}`}
            className={({ isActive }) => `flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${isActive ? 'bg-blue-50 text-brand shadow-sm' : 'text-muted hover:bg-slate-50 hover:text-ink'}`}
            end={to === '' || to === 'scenario'}
          >
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto text-xs text-muted">Workspace</div>
    </aside>
  )
}
