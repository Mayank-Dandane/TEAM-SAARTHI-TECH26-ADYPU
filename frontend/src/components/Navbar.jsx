import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>

          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'var(--blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {/* Caduceus-style cross */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="3" fill="#fff" fillOpacity="0.25"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{
                fontFamily: 'Lora, serif', fontWeight: 600, fontSize: 15,
                color: 'var(--text-heading)',
              }}>
                Doctor<span style={{ color: 'var(--blue)' }}>Copilot</span>
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 500, letterSpacing: '0.03em' }}>
                AI Clinical Documentation
              </span>
            </div>
          </Link>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {[{ to: '/', label: 'New Consultation' }].map(({ to, label }) => (
              <Link key={to} to={to} style={{
                textDecoration: 'none',
                padding: '6px 14px', borderRadius: 6,
                fontSize: 13.5, fontWeight: 600,
                color: pathname === to ? 'var(--blue)' : 'var(--text-muted)',
                background: pathname === to ? 'var(--blue-light)' : 'transparent',
                transition: 'all 0.15s',
              }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div className="pulse-dot" />
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: 'var(--green)',
              fontFamily: 'Nunito Sans, sans-serif',
            }}>
              System Online
            </span>
          </div>

        </div>
      </div>
    </nav>
  )
}