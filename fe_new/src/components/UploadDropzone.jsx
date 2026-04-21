import React, { useRef, useState } from 'react'
import { FileUp, Check, Loader2 } from 'lucide-react'

const steps = [
  'Extracting text from document...',
  'Indexing policy sections...',
  'Building your dashboard...',
]

export default function UploadDropzone({ onUpload, uploading }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)

  const handleFile = async (picked) => {
    if (!picked) return
    setFile(picked)
    await onUpload(picked)
  }

  return (
    <div
      className={`mx-auto flex h-[200px] w-full max-w-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white px-6 text-center transition ${dragging ? 'border-brand bg-blue-50' : 'border-border'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFile(e.dataTransfer.files?.[0])
      }}
    >
      <FileUp className="h-8 w-8 text-brand" />
      <div className="mt-3 text-sm text-muted">Drop your policy PDF here</div>
      <button className="mt-3 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink shadow-sm" onClick={() => inputRef.current?.click()}>
        Choose PDF
      </button>
      <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      {uploading ? (
        <div className="mt-4 w-full space-y-2 text-left text-xs text-muted">
          {steps.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              {idx < uploading.step ? <Check className="h-4 w-4 text-covered" /> : idx === uploading.step ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <div className="h-4 w-4 rounded-full border border-slate-300" />}
              <span className={idx <= uploading.step ? 'text-ink' : 'text-slate-400'}>{step}</span>
            </div>
          ))}
        </div>
      ) : null}

      {file ? <div className="mt-3 text-xs text-muted">Selected: {file.name}</div> : null}
    </div>
  )
}
