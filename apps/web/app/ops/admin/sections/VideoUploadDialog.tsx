"use client"

import { useState, useEffect, useRef } from "react"
import { startVideoUpload } from "@/lib/upload-manager"

interface VideoUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File, metadata: UploadMetadata) => Promise<{ videoId: string, vdoCipherId: string }> |
    void
  sectionId: string
  token: string
  initialTitle?: string
  initialOrder?: number
  videoId?: string
  uploadEndpoint?: string
  uploadBody?: Record<string, any>
}

interface UploadMetadata {
  title: string
  order: number
  filename: string
  contentType: string
}

export function VideoUploadDialog({ isOpen, onClose, onUpload, sectionId, token, initialTitle = '', initialOrder = 1, videoId, uploadEndpoint, uploadBody }: VideoUploadDialogProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [step, setStep] = useState<'idle' | 'select'>('idle')
  const [formData, setFormData] = useState<UploadMetadata>({ title: '', order: 1, filename: '', contentType: '' })
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setStep('idle')
    setFormData({ title: initialTitle, order: initialOrder, filename: '', contentType: '' })
    setFile(null)
    setError(null)
  }

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      resetForm()
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, MOV, MKV)')
      return
    }

    if (selectedFile.size > 4 * 1024 * 1024 * 1024) {
      setError('Video size must be less than 4GB')
      return
    }

    const extension = selectedFile.name.split('.').pop() || ''
    const isValidType = ['mp4', 'mov', 'mkv'].includes(extension.toLowerCase())
    if (!isValidType) {
      setError('Please select MP4, MOV, or MKV files only')
      return
    }

    setFormData(prev => ({ ...prev, filename: selectedFile.name, contentType: selectedFile.type }))
    setFile(selectedFile)
    setStep('select')
    setError(null)
  }

  function uploadFile() {
    if (!file || !formData.title.trim()) {
      setError('Please provide a title and select a video file')
      return
    }

    const endpoint = uploadEndpoint || '/api/admin/videos/upload-credentials'
    const body = uploadBody || {
      title: formData.title,
      filename: formData.filename,
      contentType: formData.contentType,
      sectionId,
      order: formData.order,
      ...(videoId ? { videoId } : {}),
    }
    const uploadingFile = file
    const uploadingMetadata = formData

    // Close the dialog immediately instead of blocking on the upload here —
    // the actual transfer now runs in lib/upload-manager.ts, independent of
    // this component's lifecycle, and its progress is tracked by the global
    // bottom-right UploadProgressWidget (mounted in app/ops/layout.tsx). This
    // lets the admin keep working (e.g. open another lesson) while a large
    // video uploads in the background.
    handleClose()

    startVideoUpload({
      file: uploadingFile,
      token,
      endpoint,
      body,
      onDone: async () => { await onUpload?.(uploadingFile, uploadingMetadata) },
    }).catch(() => {
      // Already surfaced to the admin via the widget's error state — this
      // catch only exists to avoid an unhandled-rejection console warning.
    })
  }

  const handleClose = () => {
    onClose()
  }

  if (!isVisible && !isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden transform transition-all duration-300"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,.4)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--orange)] to-[var(--orange2)] flex items-center justify-center">
              <span className="text-white text-lg">📹</span>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Upload Video</h2>
              <p className="text-sm" style={{ color: 'var(--text3)' }}>Upload video files to VdoCipher</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{ color: 'var(--btn-text, var(--text3))', backgroundColor: 'var(--btn-bg, transparent)' }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement
              target.style.backgroundColor = 'var(--btn-bg-hover, var(--panel))'
              target.style.color = 'var(--btn-text, var(--text))'
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement
              target.style.backgroundColor = 'var(--btn-bg, transparent)'
              target.style.color = 'var(--btn-text, var(--text3))'
            }}
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {step === 'idle' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-[var(--orange-d)] flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📤</span>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Select Video File</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>Upload MP4, MOV, or MKV files (max 4GB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/x-matroska"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-lg font-medium transition-all duration-200"
                style={{ backgroundColor: 'var(--btn-bg, var(--orange))', color: 'var(--btn-text, white)' }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLElement
                  target.style.backgroundColor = 'var(--btn-bg-hover, var(--orange2))'
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLElement
                  target.style.backgroundColor = 'var(--btn-bg, var(--orange))'
                }}
              >
                Choose Video File
              </button>
            </div>
          )}

          {step === 'select' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text2)' }}>Video Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                  className="w-full px-4 py-3 rounded-lg border transition-colors"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  onFocus={(e) => {
                    const target = e.target as HTMLElement
                    target.style.borderColor = 'var(--orange)'
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLElement
                    target.style.borderColor = 'var(--border)'
                  }}
                />
              </div>

              <div className="p-4 rounded-lg" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-black/40 flex items-center justify-center">
                    <span className="text-lg">📹</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{formData.filename}</div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>{(file?.size || 0) / (1024 * 1024)} MB</div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                  <div className="text-sm font-medium" style={{ color: 'var(--red)' }}>Error</div>
                  <div className="text-xs" style={{ color: 'var(--red)' }}>{error}</div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('idle')}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--btn-text, var(--text2))', backgroundColor: 'var(--btn-bg, transparent)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={uploadFile}
                  disabled={!formData.title.trim()}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--btn-bg, var(--orange))', color: 'var(--btn-text, white)' }}
                >
                  Upload & Process
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
