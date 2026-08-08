'use client';
import { useState, useEffect } from 'react';
import { User, Truck, ShieldCheck, MapPin, Settings as SettingsIcon, Award, X } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function DriverSettings() {
  const { activeDriver, refreshUserContext } = useUser();
  const [loading, setLoading] = useState(true);
  const [certifications, setCertifications] = useState([]);
  
  // Stateful Toggles
  const [voiceNav, setVoiceNav] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  // Edit Profile Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLicense, setEditLicense] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences and certifications
  useEffect(() => {
    if (activeDriver?.id) {
      // Preferences from localStorage
      const savedVoice = localStorage.getItem(`voiceNav_${activeDriver.id}`);
      const savedAccept = localStorage.getItem(`autoAccept_${activeDriver.id}`);
      setVoiceNav(savedVoice !== 'false'); // defaults to true
      setAutoAccept(savedAccept === 'true'); // defaults to false

      // Load certifications
      fetch(`/api/driver/certifications?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          setCertifications(Array.isArray(data) ? data : []);
          setLoading(false);
        });

      // Prepare edit values
      setEditName(activeDriver.name || '');
      setEditLicense(activeDriver.license || '');
    }
  }, [activeDriver]);

  // Toggle handlers
  const handleToggleVoice = () => {
    const newVal = !voiceNav;
    setVoiceNav(newVal);
    if (activeDriver?.id) {
      localStorage.setItem(`voiceNav_${activeDriver.id}`, String(newVal));
    }
  };

  const handleToggleAccept = () => {
    const newVal = !autoAccept;
    setAutoAccept(newVal);
    if (activeDriver?.id) {
      localStorage.setItem(`autoAccept_${activeDriver.id}`, String(newVal));
    }
  };

  // Profile Save handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editLicense.trim() || !activeDriver?.id) return;
    setIsSaving(true);

    try {
      const res = await fetch('/api/drivers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: activeDriver.id,
          name: editName,
          license_no: editLicense
        })
      });

      if (res.ok) {
        await refreshUserContext();
        setIsModalOpen(false);
      } else {
        alert('Failed to save profile changes');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeDriver) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Profile & Settings</h2>
          <p className="page-header-sub">Manage your driver account and vehicle preferences</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <SettingsIcon size={16} /> Edit Profile
        </button>
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
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{activeDriver.vehicle || 'Assigned Per Trip'}</div>
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
                <div 
                  onClick={handleToggleVoice}
                  style={{ 
                    width: 44, 
                    height: 24, 
                    background: voiceNav ? 'var(--green)' : 'var(--bg-primary)', 
                    border: voiceNav ? 'none' : '1px solid var(--border-subtle)',
                    borderRadius: 12, 
                    position: 'relative', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ 
                    width: 20, 
                    height: 20, 
                    background: voiceNav ? 'white' : 'var(--text-muted)', 
                    borderRadius: 10, 
                    position: 'absolute', 
                    right: voiceNav ? 2 : 'auto',
                    left: voiceNav ? 'auto' : 2, 
                    top: voiceNav ? 2 : 1,
                    transition: 'all 0.2s ease-in-out'
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Auto-Accept Critical Dispatches</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Automatically accept Level 1 emergencies</div>
                </div>
                <div 
                  onClick={handleToggleAccept}
                  style={{ 
                    width: 44, 
                    height: 24, 
                    background: autoAccept ? 'var(--green)' : 'var(--bg-primary)', 
                    border: autoAccept ? 'none' : '1px solid var(--border-subtle)',
                    borderRadius: 12, 
                    position: 'relative', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <div style={{ 
                    width: 20, 
                    height: 20, 
                    background: autoAccept ? 'white' : 'var(--text-muted)', 
                    borderRadius: 10, 
                    position: 'absolute', 
                    right: autoAccept ? 2 : 'auto',
                    left: autoAccept ? 'auto' : 2, 
                    top: autoAccept ? 2 : 1,
                    transition: 'all 0.2s ease-in-out'
                  }} />
                </div>
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h3><Award size={16} /> Certifications & Licensing</h3>
            </div>
            <div className="section-body">
              {certifications.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {certifications.map(cert => {
                    const isExpiring = cert.expiry_date && new Date(cert.expiry_date) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
                    return (
                      <div key={cert.certification_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {cert.certification_name}
                            {isExpiring && <span className="badge badge-critical" style={{ fontSize: 10 }}>Expiring Soon</span>}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {cert.issuing_authority} • Issued: {cert.date_issued ? new Date(cert.date_issued).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Valid Until</div>
                          <div style={{ fontWeight: 600, color: isExpiring ? 'var(--red)' : 'var(--green)' }}>
                            {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : 'Lifetime'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 20 }}>No certifications found on record.</div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Edit Profile Modal (Glassmorphism Popup) */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1000, padding: 20
        }}>
          <div className="glass" style={{ width: '100%', maxWidth: 460, padding: 32, position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Edit Profile Details</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Update your system identification records.</p>
            
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">License Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editLicense}
                  onChange={(e) => setEditLicense(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ flex: 1, border: '1px solid var(--border-subtle)', background: 'transparent' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
