const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8200'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options)
  const isJson = (response.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await response.json() : await response.text()
  if (!response.ok) throw new Error(typeof data === 'string' ? data : data?.detail || 'Request failed')
  return data
}

export const uploadPolicy = (file) => {
  const form = new FormData()
  form.append('file', file)
  return request('/v1/policies/upload', { method: 'POST', body: form })
}

export const listPolicies = () => request('/v1/dashboard/policies')
export const getDashboard = (documentId) => request(`/v1/dashboard/${documentId}`)
export const searchPolicy = (documentId, q, top_k = 8) => request(`/v1/dashboard/${documentId}/search?q=${encodeURIComponent(q)}&top_k=${top_k}`)
export const askClarify = ({ document_id, question, top_k = 6 }) => request('/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ document_id, question, top_k }),
})
export const evaluateScenario = ({ document_id, scenario, top_k = 8 }) => request('/v1/scenarios/evaluate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ document_id, scenario, top_k }),
})
