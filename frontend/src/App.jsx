import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage.jsx'

export default function App() {
  return (
    <div className="noise" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Scanline effect */}
      <div className="scanline" />

      {/* Subtle grid background */}
      <div className="grid-bg" style={{
        position: 'fixed', inset: 0, opacity: 0.3, zIndex: 0, pointerEvents: 'none'
      }} />

      {/* Glow orbs */}
      <div style={{
        position: 'fixed', top: -200, right: -100, width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #00d4ff08 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: -200, left: -100, width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, #00ff9d06 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* App content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}