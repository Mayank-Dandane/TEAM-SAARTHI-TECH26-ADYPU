import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav style={{ 
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-primary)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--accent-cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 12h6M12 9v6M12 3a9 9 0 100 18A9 9 0 0012 3z" 
                  stroke="#000" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ 
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16,
              color: 'var(--text-primary)', letterSpacing: '-0.02em'
            }}>
              Doctor<span style={{ color: 'var(--accent-cyan)' }}>Copilot</span>
            </span>
          </Link>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[
              { to: '/', label: 'New Consultation' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                style={{
                  textDecoration: 'none',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 600,
                  color: pathname === to ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  background: pathname === to ? 'var(--accent-cyan-dim)' : 'transparent',
                  border: pathname === to ? '1px solid #00d4ff33' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pulse-dot" />
            <span style={{ 
              fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--accent-green)' 
            }}>
              SYSTEM ONLINE
            </span>
          </div>
        </div>
      </div>
    </nav>
  )
}