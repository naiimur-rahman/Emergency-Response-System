'use client';
import { Siren, Radio, ShieldCheck, Activity, ArrowRight, Navigation } from 'lucide-react';
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
    subtitle: 'System Hub & History',
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
  return (
    <div className="portal-page">
      <style>{`
        .portal-page {
          height: 100vh; overflow: hidden; display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 0 24px;
          background: #050505;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 30px 30px;
          position: relative;
        }
        .portal-page::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(10,132,255,0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .portal-header { text-align: center; margin-bottom: 3vh; z-index: 10; }
        .portal-logo {
          width: 56px; height: 56px; border-radius: 14px; display: flex;
          align-items: center; justify-content: center; margin: 0 auto 16px;
          background: rgba(255,45,85,0.1);
          border: 1px solid rgba(255,45,85,0.2);
          box-shadow: 0 0 30px rgba(255,45,85,0.15);
        }
        .portal-header h1 {
          font-size: 42px; font-weight: 900; color: #fff;
          letter-spacing: -2px; margin-bottom: 4px;
          background: linear-gradient(to right, #fff, rgba(255,255,255,0.7));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .portal-header p { color: #888; font-size: 15px; font-weight: 500; }

        .portal-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 20px; width: 100%; max-width: 900px; z-index: 10;
        }
        .portal-card {
          background: rgba(20,20,20,0.4); 
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px; padding: 24px; cursor: pointer;
          text-decoration: none; color: inherit;
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; gap: 16px;
        }
        .portal-card:hover {
          background: rgba(30,30,30,0.6);
          transform: translateY(-5px);
          border-color: rgba(255,255,255,0.15);
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .portal-card-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.3s;
        }
        .portal-card:hover .portal-card-icon { transform: scale(1.1) rotate(-5deg); }
        
        .portal-card h2 { font-size: 20px; font-weight: 700; color: #fff; margin: 0; }
        .portal-card .portal-subtitle { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
        .portal-card .portal-desc { font-size: 13px; color: #999; line-height: 1.5; }

        .portal-features { display: flex; flex-wrap: wrap; gap: 6px; }
        .portal-feature {
          padding: 3px 10px; border-radius: 6px; font-size: 10px; font-weight: 700;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
          color: #777;
        }

        .portal-enter {
          display: flex; align-items: center; gap: 6px; margin-top: auto;
          font-weight: 800; font-size: 13px; letter-spacing: 0.5px;
          opacity: 0.8; transition: all 0.2s;
        }
        .portal-card:hover .portal-enter { opacity: 1; gap: 10px; }

        .portal-footer {
          margin-top: 4vh; text-align: center; color: #444; font-size: 12px;
          letter-spacing: 1px; z-index: 10; font-weight: 600;
        }
        .portal-footer span { color: var(--red); opacity: 0.8; }

        @media (max-height: 700px) {
          .portal-header h1 { font-size: 32px; }
          .portal-card { padding: 16px; gap: 12px; }
          .portal-desc { display: none; }
        }
      `}</style>

      <div className="portal-header">
        <div className="portal-logo">
          <Activity size={24} style={{ color: 'var(--red)' }} />
        </div>
        <h1>Emergency Response System</h1>
        <p>Advanced Emergency Dispatch System</p>
      </div>

      <div className="portal-grid">
        {portals.map((p) => (
          <Link key={p.href} href={p.href} className="portal-card">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: p.gradient, opacity: 0.5 }} />
            <div className="portal-card-icon" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
              <p.icon size={24} style={{ color: p.color }} />
            </div>
            <div>
              <span className="portal-subtitle" style={{ color: p.color }}>{p.subtitle}</span>
              <h2>{p.title}</h2>
            </div>
            <p className="portal-desc">{p.description}</p>
            <div className="portal-features">
              {p.features.map(f => <span key={f} className="portal-feature">{f}</span>)}
            </div>
            <div className="portal-enter" style={{ color: p.color }}>
              Enter Portal <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      <div className="portal-footer">
        EMERGENCY <span>V2.0</span> — DHAKA METRO
      </div>
    </div>
  );
}
