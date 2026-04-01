function SectionCard({ title, accent = 'blue', children }) {
  const colors = {
    blue:  { bar: 'var(--blue)',  bg: 'var(--blue-light)',  label: '#1e40af' },
    teal:  { bar: 'var(--teal)',  bg: 'var(--teal-light)',  label: '#0f766e' },
    amber: { bar: 'var(--amber)', bg: 'var(--amber-light)', label: '#92400e' },
    green: { bar: 'var(--green)', bg: 'var(--green-light)', label: '#14532d' },
    red:   { bar: 'var(--red)',   bg: 'var(--red-light)',   label: '#991b1b' },
  }
  const c = colors[accent] || colors.blue

  return (
    <div className="card fade-in" style={{ overflow: 'hidden', marginBottom: 0 }}>
      <div style={{
        padding: '10px 16px',
        background: c.bg,
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: c.bar, flexShrink: 0 }} />
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.07em', color: c.label,
          fontFamily: 'Nunito Sans, sans-serif',
        }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '14px 16px' }}>
        {children}
      </div>
    </div>
  )
}

function Tag({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      background: 'var(--blue-light)',
      border: '1px solid var(--blue-mid)',
      fontSize: 12.5, color: 'var(--blue)',
      fontWeight: 600,
    }}>
      {label}
    </span>
  )
}

function Field({ label, value }) {
  if (!value || value === 'N/A' || value === 'None') return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="section-label" style={{ marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.65 }}>{value}</div>
    </div>
  )
}

function MedTable({ medications }) {
  if (!medications?.length)
    return <p style={{ color: 'var(--text-faint)', fontSize: 13.5 }}>No medications recorded.</p>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)' }}>
            {['Drug', 'Dosage', 'Frequency', 'Duration', 'Route'].map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 12px',
                fontFamily: 'Nunito Sans, sans-serif', fontSize: 11,
                fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid var(--border)',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {medications.map((med, i) => (
            <tr key={i} style={{
              borderBottom: '1px solid var(--border)',
              background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)',
            }}>
              {[med.name || med.drug_name, med.dosage, med.frequency, med.duration, med.route || 'Oral'].map((val, j) => (
                <td key={j} style={{
                  padding: '9px 12px',
                  color: val ? 'var(--text-body)' : 'var(--text-faint)',
                  fontWeight: j === 0 ? 600 : 400,
                }}>
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
  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, color: 'var(--text-body)', fontWeight: 600 }}>Record Completeness</span>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
          fontWeight: 700, color,
        }}>{pct}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color, borderRadius: 8,
          transition: 'width 1s ease',
        }} />
      </div>
    </div>
  )
}

export default function EMRResults({ data }) {
  if (!data) return null

  const { extractedData, structuredEMR, validationReport, transcript } = data

  const symptoms      = extractedData?.symptoms || []
  const medications   = extractedData?.medications || structuredEMR?.medications || []
  const diagnosis     = extractedData?.possible_diagnosis || extractedData?.diagnosis || structuredEMR?.diagnosis
  const chiefComplaint = extractedData?.chief_complaint || structuredEMR?.chief_complaint
  const history       = extractedData?.history_of_present_illness || extractedData?.history || structuredEMR?.history_of_present_illness
  const vitals        = extractedData?.vitals || structuredEMR?.vitals
  const physicalExam  = structuredEMR?.physical_examination || structuredEMR?.physical_exam
  const assessment    = structuredEMR?.assessment
  const plan          = structuredEMR?.plan
  const followUp      = structuredEMR?.follow_up || extractedData?.follow_up
  const allergies     = extractedData?.allergies || structuredEMR?.allergies
  const completeness  = validationReport?.completeness_score

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Completeness */}
      {completeness !== undefined && (
        <div className="card fade-in" style={{ padding: '16px 18px' }}>
          <ScoreBar score={completeness} />
          {validationReport?.missing_fields?.length > 0 && (
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Missing fields: {validationReport.missing_fields.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Chief Complaint */}
      {chiefComplaint && (
        <SectionCard title="Chief Complaint" accent="blue">
          <p style={{ fontSize: 14.5, color: 'var(--text-body)', lineHeight: 1.7, margin: 0 }}>
            {chiefComplaint}
          </p>
        </SectionCard>
      )}

      {/* Symptoms */}
      {symptoms.length > 0 && (
        <SectionCard title="Presenting Symptoms" accent="amber">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {symptoms.map((s, i) => (
              <Tag key={i} label={typeof s === 'object' ? s.symptom || s.name || JSON.stringify(s) : s} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* History */}
      {history && (
        <SectionCard title="History of Present Illness" accent="blue">
          <p style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.75, margin: 0 }}>{history}</p>
        </SectionCard>
      )}

      {/* Vitals */}
      {vitals && Object.keys(vitals).length > 0 && (
        <SectionCard title="Vitals" accent="teal">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {Object.entries(vitals).filter(([, v]) => v && v !== 'N/A').map(([k, v]) => (
              <div key={k} style={{
                padding: '10px 12px',
                background: 'var(--teal-light)',
                borderRadius: 8, border: '1px solid #99f6e4',
                textAlign: 'center',
              }}>
                <div className="section-label" style={{ marginBottom: 4 }}>{k.replace(/_/g, ' ')}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-heading)' }}>{v}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Physical Exam */}
      {physicalExam && (
        <SectionCard title="Physical Examination" accent="blue">
          <p style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.75, margin: 0 }}>
            {typeof physicalExam === 'object' ? JSON.stringify(physicalExam, null, 2) : physicalExam}
          </p>
        </SectionCard>
      )}

      {/* Diagnosis */}
      {diagnosis && (
        <SectionCard title="Assessment / Diagnosis" accent="amber">
          <p style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.75, margin: 0 }}>
            {Array.isArray(diagnosis) ? diagnosis.join('; ') : diagnosis}
          </p>
        </SectionCard>
      )}

      {/* Plan */}
      {plan && (
        <SectionCard title="Treatment Plan" accent="green">
          <p style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.75, margin: 0 }}>
            {typeof plan === 'object' ? JSON.stringify(plan, null, 2) : plan}
          </p>
        </SectionCard>
      )}

      {/* Medications */}
      <SectionCard title="Medications / Prescription" accent="blue">
        <MedTable medications={medications} />
      </SectionCard>

      {/* Allergies + Follow-up */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SectionCard title="Allergies" accent="red">
          {allergies
            ? <p style={{ fontSize: 14, color: 'var(--text-body)', margin: 0 }}>
                {Array.isArray(allergies) ? allergies.join(', ') : allergies}
              </p>
            : <p style={{ fontSize: 13.5, color: 'var(--text-faint)', margin: 0 }}>None reported</p>
          }
        </SectionCard>
        <SectionCard title="Follow-up" accent="green">
          {followUp
            ? <p style={{ fontSize: 14, color: 'var(--text-body)', margin: 0 }}>{followUp}</p>
            : <p style={{ fontSize: 13.5, color: 'var(--text-faint)', margin: 0 }}>Not specified</p>
          }
        </SectionCard>
      </div>

      {/* Raw Transcript */}
      {transcript && (
        <details className="card" style={{ overflow: 'hidden' }}>
          <summary style={{
            padding: '12px 16px', cursor: 'pointer',
            fontWeight: 600, fontSize: 13.5,
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 8, listStyle: 'none',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 6l6 6-6 6"/>
            </svg>
            Raw Transcript
          </summary>
          <div style={{
            padding: '14px 16px', borderTop: '1px solid var(--border)',
            fontSize: 13.5, color: 'var(--text-body)', lineHeight: 1.8,
            whiteSpace: 'pre-wrap', background: 'var(--surface-2)',
          }}>
            {transcript}
          </div>
        </details>
      )}

    </div>
  )
}