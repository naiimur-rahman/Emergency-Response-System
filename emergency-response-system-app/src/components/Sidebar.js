'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, AlertTriangle, Truck, Building2, ClipboardList, Activity, Clock, Siren } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requests', label: 'Emergencies', icon: AlertTriangle },
  { href: '/fleet', label: 'Fleet', icon: Truck },
  { href: '/hospitals', label: 'Hospitals', icon: Building2 },
  { href: '/analytics', label: 'Analytics', icon: Activity },
  { href: '/billing', label: 'Billing', icon: ClipboardList },
  { href: '/trips', label: 'Trip Logs', icon: Clock },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Activity size={20} />
          </div>
          <div className="sidebar-brand">
            <h1>Emergency Response System</h1>
            <span>Dispatch Control</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <Link href="/sos" className={`nav-link sos-link ${pathname === '/sos' ? 'active' : ''}`}
            style={{ background: 'rgba(255,45,85,0.12)', borderLeft: '3px solid var(--red)', color: 'var(--red)', fontWeight: 700, marginBottom: 8 }}>
            <Siren size={20} />
            <span className="nav-label">🚨 SOS</span>
          </Link>
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}>
              <Icon size={20} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p className="sidebar-footer-text">Emergency Response System v1.0 — Dhaka</p>
        </div>
      </aside>

      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`mobile-nav-link ${pathname === href ? 'active' : ''}`}>
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
