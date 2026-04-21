export const cn = (...classes) => classes.filter(Boolean).join(' ')

export const formatRange = (start, end) => {
  if (!start && !end) return 'Pages n/a'
  if (start === end) return `Page ${start}`
  return `Pages ${start}-${end}`
}

export const verdictTone = (verdict = '') => {
  const normalized = verdict.toLowerCase()
  if (normalized.includes('not covered') || normalized.includes('excluded') || normalized.includes('not')) return 'excluded'
  if (normalized.includes('partial')) return 'partial'
  if (normalized.includes('cover')) return 'covered'
  return 'neutral'
}

export const displayPolicyName = (policy) => {
  const name = policy?.policy_name
  if (!name || name === 'string' || name === 'undefined' || name === 'null') return policy?.filename || policy?.document_id || 'Untitled policy'
  return name
}

export const displaySectionTitle = (section) => {
  const title = section?.section_title
  if (!title || ['limited', 'string', 'undefined', 'null'].includes(String(title).trim().toLowerCase())) {
    return `Page ${section?.page_start || ''}`.trim()
  }
  return title
}
