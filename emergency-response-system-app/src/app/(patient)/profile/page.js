'use client';
import { useState, useEffect } from 'react';
import { User, Phone, Droplet, Activity, Save, Plus, Trash2 } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function PatientProfile() {
  const { activePatient, refreshUserContext } = useUser();
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
        alert('Profile updated successfully!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      alert('Failed to save profile');
    } finally {
      setSaving(false);
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {(profile.conditions || []).map((c, i) => (
                  <span key={i} className="badge badge-critical" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c} <Trash2 size={10} style={{ cursor: 'pointer' }} onClick={() => {
                      const newC = [...profile.conditions];
                      newC.splice(i, 1);
                      setProfile({...profile, conditions: newC});
                    }} />
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="form-input form-select" id="new-condition" defaultValue="">
                  <option value="" disabled>Select a condition...</option>
                  <optgroup label="🔴 CRITICAL (Major)">
                    <option value="Heart Failure">Heart Failure (Major)</option>
                    <option value="Stroke">Stroke (Brain Major)</option>
                    <option value="Severe Trauma">Severe Trauma / Accident</option>
                    <option value="Major Burn">Major Burn (3rd Degree)</option>
                  </optgroup>
                  <optgroup label="🟠 CHRONIC (Continuous)">
                    <option value="Type 2 Diabetes">Type 2 Diabetes</option>
                    <option value="Hypertension">Hypertension (High BP)</option>
                    <option value="Asthma">Chronic Asthma</option>
                    <option value="Kidney Disease">Kidney Disease (Dialysis)</option>
                  </optgroup>
                  <optgroup label="🔵 MINOR (Small)">
                    <option value="Food Allergy">Food Allergy (Minor)</option>
                    <option value="Minor Burn">Minor Burn (1st Degree)</option>
                    <option value="Fever">High Fever</option>
                    <option value="General Pain">General Body Pain</option>
                  </optgroup>
                </select>
                <button className="btn btn-ghost" onClick={() => {
                  const select = document.getElementById('new-condition');
                  const val = select.value;
                  if (val && !(profile.conditions || []).includes(val)) {
                    setProfile({...profile, conditions: [...(profile.conditions || []), val]});
                    select.value = '';
                  }
                }}>Add</button>
              </div>
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
