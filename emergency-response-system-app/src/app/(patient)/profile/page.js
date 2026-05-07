'use client';
import { useState, useEffect } from 'react';
import { User, Phone, Droplet, Activity, Save, CheckCircle } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { useToast } from '@/components/Toast';

const CONDITION_GROUPS = [
  {
    label: '🔴 CRITICAL (Major)',
    severity: 'critical',
    conditions: ['Heart Failure', 'Stroke', 'Severe Trauma', 'Major Burn'],
  },
  {
    label: '🟠 CHRONIC (Continuous)',
    severity: 'chronic',
    conditions: ['Type 2 Diabetes', 'Hypertension', 'Asthma', 'Kidney Disease', 'Epilepsy'],
  },
  {
    label: '🔵 MINOR (Small)',
    severity: 'minor',
    conditions: ['Food Allergy', 'Minor Burn', 'Fever', 'General Pain', 'Pregnancy'],
  },
];

export default function PatientProfile() {
  const { activePatient, refreshUserContext } = useUser();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activePatient) {
      fetch(`/api/patients?patient_id=${activePatient.id}`)
        .then(res => res.json())
        .then(data => {
           setProfile(Array.isArray(data) ? data[0] : data);
           setLoading(false);
        });
    }
  }, [activePatient]);

  if (!activePatient) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        await refreshUserContext();
        toast('Your medical profile has been saved successfully.', 'success', { title: 'Profile Updated' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      toast('Failed to save profile. Please try again.', 'error', { title: 'Save Error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleCondition = (conditionName) => {
    const current = profile.conditions || [];
    if (current.includes(conditionName)) {
      setProfile({ ...profile, conditions: current.filter(c => c !== conditionName) });
    } else {
      setProfile({ ...profile, conditions: [...current, conditionName] });
    }
  };

  if (loading || !profile) return <div className="page-container"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Medical Profile</h2>
          <p className="page-header-sub">Manage your life-saving information</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="section-card">
          <div className="section-header">
            <h3><User size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Personal Information</h3>
          </div>
          <div style={{ padding: 20 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-input" rows={3} value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <h3><Activity size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Medical Records</h3>
          </div>
          <div style={{ padding: 20 }}>
            <div className="form-group">
              <label className="form-label">Blood Type</label>
              <select className="form-input form-select" value={profile.blood_type || ''} onChange={e => setProfile({...profile, blood_type: e.target.value})}>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Pre-existing Conditions</label>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Click to toggle conditions on/off. Select all that apply.
              </p>
              
              {CONDITION_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="condition-group-label">{group.label}</div>
                  <div className="condition-grid">
                    {group.conditions.map((condition) => {
                      const isSelected = (profile.conditions || []).includes(condition);
                      return (
                        <div
                          key={condition}
                          className={`condition-chip ${isSelected ? `selected ${group.severity}` : ''}`}
                          onClick={() => toggleCondition(condition)}
                        >
                          {isSelected && <CheckCircle size={12} />}
                          {condition}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {(profile.conditions || []).length > 0 && (
                <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.15)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--red)' }}>{(profile.conditions || []).length}</strong> condition{(profile.conditions || []).length > 1 ? 's' : ''} selected: {(profile.conditions || []).join(', ')}
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: 20 }}>
              <label className="form-label">Primary Medical Requirement (For Auto-Dispatch)</label>
              <select 
                className="form-input form-select" 
                value={profile.primary_specialization || ''} 
                onChange={e => setProfile({...profile, primary_specialization: e.target.value})} 
              >
                <option value="">No Special Requirement (General)</option>
                <option value="Cardiology">Cardiology (Heart)</option>
                <option value="Neurology">Neurology (Brain/Stroke)</option>
                <option value="Orthopedics">Orthopedics (Bones)</option>
                <option value="Trauma Surgery">Trauma Surgery</option>
                <option value="Burn Unit">Burn Unit</option>
                <option value="Obstetrics">Obstetrics (Maternity)</option>
                <option value="Pediatrics">Pediatrics (Children)</option>
                <option value="Oncology">Oncology (Cancer)</option>
              </select>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                * Selecting a requirement ensures you are auto-routed to a hospital specializing in this field.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
