'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, ArrowLeftRight, ChevronDown } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function PortalSidebar({ portalName, portalColor, portalIcon: PortalIcon, navItems }) {
  const pathname = usePathname();
    const { activeDriver, setDriver, availableDrivers, activePatient, setPatient, availablePatients } = useUser();
  
    const getDisplayName = () => {
      if (portalName === 'Driver Portal') return activeDriver?.name || 'Loading...';
      if (portalName === 'Patient Portal') return activePatient?.name || 'Guest Patient';
      if (portalName === 'Dispatcher Portal') return 'Lead Dispatcher';
      if (portalName === 'Admin Portal') return 'Chief Administrator';
      return 'User';
    };
  
    const getDisplayRole = () => {
      if (portalName === 'Driver Portal') return activeDriver?.role || 'Paramedic';
      if (portalName === 'Patient Portal') return `Blood Group: ${activePatient?.blood_type || 'N/A'}`;
      if (portalName === 'Dispatcher Portal') return 'Emergency Command';
      if (portalName === 'Admin Portal') return 'System Control';
      return 'Portal Access';
    };
  
    return (
      <>
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo" style={{ background: `${portalColor}22` }}>
              <PortalIcon size={20} style={{ color: portalColor }} />
            </div>
            <div className="sidebar-brand">
              <h1>Emergency Response System</h1>
              <span style={{ color: portalColor }}>{portalName}</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            <Link href="/" className="nav-link" style={{ opacity: 0.6, fontSize: 13, marginBottom: 8 }}>
              <Home size={16} />
              <span className="nav-label">← All Portals</span>
            </Link>
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}>
                <Icon size={20} />
                <span className="nav-label">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-footer" style={{ padding: '20px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: `${portalColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: portalColor }} />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                {portalName === 'Driver Portal' && availableDrivers.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={activeDriver?.id} 
                      onChange={(e) => setDriver(e.target.value)}
                      style={{ width: '100%', appearance: 'none', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, padding: 0, margin: 0, outline: 'none', cursor: 'pointer' }}
                    >
                      {availableDrivers.map(d => <option key={d.id} value={d.id} style={{ color: 'black' }}>{d.name}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 0, top: 2, pointerEvents: 'none', color: 'var(--text-muted)' }} />
                  </div>
                ) : portalName === 'Patient Portal' && availablePatients.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={activePatient?.id} 
                      onChange={(e) => setPatient(e.target.value)}
                      style={{ width: '100%', appearance: 'none', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, padding: 0, margin: 0, outline: 'none', cursor: 'pointer' }}
                    >
                      {availablePatients.map(p => <option key={p.id} value={p.id} style={{ color: 'black' }}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 0, top: 2, pointerEvents: 'none', color: 'var(--text-muted)' }} />
                  </div>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {getDisplayName()}
                  </div>
                )}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {getDisplayRole()}
              </div>
            </div>
          </div>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
             <ArrowLeftRight size={14} /> Switch Portal
          </Link>
        </div>
      </aside>

      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => (
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
