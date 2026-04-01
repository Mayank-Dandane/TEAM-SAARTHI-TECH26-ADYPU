function Section({ title, children, accent = 'cyan' }) {
  const accentMap = {
    cyan: { color: 'var(--accent-cyan)', bg: 'var(--accent-cyan-dim)', border: '#00d4ff22' },
    green: { color: 'var(--accent-green)', bg: 'var(--accent-green-dim)', border: '#00ff9d22' },
    amber: { color: 'var(--accent-amber)', bg: 'var(--accent-amber-dim)', border: '#ffb80022' },
  }
  const a = accentMap[accent]

  return (
    <div className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${a.border}`,
        background: a.bg,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: a.color }} />
        <span style={{ 
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13,
          color: a.color, letterSpacing: '0.05em', textTransform: 'uppercase'
        }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    </div>
  )
}

function Tag({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      fontSize: 13,
      color: 'var(--text-primary)',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {label}
    </span>
  )
}

function Field({ label, value }) {
  if (!value || value === 'N/A' || value === 'None') return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', 
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
        {value}
      </div>
    </div>
  )
}

function MedTable({ medications }) {
  if (!medications?.length) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No medications recorded</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Drug', 'Dosage', 'Frequency', 'Duration', 'Route'].map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 12px',
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {medications.map((med, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              {[med.name || med.drug_name, med.dosage, med.frequency, med.duration, med.route || 'Oral'].map((val, j) => (
                <td key={j} style={{ padding: '10px 12px', color: val ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {val || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScoreBar({ score }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color, minWidth: 36 }}>
        {pct}%
      </span>
    </div>
  )
}

export default function EMRResults({ data }) {
  if (!data) return null

  const { extractedData, structuredEMR, validationReport, transcript } = data

  const symptoms = extractedData?.symptoms || []
  const medications = extractedData?.medications || structuredEMR?.medications || []
  const diagnosis = extractedData?.possible_diagnosis || extractedData?.diagnosis || structuredEMR?.diagnosis
  const chiefComplaint = extractedData?.chief_complaint || structuredEMR?.chief_complaint
  const history = extractedData?.history_of_present_illness || extractedData?.history || structuredEMR?.history_of_present_illness
  const vitals = extractedData?.vitals || structuredEMR?.vitals
  const physicalExam = structuredEMR?.physical_examination || structuredEMR?.physical_exam
  const assessment = structuredEMR?.assessment
  const plan = structuredEMR?.plan
  const followUp = structuredEMR?.follow_up || extractedData?.follow_up
  const allergies = extractedData?.allergies || structuredEMR?.allergies
  const completeness = validationReport?.completeness_score

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Completeness score */}
      {completeness !== undefined && (
        <div className="card fade-in" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>
              Record Completeness
            </span>
            <span className={`badge ${completeness >= 0.8 ? 'badge-green' : completeness >= 0.5 ? 'badge-amber' : 'badge-red'}`}>
              {completeness >= 0.8 ? 'HIGH QUALITY' : completeness >= 0.5 ? 'PARTIAL' : 'INCOMPLETE'}
            </span>
          </div>
          <ScoreBar score={completeness} />
          {validationReport?.missing_fields?.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
              Missing: {validationReport.missing_fields.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Chief Complaint */}
      {chiefComplaint && (
        <Section title="Chief Complaint" accent="cyan">
          <p style={{ fontSize: 15, color: 'var(--text-primary)', margin: 0, lineHeight: 1.7 }}>
            {chiefComplaint}
          </p>
        </Section>
      )}

      {/* Symptoms */}
      {symptoms.length > 0 && (
        <Section title="Symptoms" accent="amber">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {symptoms.map((s, i) => (
              <Tag key={i} label={typeof s === 'object' ? s.symptom || s.name || JSON.stringify(s) : s} />
            ))}
          </div>
        </Section>
      )}

      {/* History */}
      {history && (
        <Section title="History of Present Illness" accent="cyan">
          <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.8 }}>
            {history}
          </p>
        </Section>
      )}

      {/* Vitals */}
      {vitals && Object.keys(vitals).length > 0 && (
        <Section title="Vitals" accent="green">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {Object.entries(vitals).filter(([, v]) => v && v !== 'N/A').map(([k, v]) => (
              <div key={k} style={{
                padding: '10px 14px', background: 'var(--bg-secondary)',
                borderRadius: 8, border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', marginBottom: 4 }}>
                  {k.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Physical Exam */}
      {physicalExam && (
        <Section title="Physical Examination" accent="cyan">
          <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.8 }}>
            {typeof physicalExam === 'object' ? JSON.stringify(physicalExam, null, 2) : physicalExam}
          </p>
        </Section>
      )}

      {/* Diagnosis */}
      {diagnosis && (
        <Section title="Assessment / Diagnosis" accent="amber">
          <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.8 }}>
            {Array.isArray(diagnosis) ? diagnosis.join('; ') : diagnosis}
          </p>
        </Section>
      )}

      {/* Plan */}
      {plan && (
        <Section title="Treatment Plan" accent="green">
          <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.8 }}>
            {typeof plan === 'object' ? JSON.stringify(plan, null, 2) : plan}
          </p>
        </Section>
      )}

      {/* Medications */}
      <Section title="Medications / Prescription" accent="cyan">
        <MedTable medications={medications} />
      </Section>

      {/* Allergies + Follow-up */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Section title="Allergies" accent="amber">
          {allergies
            ? <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{Array.isArray(allergies) ? allergies.join(', ') : allergies}</p>
            : <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>None reported</p>
          }
        </Section>
        <Section title="Follow-up" accent="green">
          {followUp
            ? <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{followUp}</p>
            : <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Not specified</p>
          }
        </Section>
      </div>

      {/* Raw transcript collapsible */}
      {transcript && (
        <details className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <summary style={{
            padding: '12px 16px', cursor: 'pointer',
            fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13,
            color: 'var(--text-secondary)', listStyle: 'none',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>▶</span> Raw Transcript
          </summary>
          <div style={{
            padding: '16px', borderTop: '1px solid var(--border)',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13,
            color: 'var(--text-secondary)', lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}>
            {transcript}
          </div>
        </details>
      )}
    </div>
  )
}