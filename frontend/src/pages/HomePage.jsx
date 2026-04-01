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
        border: `2px dashed ${dragging ? 'var(--accent-cyan)' : 'var(--border)'}`,
        borderRadius: 12, padding: '28px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        cursor: isProcessing ? 'not-allowed' : 'pointer',
        background: dragging ? 'var(--accent-cyan-dim)' : 'var(--bg-secondary)',
        transition: 'all 0.2s',
        opacity: isProcessing ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8"/>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
          Drop audio file here
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
          MP3, WAV, M4A — Whisper transcribes automatically
        </p>
      </div>
      <input ref={inputRef} type="file" accept="audio/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

export default function HomePage() {
  const [mode, setMode] = useState('text') // 'text' | 'audio'
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

    // Simulate stage progression while waiting for backend
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

      // Mark all done
      const allDone = {}
      STAGES_SEQUENCE.forEach(s => { allDone[s] = 'done' })
      setStages(allDone)

      setResult(data.data || data)
      setConsultationId(data.data?.consultationId || data.consultationId)
      setProcessingTimeMs(Date.now() - start)
      toast.success('Clinical record generated!')
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
    if (mode === 'text' && !transcript.trim()) {
      toast.error('Please enter a transcript first')
      return
    }
    if (mode === 'audio' && !audioFile) {
      toast.error('Please select an audio file first')
      return
    }

    if (mode === 'audio') {
      const formData = new FormData()
      formData.append('audio', audioFile)
      if (patientName) formData.append('patientName', patientName)
      if (doctorName) formData.append('doctorName', doctorName)
      simulateStages(() => consultationAPI.processAudio(formData))
    } else {
      simulateStages(() => consultationAPI.process({
        transcript: transcript.trim(),
        patientName: patientName || undefined,
        doctorName: doctorName || undefined,
      }))
    }
  }

  const handleReset = () => {
    setResult(null)
    setStages({})
    setTranscript('')
    setAudioFile(null)
    setPatientName('')
    setDoctorName('')
    setProcessingTimeMs(null)
    setConsultationId(null)
    setError(null)
  }

  const hasStarted = Object.keys(stages).length > 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', fontFamily: 'DM Sans, sans-serif',
          }
        }}
      />

      {/* Page header */}
      {!hasStarted && (
        <div className="fade-in" style={{ marginBottom: 40, textAlign: 'center' }}>
          <div className="badge badge-cyan" style={{ marginBottom: 16 }}>AI CLINICAL DOCUMENTATION</div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(28px, 5vw, 48px)',
            margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.1,
          }}>
            Turn conversations into<br />
            <span style={{ color: 'var(--accent-cyan)' }} className="text-glow-cyan">clinical records</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0 }}>
            Paste a transcript or upload audio — the AI pipeline handles the rest
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: hasStarted ? '1fr 1fr' : '1fr', gap: 24, transition: 'all 0.3s' }}>

        {/* Left column: Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Input card */}
          <div className="card fade-in-d1" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}>
                Consultation Input
              </span>
              {/* Mode toggle */}
              <div style={{
                display: 'flex', background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2
              }}>
                {['text', 'audio'].map(m => (
                  <button key={m} onClick={() => !isProcessing && setMode(m)} style={{
                    padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 12,
                    background: mode === m ? 'var(--accent-cyan)' : 'transparent',
                    color: mode === m ? '#000' : 'var(--text-muted)',
                    transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>{m}</button>
                ))}
              </div>
            </div>

            {/* Patient info row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', 
                  textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Patient Name (optional)</label>
                <input className="input-field" value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  disabled={isProcessing}
                  style={{ padding: '9px 12px', resize: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace',
                  textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Doctor Name (optional)</label>
                <input className="input-field" value={doctorName}
                  onChange={e => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Priya Shah"
                  disabled={isProcessing}
                  style={{ padding: '9px 12px', resize: 'none' }} />
              </div>
            </div>

            {mode === 'text' ? (
              <>
                <textarea
                  className="input-field"
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  placeholder="Paste the doctor-patient conversation transcript here..."
                  disabled={isProcessing}
                  style={{ minHeight: 220, marginBottom: 12, fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.8 }}
                />
                <button onClick={() => setTranscript(SAMPLE_TRANSCRIPT)} disabled={isProcessing}
                  style={{ fontSize: 12, color: 'var(--accent-cyan)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, fontFamily: 'Syne, sans-serif', marginBottom: 12 }}>
                  ↗ Load sample transcript
                </button>
              </>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <UploadZone onFile={setAudioFile} isProcessing={isProcessing} />
                {audioFile && (
                  <div style={{
                    marginTop: 10, padding: '10px 14px',
                    background: 'var(--accent-green-dim)', border: '1px solid #00ff9d33',
                    borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <span style={{ fontSize: 16 }}>🎵</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--accent-green)', fontWeight: 600 }}>{audioFile.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{(audioFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => setAudioFile(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>×</button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={handleSubmit} disabled={isProcessing}
                style={{ flex: 1, justifyContent: 'center' }}>
                {isProcessing ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      style={{ animation: 'spin 0.8s linear infinite' }}>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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
              <PipelineProgress
                stages={stages}
                isProcessing={isProcessing}
                processingTimeMs={processingTimeMs}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="fade-in card" style={{ padding: '16px 20px', borderColor: 'var(--accent-red)', background: '#ff4d6d08' }}>
              <p style={{ margin: 0, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--accent-red)', fontSize: 14 }}>
                Pipeline Error
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{error}</p>
            </div>
          )}
        </div>

        {/* Right column: Results */}
        {result && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Results header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, margin: '0 0 4px' }}>
                  Clinical Record
                </h2>
                {consultationId && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                    ID: {consultationId}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {result.reportPath && (
                  <a
                    href={`/api/consultation/${consultationId}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                    style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 16l-5-5h3V4h4v7h3l-5 5zM20 18H4v2h16v-2z"/>
                    </svg>
                    PDF
                  </a>
                )}
              </div>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', paddingRight: 4 }}>
              <EMRResults data={result} />
            </div>
          </div>
        )}

        {/* Placeholder when not started */}
        {!hasStarted && !result && (
          <div style={{ display: 'none' }} />
        )}
      </div>

      {/* Bottom info strip when not started */}
      {!hasStarted && (
        <div className="fade-in-d3" style={{
          marginTop: 48, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16
        }}>
          {[
            { icon: '🎙️', title: 'Audio or Text', desc: 'Upload audio or paste a transcript — both are supported' },
            { icon: '🤖', title: 'Groq LLaMA 70B', desc: '5-agent pipeline extracts, structures, and validates records' },
            { icon: '📄', title: 'PDF Export', desc: 'Download a formatted prescription & clinical summary instantly' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="card" style={{ padding: '20px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}