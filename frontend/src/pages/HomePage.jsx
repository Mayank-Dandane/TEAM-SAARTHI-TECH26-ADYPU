import { useState, useRef, useCallback } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import PipelineProgress from '../components/PipelineProgress.jsx'
import EMRResults from '../components/EMRResults.jsx'
import { consultationAPI } from '../services/api.js'

const SAMPLE_TRANSCRIPT = `Doctor: Good morning, what brings you in today?
Patient: I've been having this terrible headache for the past 3 days. It's mostly on the right side and it's throbbing.
Doctor: On a scale of 1-10, how would you rate the pain?
Patient: Around 7 or 8. It's really affecting my work.
Doctor: Any nausea, vomiting, or sensitivity to light?
Patient: Yes, I've been feeling nauseous and bright lights make it worse. I had to close the curtains at home.
Doctor: Any similar episodes before?
Patient: Yes, I've had migraines before, maybe 2-3 times a year, but this one seems worse.
Doctor: Are you on any medication currently?
Patient: Just a daily vitamin D supplement. I tried ibuprofen 400mg but it barely helped.
Doctor: Any allergies?
Patient: I'm allergic to penicillin.
Doctor: Let me check your blood pressure and do a quick neuro exam. BP is 128/82, pulse 76, temperature 98.6°F. Neuro exam is normal, no neck stiffness.
Patient: Is it a migraine?
Doctor: Yes, this appears to be a migraine attack. I'm going to prescribe Sumatriptan 50mg - take one tablet at onset, can repeat after 2 hours if needed. Also prescribing Metoclopramide 10mg for the nausea. Continue ibuprofen 400mg for breakthrough pain. Avoid bright lights and get rest in a dark room.
Doctor: I'd like you to keep a migraine diary noting triggers - stress, sleep, food. Come back in 2 weeks or sooner if symptoms worsen or you develop fever, neck stiffness, or vision changes.
Patient: Thank you doctor, I'll do that.`

const STAGES_SEQUENCE = ['listener', 'extractor', 'structurer', 'validator', 'formatter']

function UploadZone({ onFile, isProcessing }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) onFile(file)
    else toast.error('Please drop an audio file (mp3, wav, m4a)')
  }, [onFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isProcessing && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border-mid)'}`,
        borderRadius: 10, padding: '28px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        cursor: isProcessing ? 'not-allowed' : 'pointer',
        background: dragging ? 'var(--blue-light)' : 'var(--surface-2)',
        transition: 'all 0.2s',
        opacity: isProcessing ? 0.5 : 1,
        textAlign: 'center',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8"/>
        </svg>
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-heading)' }}>
          Drop audio file here
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
          MP3, WAV, M4A — Whisper transcribes automatically
        </p>
      </div>
      <input ref={inputRef} type="file" accept="audio/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

export default function HomePage() {
  const [mode, setMode] = useState('text')
  const [transcript, setTranscript] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [patientName, setPatientName] = useState('')
  const [doctorName, setDoctorName] = useState('')

  const [isProcessing, setIsProcessing] = useState(false)
  const [stages, setStages] = useState({})
  const [result, setResult] = useState(null)
  const [processingTimeMs, setProcessingTimeMs] = useState(null)
  const [consultationId, setConsultationId] = useState(null)
  const [error, setError] = useState(null)

  const simulateStages = async (apiCall) => {
    const start = Date.now()
    setStages({})
    setIsProcessing(true)
    setResult(null)
    setError(null)

    let stageIdx = 0
    const interval = setInterval(() => {
      if (stageIdx < STAGES_SEQUENCE.length) {
        const current = STAGES_SEQUENCE[stageIdx]
        setStages(prev => {
          const updated = { ...prev }
          if (stageIdx > 0) updated[STAGES_SEQUENCE[stageIdx - 1]] = 'done'
          updated[current] = 'processing'
          return updated
        })
        stageIdx++
      }
    }, 1800)

    try {
      const data = await apiCall()
      clearInterval(interval)
      const allDone = {}
      STAGES_SEQUENCE.forEach(s => { allDone[s] = 'done' })
      setStages(allDone)
      setResult(data.data || data)
      setConsultationId(data.data?.consultationId || data.consultationId)
      setProcessingTimeMs(Date.now() - start)
      toast.success('Clinical record generated successfully.')
    } catch (err) {
      clearInterval(interval)
      const failedStage = STAGES_SEQUENCE[Math.max(0, stageIdx - 1)]
      setStages(prev => ({ ...prev, [failedStage]: 'error' }))
      setError(err.message)
      toast.error(err.message || 'Pipeline failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmit = () => {
    if (mode === 'text' && !transcript.trim()) { toast.error('Please enter a transcript first'); return }
    if (mode === 'audio' && !audioFile) { toast.error('Please select an audio file first'); return }

    if (mode === 'audio') {
      const fd = new FormData()
      fd.append('audio', audioFile)
      if (patientName) fd.append('patientName', patientName)
      if (doctorName) fd.append('doctorName', doctorName)
      simulateStages(() => consultationAPI.processAudio(fd))
    } else {
      simulateStages(() => consultationAPI.process({
        transcript: transcript.trim(),
        patientName: patientName || undefined,
        doctorName: doctorName || undefined,
      }))
    }
  }

  const handleReset = () => {
    setResult(null); setStages({}); setTranscript(''); setAudioFile(null)
    setPatientName(''); setDoctorName(''); setProcessingTimeMs(null)
    setConsultationId(null); setError(null)
  }

  const hasStarted = Object.keys(stages).length > 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff', color: 'var(--text-heading)',
            border: '1px solid var(--border)', borderRadius: 8,
            fontSize: 13.5, fontFamily: 'Nunito Sans, sans-serif',
            boxShadow: 'var(--shadow)',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--red)', secondary: '#fff' } },
        }}
      />

      {/* Page header */}
      <div className="fade-in" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span className="badge badge-blue">AI-Powered</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>5-agent pipeline</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>
          New Consultation
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-muted)', maxWidth: 520 }}>
          Paste a transcript or upload audio to automatically generate a structured clinical record and PDF report.
        </p>
      </div>

      {/* Main layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: hasStarted || result ? '1fr 1fr' : '560px 1fr',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* ── Left column: Input ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Input card */}
          <div className="card fade-in-d1" style={{ padding: '20px' }}>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16,
              background: 'var(--surface-2)', borderRadius: 8,
              padding: 3, border: '1px solid var(--border)',
            }}>
              {['text', 'audio'].map(m => (
                <button key={m} onClick={() => setMode(m)} disabled={isProcessing}
                  style={{
                    flex: 1, padding: '7px 0',
                    borderRadius: 6, border: 'none',
                    fontSize: 13, fontWeight: 700,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    background: mode === m ? 'var(--surface)' : 'transparent',
                    color: mode === m ? 'var(--blue)' : 'var(--text-muted)',
                    boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                  {m === 'text' ? '📝 Text Transcript' : '🎙 Audio File'}
                </button>
              ))}
            </div>

            {/* Patient / Doctor fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 5 }}>Patient Name</label>
                <input className="input-field" value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar" disabled={isProcessing}
                  style={{ padding: '9px 12px' }} />
              </div>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 5 }}>Doctor Name</label>
                <input className="input-field" value={doctorName}
                  onChange={e => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Priya Shah" disabled={isProcessing}
                  style={{ padding: '9px 12px' }} />
              </div>
            </div>

            {/* Input area */}
            {mode === 'text' ? (
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: 5 }}>
                  Consultation Transcript
                </label>
                <textarea className="input-field" value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder="Paste the doctor–patient conversation here…"
                  disabled={isProcessing}
                  style={{ minHeight: 200, marginBottom: 8, fontSize: 13.5, lineHeight: 1.75 }}
                />
                <button className="btn-ghost" onClick={() => setTranscript(SAMPLE_TRANSCRIPT)} disabled={isProcessing}>
                  ↗ Load sample transcript
                </button>
              </div>
            ) : (
              <div>
                <UploadZone onFile={setAudioFile} isProcessing={isProcessing} />
                {audioFile && (
                  <div style={{
                    marginTop: 10, padding: '10px 14px',
                    background: 'var(--green-light)', border: '1px solid #bbf7d0',
                    borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 18 }}>🎵</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--green)', fontWeight: 700 }}>{audioFile.name}</p>
                      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-muted)' }}>{(audioFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => setAudioFile(null)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
                    }}>×</button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-primary" onClick={handleSubmit} disabled={isProcessing}
                style={{ flex: 1, justifyContent: 'center' }}>
                {isProcessing ? (
                  <>
                    <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    Run Pipeline
                  </>
                )}
              </button>
              {(hasStarted || result) && (
                <button className="btn-outline" onClick={handleReset} disabled={isProcessing}>
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Pipeline progress */}
          {hasStarted && (
            <div className="fade-in">
              <PipelineProgress stages={stages} isProcessing={isProcessing} processingTimeMs={processingTimeMs} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card fade-in" style={{
              padding: '14px 18px',
              borderColor: '#fecaca', background: 'var(--red-light)',
            }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--red)', fontSize: 13.5 }}>
                Pipeline Error
              </p>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-body)' }}>{error}</p>
            </div>
          )}
        </div>

        {/* ── Right column: Results or placeholder ── */}
        {result ? (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Results header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 20, marginBottom: 3 }}>Clinical Record</h2>
                {consultationId && (
                  <span style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-faint)' }}>
                    ID: {consultationId}
                  </span>
                )}
              </div>
              {result.reportPath && (
                <a href={`/api/consultation/${consultationId}/pdf`} target="_blank" rel="noreferrer"
                  className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 16l-5-5h3V4h4v7h3l-5 5zM20 18H4v2h16v-2z"/>
                  </svg>
                  Download PDF
                </a>
              )}
            </div>

            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 180px)', paddingRight: 2 }}>
              <EMRResults data={result} />
            </div>
          </div>
        ) : !hasStarted ? (
          /* Feature cards when idle */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 60 }}>
            {[
              {
                icon: '🎙',
                title: 'Audio or Text Input',
                desc: 'Upload an MP3/WAV recording or paste a typed transcript — both work seamlessly.',
                accent: 'var(--blue)',
                bg: 'var(--blue-light)',
              },
              {
                icon: '🤖',
                title: 'Groq LLaMA 70B',
                desc: 'A 5-agent pipeline extracts, structures, and validates the clinical record in seconds.',
                accent: 'var(--teal)',
                bg: 'var(--teal-light)',
              },
              {
                icon: '📄',
                title: 'Instant PDF Report',
                desc: 'Download a formatted prescription and clinical summary with one click.',
                accent: 'var(--amber)',
                bg: 'var(--amber-light)',
              },
            ].map(({ icon, title, desc, accent, bg }, i) => (
              <div key={title} className={`card fade-in-d${i + 2}`}
                style={{ padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: bg, border: `1px solid ${accent}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  {icon}
                </div>
                <div>
                  <h3 style={{ fontSize: 14.5, fontFamily: 'Nunito Sans, sans-serif', fontWeight: 700, marginBottom: 4 }}>{title}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}

            {/* Trust strip */}
            <div className="fade-in-d5" style={{
              marginTop: 4, padding: '12px 16px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Data is processed locally. No consultation data is stored without your consent.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}