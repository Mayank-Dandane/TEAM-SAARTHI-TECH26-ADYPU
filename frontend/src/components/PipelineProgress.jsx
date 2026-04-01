import { useEffect, useState } from 'react'

const STAGES = [
  { key: 'listener',   label: 'Listener',   desc: 'Transcribing audio / reading input',  icon: '🎙️' },
  { key: 'extractor',  label: 'Extractor',  desc: 'Extracting clinical entities via LLM', icon: '🔬' },
  { key: 'structurer', label: 'Structurer', desc: 'Formatting into EMR schema',           icon: '🏗️' },
  { key: 'validator',  label: 'Validator',  desc: 'Checking completeness & accuracy',     icon: '✅' },
  { key: 'formatter',  label: 'Formatter',  desc: 'Generating PDF report',                icon: '📄' },
]

function StageRow({ stage, status, isActive, result }) {
  const colors = {
    pending:    { text: 'var(--text-muted)',     bg: 'transparent',              border: 'var(--border)' },
    processing: { text: 'var(--accent-cyan)',    bg: 'var(--accent-cyan-dim)',   border: 'var(--accent-cyan)' },
    done:       { text: 'var(--accent-green)',   bg: 'var(--accent-green-dim)',  border: 'var(--accent-green)' },
    error:      { text: 'var(--accent-red)',     bg: '#ff4d6d18',                border: 'var(--accent-red)' },
  }
  const c = colors[status] || colors.pending

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      padding: '16px 20px',
      borderRadius: 10,
      background: isActive ? 'var(--bg-card-hover)' : 'transparent',
      border: `1px solid ${isActive ? c.border : 'transparent'}`,
      transition: 'all 0.3s',
      boxShadow: isActive && status === 'processing' ? `0 0 20px ${c.bg}` : 'none',
    }}>
      {/* Icon + connector */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: c.bg,
          border: `1px solid ${c.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
          transition: 'all 0.3s',
        }}>
          {status === 'processing' ? (
            <SpinnerIcon color={c.text} />
          ) : status === 'done' ? (
            <CheckIcon />
          ) : status === 'error' ? (
            <span style={{ fontSize: 14 }}>✗</span>
          ) : (
            stage.icon
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ 
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14,
            color: c.text, transition: 'color 0.3s'
          }}>
            {stage.label}
          </span>
          <span className={`badge ${
            status === 'processing' ? 'badge-cyan' :
            status === 'done' ? 'badge-green' :
            status === 'error' ? 'badge-red' : ''
          }`} style={{ opacity: status === 'pending' ? 0 : 1 }}>
            {status === 'processing' ? 'running' : status === 'done' ? 'complete' : status === 'error' ? 'failed' : ''}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
          {stage.desc}
        </p>
        {status === 'done' && result && (
          <div style={{
            marginTop: 8, padding: '8px 12px',
            background: 'var(--bg-secondary)',
            borderRadius: 6, border: '1px solid var(--border)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, color: 'var(--text-secondary)',
            maxHeight: 60, overflow: 'hidden',
          }}>
            {typeof result === 'object' ? JSON.stringify(result).slice(0, 120) + '…' : String(result).slice(0, 120)}
          </div>
        )}
      </div>

      {/* Progress bar for active */}
      {status === 'processing' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, overflow: 'hidden', borderRadius: '0 0 10px 10px' }}>
          <div style={{
            height: '100%',
            background: `linear-gradient(90deg, transparent, var(--accent-cyan), transparent)`,
            animation: 'scanline-h 1.5s linear infinite',
          }} />
        </div>
      )}
    </div>
  )
}

function SpinnerIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="3" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
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
  const progress = (completedCount / STAGES.length) * 100

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isProcessing && <div className="pulse-dot" />}
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}>
            Pipeline Execution
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isProcessing && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
              {(elapsed / 1000).toFixed(1)}s
            </span>
          )}
          {processingTimeMs && !isProcessing && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--accent-green)' }}>
              ✓ {(processingTimeMs / 1000).toFixed(1)}s
            </span>
          )}
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>
            {completedCount}/{STAGES.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--bg-secondary)', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${progress}%`,
          background: progress === 100
            ? 'var(--accent-green)'
            : 'linear-gradient(90deg, var(--accent-cyan), #7b61ff)',
          transition: 'width 0.5s ease',
          boxShadow: `0 0 8px var(--accent-cyan)`,
        }} />
      </div>

      {/* Stages */}
      <div style={{ padding: '8px 4px' }}>
        {STAGES.map((stage) => (
          <div key={stage.key} style={{ position: 'relative' }}>
            <StageRow
              stage={stage}
              status={stages[stage.key] || 'pending'}
              isActive={stages[stage.key] === 'processing' || stages[stage.key] === 'done'}
              result={null}
            />
          </div>
        ))}
      </div>
    </div>
  )
}