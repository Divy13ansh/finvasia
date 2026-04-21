import React, { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LibraryPage from './pages/LibraryPage'
import PolicyWorkspace from './pages/PolicyWorkspace'
import { uploadPolicy, listPolicies } from './lib/api'

export default function App() {
  const navigate = useNavigate()
  const [policies, setPolicies] = useState([])
  const [loadingPolicies, setLoadingPolicies] = useState(true)
  const [policyError, setPolicyError] = useState('')
  const [uploading, setUploading] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [currentDocumentId, setCurrentDocumentId] = useState('')

  const refreshPolicies = async () => {
    setLoadingPolicies(true)
    setPolicyError('')
    try {
      const data = await listPolicies()
      setPolicies(data)
    } catch (error) {
      setPolicyError(error.message)
    } finally {
      setLoadingPolicies(false)
    }
  }

  useEffect(() => {
    refreshPolicies()
  }, [])

  const handleUpload = async (file) => {
    if (!file) return
    setUploadError('')
    setUploading({ step: 0 })
    try {
      setUploading({ step: 0 })
      const result = await uploadPolicy(file)
      setUploading({ step: 1 })
      await new Promise((r) => setTimeout(r, 240))
      setUploading({ step: 2 })
      await new Promise((r) => setTimeout(r, 240))
      setUploading({ step: 3 })
      setCurrentDocumentId(result.document_id)
      await refreshPolicies()
      navigate(`/policy/${result.document_id}`)
    } catch (error) {
      setUploadError(error.message)
    } finally {
      setUploading(null)
    }
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage onUpload={handleUpload} uploading={uploading} error={uploadError} onRetry={() => setUploadError('')} policies={policies} currentDocumentId={currentDocumentId} />} />
      <Route path="/library" element={<LibraryPage policies={policies} loading={loadingPolicies} error={policyError} onRetry={refreshPolicies} />} />
      <Route path="/policy/:document_id" element={<PolicyWorkspace currentDocumentId={currentDocumentId} />} />
      <Route path="/policy/:document_id/:tab" element={<PolicyWorkspace currentDocumentId={currentDocumentId} />} />
      <Route path="/policy/:document_id/scenario" element={<PolicyWorkspace currentDocumentId={currentDocumentId} />} />
      <Route path="/policy/:document_id/scenario/preauth" element={<PolicyWorkspace currentDocumentId={currentDocumentId} />} />
      <Route path="/policy/:document_id/preauth" element={<PolicyWorkspace currentDocumentId={currentDocumentId} />} />
      <Route path="/policy/:document_id/coverage/:section" element={<PolicyWorkspace currentDocumentId={currentDocumentId} />} />
      <Route path="/policies" element={<Navigate to="/library" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
