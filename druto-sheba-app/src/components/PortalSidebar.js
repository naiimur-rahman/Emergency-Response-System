'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, User, ArrowLeftRight, ChevronUp, UserPlus, Check, Truck, Droplet, LogOut } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import CreateUserModal from './CreateUserModal';

export default function PortalSidebar({ portalName, portalColor, portalIcon: PortalIcon, navItems }) {
  const pathname = usePathname();
  const { activeDriver, setDriver, availableDrivers, activePatient, setPatient, availablePatients, refreshUserContext } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      console.error(err);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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

  const handleSelectUser = (id, type) => {
    if (type === 'patient') setPatient(id);
    else setDriver(id);
    setMenuOpen(false);
  };

  const handleUserCreated = async () => {
    await refreshUserContext();
  };

  const isPatientPortal = portalName === 'Patient Portal';
  const isDriverPortal = portalName === 'Driver Portal';
  const hasMenu = (isPatientPortal && availablePatients.length > 0) || (isDriverPortal && availableDrivers.length > 0);
  const users = isPatientPortal ? availablePatients : isDriverPortal ? availableDrivers : [];
  const activeUser = isPatientPortal ? activePatient : isDriverPortal ? activeDriver : null;
  const userType = isPatientPortal ? 'patient' : 'driver';

  return (
    <>
      <style>{`
        .user-menu-panel {
          position: absolute; bottom: 100%; left: 0; right: 0;
          background: rgba(18, 18, 24, 0.98);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; margin-bottom: 8px;
          box-shadow: 0 -12px 40px rgba(0,0,0,0.5);
          backdrop-filter: blur(20px);
          max-height: 340px; overflow-y: auto;
          opacity: 0; transform: translateY(8px);
          transition: opacity 0.2s ease, transform 0.2s ease;
          pointer-events: none; z-index: 100;
          scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .user-menu-panel.open {
          opacity: 1; transform: translateY(0);
          pointer-events: all;
        }
        .user-menu-header {
          padding: 14px 16px 10px; font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 1.5px;
          color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.05);
          position: sticky; top: 0; background: rgba(18,18,24,0.98);
          backdrop-filter: blur(20px); z-index: 1;
        }
        .user-menu-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 16px; cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .user-menu-item:hover { background: rgba(255,255,255,0.05); }
        .user-menu-item.active { background: rgba(255,255,255,0.04); }
        .user-menu-avatar {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; flex-shrink: 0;
        }
        .user-menu-info { flex: 1; overflow: hidden; }
        .user-menu-name {
          font-size: 13px; font-weight: 700;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .user-menu-meta {
          font-size: 10px; color: var(--text-muted); margin-top: 1px;
        }
        .user-menu-check {
          width: 20px; height: 20px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .user-menu-register {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 16px; cursor: pointer;
          font-size: 13px; font-weight: 700;
          transition: background 0.15s;
          position: sticky; bottom: 0;
          background: rgba(18,18,24,0.98);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .user-menu-register:hover { background: rgba(255,255,255,0.05); }

        .user-card-trigger {
          display: flex; align-items: center; gap: 12px;
          cursor: pointer; padding: 8px 10px; border-radius: 12px;
          transition: background 0.15s; width: 100%;
        }
        .user-card-trigger:hover { background: rgba(255,255,255,0.04); }
      `}</style>

      <aside className="sidebar">
        <div className="sidebar-header" style={{ position: 'relative' }}>
          <div className="sidebar-logo" style={{ background: `${portalColor}22` }}>
            <PortalIcon size={20} style={{ color: portalColor }} />
          </div>
          <div className="sidebar-brand">
            <h1>Druto Sheba</h1>
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
        <div className="sidebar-footer" style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }} ref={menuRef}>

          {/* Slide-up user menu */}
          {hasMenu && (
            <div className={`user-menu-panel ${menuOpen ? 'open' : ''}`}>
              <div className="user-menu-header">
                {isPatientPortal ? `${users.length} Registered Patients` : `${users.length} Registered Drivers`}
              </div>
              {users.map((u) => {
                const isActive = String(activeUser?.id) === String(u.id);
                const initials = u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
                return (
                  <div
                    key={u.id}
                    className={`user-menu-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectUser(u.id, userType)}
                  >
                    <div className="user-menu-avatar" style={{
                      background: isActive ? `${portalColor}22` : 'rgba(255,255,255,0.05)',
                      color: isActive ? portalColor : 'var(--text-muted)',
                      border: isActive ? `1.5px solid ${portalColor}44` : '1.5px solid transparent',
                    }}>
                      {initials}
                    </div>
                    <div className="user-menu-info">
                      <div className="user-menu-name" style={{ color: isActive ? '#fff' : 'var(--text-secondary)' }}>
                        {u.name}
                      </div>
                      <div className="user-menu-meta">
                        {isPatientPortal && u.blood_type
                          ? <><Droplet size={8} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />{u.blood_type}</>
                          : isDriverPortal && u.status
                            ? <><Truck size={8} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />{u.status === 'On_Duty' ? 'On Duty' : 'Off Duty'}</>
                            : `ID: ${u.id}`
                        }
                      </div>
                    </div>
                    <div className="user-menu-check" style={{
                      background: isActive ? `${portalColor}22` : 'transparent',
                    }}>
                      {isActive && <Check size={14} style={{ color: portalColor }} />}
                    </div>
                  </div>
                );
              })}
              <div
                className="user-menu-register"
                style={{ color: portalColor }}
                onClick={() => { setCreateType(userType); setShowCreateModal(true); setMenuOpen(false); }}
              >
                <UserPlus size={16} />
                {isPatientPortal ? 'Register New Patient' : 'Register New Driver'}
              </div>
            </div>
          )}

          {/* User card trigger */}
          {hasMenu ? (
            <div
              className="user-card-trigger"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${portalColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: portalColor }} />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getDisplayName()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {getDisplayRole()}
                </div>
              </div>
              <ChevronUp size={14} style={{
                color: 'var(--text-muted)', flexShrink: 0,
                transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }} />
            </div>
          ) : (isPatientPortal && availablePatients.length === 0) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${portalColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: portalColor }} />
              </div>
              <button
                onClick={() => { setCreateType('patient'); setShowCreateModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: portalColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <UserPlus size={14} /> Register as Patient
              </button>
            </div>
          ) : (isDriverPortal && availableDrivers.length === 0) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${portalColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: portalColor }} />
              </div>
              <button
                onClick={() => { setCreateType('driver'); setShowCreateModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: portalColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <UserPlus size={14} /> Register as Driver
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${portalColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} style={{ color: portalColor }} />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {getDisplayName()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {getDisplayRole()}
                </div>
              </div>
            </div>
          )}

          <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <ArrowLeftRight size={14} /> Switch Portal
          </Link>
          { (portalName === 'Admin Portal' || portalName === 'Dispatcher Portal') && (
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 'auto' }}>
              <LogOut size={14} /> Logout
            </button>
          )}
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

      {showCreateModal && (
        <CreateUserModal
          type={createType}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleUserCreated}
        />
      )}
    </>
  );
}
