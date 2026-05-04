'use client';
import { User, Truck, ShieldCheck, MapPin, Settings as SettingsIcon } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function Profile() {
  const { activeDriver } = useUser();
  if (!activeDriver) return null;
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Profile & Settings</h2>
          <p className="page-header-sub">Manage your driver account and vehicle preferences</p>
        </div>
        <button className="btn btn-primary"><SettingsIcon size={16} /> Edit Profile</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        
        {/* Left Col: Driver Card */}
        <div className="section-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: 50, background: 'var(--border-subtle)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <User size={40} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 style={{ fontSize: 22, margin: 0 }}>{activeDriver.name}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>{activeDriver.role}</p>
          
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <span className="badge badge-active">Active</span>
            <span className="badge" style={{ background: 'rgba(255,159,10,0.1)', color: 'var(--yellow)', border: '1px solid var(--yellow)' }}>⭐ 4.8 Rating</span>
          </div>

          <div style={{ width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Employee ID</span>
              <span style={{ fontWeight: 600 }}>NEX-D-100{activeDriver.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>License No.</span>
              <span style={{ fontWeight: 600 }}>{activeDriver.license}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Joined</span>
              <span style={{ fontWeight: 600 }}>March 2024</span>
            </div>
          </div>
        </div>

        {/* Right Col: Settings & Vehicle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="section-card">
            <div className="section-header">
              <h3><Truck size={16} /> Assigned Vehicle Info</h3>
            </div>
            <div className="section-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Current Ambulance</label>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{activeDriver.vehicle}</div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Equipment Level</label>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: 'var(--red)' }}>Advanced Life Support</div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Last Maintenance</label>
                <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>April 15, 2026</div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Status</label>
                <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4, color: 'var(--green)' }}><ShieldCheck size={14} style={{ display: 'inline', marginRight: 4 }} />Cleared for Duty</div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h3><MapPin size={16} /> App Preferences</h3>
            </div>
            <div className="section-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Voice Navigation</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Read out turn-by-turn directions</div>
                </div>
                <div style={{ width: 44, height: 24, background: 'var(--green)', borderRadius: 12, position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: 20, height: 20, background: 'white', borderRadius: 10, position: 'absolute', right: 2, top: 2 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Auto-Accept Critical Dispatches</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Automatically accept Level 1 emergencies</div>
                </div>
                <div style={{ width: 44, height: 24, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 12, position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: 20, height: 20, background: 'var(--text-muted)', borderRadius: 10, position: 'absolute', left: 2, top: 1 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
