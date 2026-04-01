import { useEffect, useState } from 'react'

const STAGES = [
  { key: 'listener',   label: 'Listener',   desc: 'Reading transcript or transcribing audio',  icon: '🎙' },
  { key: 'extractor',  label: 'Extractor',  desc: 'Extracting clinical entities via AI',        icon: '🔬' },
  { key: 'structurer', label: 'Structurer', desc: 'Formatting into structured EMR schema',      icon: '🏗' },
  { key: 'validator',  label: 'Validator',  desc: 'Checking completeness & accuracy',           icon: '✔' },
  { key: 'formatter',  label: 'Formatter',  desc: 'Generating PDF clinical report',             icon: '📄' },
]

function SpinnerIcon() {
  return (
    <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="var(--green)" strokeWidth="3" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  )
}

function StageRow({ stage, status, isLast }) {
  const isProcessing = status === 'processing'
  const isDone       = status === 'done'
  const isError      = status === 'error'
  const isPending    = status === 'pending' || !status

  return (
    <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
      {/* Left: connector line + icon */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isDone   ? 'var(--green-light)'
                    : isProcessing ? 'var(--blue-light)'
                    : isError  ? 'var(--red-light)'
                    : 'var(--surface-2)',
          border: `1.5px solid ${
            isDone       ? '#bbf7d0'
          : isProcessing ? 'var(--blue-mid)'
          : isError      ? '#fecaca'
          : 'var(--border)'
          }`,
          transition: 'all 0.25s',
        }}>
          {isProcessing ? <SpinnerIcon /> :
           isDone       ? <CheckIcon /> :
           isError      ? <span style={{ fontSize: 13, color: 'var(--red)' }}>✕</span> :
           <span style={{ fontSize: 13, filter: 'grayscale(0.5)', opacity: 0.5 }}>{stage.icon}</span>}
        </div>
        {!isLast && (
          <div style={{
            width: 1.5, flex: 1, minHeight: 16,
            background: isDone ? 'var(--green)' : 'var(--border)',
            opacity: isDone ? 0.4 : 1,
            transition: 'background 0.3s',
          }} />
        )}
      </div>

      {/* Right: content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16, paddingLeft: 10, paddingTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{
            fontWeight: 700, fontSize: 13.5,
            color: isDone        ? 'var(--text-heading)'
                 : isProcessing  ? 'var(--blue)'
                 : isError       ? 'var(--red)'
                 : 'var(--text-muted)',
            transition: 'color 0.25s',
          }}>
            {stage.label}
          </span>
          {isProcessing && (
            <span className="badge badge-blue" style={{ fontSize: 10 }}>Running</span>
          )}
          {isDone && (
            <span className="badge badge-green" style={{ fontSize: 10 }}>Done</span>
          )}
          {isError && (
            <span className="badge badge-red" style={{ fontSize: 10 }}>Failed</span>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: 0 }}>
          {stage.desc}
        </p>
      </div>
    </div>
  )
}

export default function PipelineProgress({ stages = {}, isProcessing, processingTimeMs }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isProcessing) { setElapsed(0); return }
    const t = setInterval(() => setElapsed(e => e + 100), 100)
    return () => clearInterval(t)
  }, [isProcessing])

  const completedCount = STAGES.filter(s => stages[s.key] === 'done').length
  const progress = Math.round((completedCount / STAGES.length) * 100)

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {isProcessing && <div className="pulse-dot" />}
          <span style={{ fontFamily: 'Lora, serif', fontWeight: 600, fontSize: 15, color: 'var(--text-heading)' }}>
            Pipeline Status
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isProcessing && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
              {(elapsed / 1000).toFixed(1)}s
            </span>
          )}
          {processingTimeMs && !isProcessing && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--green)' }}>
              ✓ {(processingTimeMs / 1000).toFixed(1)}s
            </span>
          )}
          <span className="section-label">{completedCount}/{STAGES.length} steps</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--surface-2)' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: progress === 100 ? 'var(--green)' : 'var(--blue)',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Stages */}
      <div style={{ padding: '20px 20px' }}>
        {STAGES.map((stage, i) => (
          <StageRow
            key={stage.key}
            stage={stage}
            status={stages[stage.key] || 'pending'}
            isLast={i === STAGES.length - 1}
          />
        ))}
      </div>
    </div>
  )
}