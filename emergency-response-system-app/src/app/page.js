'use client';
import { useState, useEffect } from 'react';
import { Siren, Radio, ShieldCheck, Activity, ArrowRight, Navigation, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

const portals = [
  {
    href: '/sos',
    title: 'Patient Portal',
    subtitle: 'Emergency SOS & Tracking',
    description: 'Request an ambulance instantly and track your ride in real-time.',
    icon: Siren,
    color: '#ff2d55',
    gradient: 'linear-gradient(135deg, #ff2d55 0%, #cc0033 100%)',
    features: ['One-tap SOS', 'Live GPS Tracking'],
  },
  {
    href: '/dashboard',
    title: 'Dispatcher Portal',
    subtitle: 'Command & Control',
    description: 'Manage live emergencies and coordinate fleet operations.',
    icon: Radio,
    color: '#0a84ff',
    gradient: 'linear-gradient(135deg, #0a84ff 0%, #0055cc 100%)',
    features: ['Live Feed', 'Fleet Management'],
  },
  {
    href: '/maintenance',
    title: 'Admin Portal',
    subtitle: 'Control Hub & History',
    description: 'Monitor maintenance logs, hospital beds, and system analytics.',
    icon: ShieldCheck,
    color: '#30d158',
    gradient: 'linear-gradient(135deg, #30d158 0%, #1fa844 100%)',
    features: ['Maintenance Hub', 'Resource Audit'],
  },
  {
    href: '/duty',
    title: 'Driver Portal',
    subtitle: 'Active Navigation',
    description: 'Receive emergency alerts and navigate to patients with optimized routing.',
    icon: Navigation,
    color: '#ff9f0a',
    gradient: 'linear-gradient(135deg, #ff9f0a 0%, #ffcc00 100%)',
    features: ['Trip Navigation', 'Status Updates'],
  },
];

export default function PortalPage() {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="portal-page">
      <style>{`
        .portal-page {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 40px 24px;
          background: var(--bg-primary);
          background-image: 
            radial-gradient(circle at 2px 2px, var(--border-subtle) 1px, transparent 0);
          background-size: 32px 32px;
          position: relative; overflow-x: hidden;
        }
        .portal-page::before {
          content: ''; position: absolute; top: -10%; left: -10%; width: 40%; height: 40%;
          background: radial-gradient(circle, rgba(255,45,85,0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .portal-page::after {
          content: ''; position: absolute; bottom: -10%; right: -10%; width: 40%; height: 40%;
          background: radial-gradient(circle, rgba(10,132,255,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .portal-header { text-align: center; margin-bottom: 48px; z-index: 10; }
        .portal-logo-container {
          position: relative; width: fit-content; margin: 0 auto 24px;
        }
        .portal-logo {
          width: 64px; height: 64px; border-radius: 18px; display: flex;
          align-items: center; justify-content: center;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          position: relative; z-index: 2;
        }
        .logo-ring {
          position: absolute; inset: -8px; border-radius: 24px;
          border: 2px solid var(--red); opacity: 0.1;
          animation: ringPulse 2s infinite;
        }
        @keyframes ringPulse { 0% { transform: scale(1); opacity: 0.2; } 100% { transform: scale(1.3); opacity: 0; } }

        .portal-header h1 {
          font-size: 48px; font-weight: 950; color: var(--text-primary);
          letter-spacing: -2px; margin-bottom: 8px;
          background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.7) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .portal-header p { 
          color: var(--text-muted); font-size: 16px; font-weight: 500; 
          letter-spacing: 4px; text-transform: uppercase;
        }

        .portal-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 16px; width: 100%; max-width: 800px; z-index: 10;
        }
        .portal-card {
          background: var(--bg-card); 
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-subtle);
          border-radius: 24px; padding: 20px; cursor: pointer;
          text-decoration: none; color: inherit;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; gap: 14px;
        }
        .portal-card:hover {
          background: var(--bg-card-hover);
          transform: translateY(-4px) scale(1.01);
          border-color: var(--border-accent);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .card-bg-glow {
          position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, var(--glow-color) 0%, transparent 60%);
          opacity: 0; transition: opacity 0.4s; pointer-events: none;
        }
        .portal-card:hover .card-bg-glow { opacity: 0.05; }

        .portal-card-header {
          display: flex; align-items: center; justify-content: space-between;
        }
        .portal-card-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.4s;
        }
        .portal-card:hover .portal-card-icon { transform: rotate(-8deg) scale(1.1); }
        
        .portal-card h2 { font-size: 20px; font-weight: 800; color: var(--text-primary); margin: 0; }
        .portal-card .portal-subtitle { 
          font-size: 10px; font-weight: 900; text-transform: uppercase; 
          letter-spacing: 1.5px; opacity: 0.7;
        }
        .portal-card .portal-desc { 
          font-size: 13px; color: var(--text-secondary); line-height: 1.5; 
          margin-bottom: 4px; height: 40px; overflow: hidden;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }

        .portal-features { display: flex; flex-wrap: wrap; gap: 6px; }
        .portal-feature {
          padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 800;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle);
          color: var(--text-muted); transition: all 0.2s;
        }
        .portal-card:hover .portal-feature { border-color: rgba(255,255,255,0.1); color: var(--text-secondary); }

        .portal-enter {
          display: flex; align-items: center; gap: 8px; margin-top: auto;
          font-weight: 900; font-size: 12px; letter-spacing: 1px;
          text-transform: uppercase; opacity: 0.4; transition: all 0.3s;
        }
        .portal-card:hover .portal-enter { opacity: 1; transform: translateX(4px); }

        .portal-footer {
          margin-top: 60px; text-align: center; color: var(--text-muted); font-size: 11px;
          letter-spacing: 2px; z-index: 10; font-weight: 700; opacity: 0.5;
        }
        .portal-footer b { color: var(--red); }

        @media (max-width: 640px) {
          .portal-grid { grid-template-columns: 1fr; }
          .portal-header h1 { font-size: 36px; }
          .portal-page { padding: 80px 20px 40px; }
        }
      `}</style>

      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute', top: 24, right: 24,
          background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          width: 44, height: 44, borderRadius: 14, zIndex: 100,
          backdropFilter: 'blur(10px)', transition: 'all 0.3s'
        }}
      >
        {mounted ? (theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />) : <Sun size={18} />}
      </button>

      <div className="portal-header">
        <div className="portal-logo-container">
          <div className="logo-ring" />
          <div className="portal-logo">
            <Activity size={28} style={{ color: 'var(--red)' }} />
          </div>
        </div>
        <h1>Emergency Response</h1>
        <p>Command & Dispatch</p>
      </div>

      <div className="portal-grid">
        {portals.map((p) => (
          <Link key={p.href} href={p.href} className="portal-card" style={{ '--glow-color': p.color }}>
            <div className="card-bg-glow" />
            <div className="portal-card-header">
              <div className="portal-card-icon" style={{ background: `${p.color}15`, border: `1px solid ${p.color}25` }}>
                <p.icon size={20} style={{ color: p.color }} />
              </div>
              <span className="portal-subtitle" style={{ color: p.color }}>{p.subtitle.split(' ')[0]}</span>
            </div>
            
            <div>
              <h2>{p.title}</h2>
              <p className="portal-desc">{p.description}</p>
            </div>

            <div className="portal-features">
              {p.features.map(f => <span key={f} className="portal-feature">{f}</span>)}
            </div>

            <div className="portal-enter" style={{ color: p.color }}>
              Launch <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      <div className="portal-footer">
        DHAKA METRO • SYSTEM <b>V2.0</b> • 2026
      </div>
    </div>
  );
}
  );
}
