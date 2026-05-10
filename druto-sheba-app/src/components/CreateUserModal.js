'use client';
import { useState } from 'react';
import { UserPlus, X, Droplet, Phone, CreditCard } from 'lucide-react';
import { useToast } from './Toast';

export default function CreateUserModal({ type, onClose, onCreated }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Patient form
  const [patientForm, setPatientForm] = useState({
    name: '',
    phone: '',
    blood_type: 'O+',
  });

  // Driver form
  const [driverForm, setDriverForm] = useState({
    name: '',
    license_no: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (type === 'patient') {
        if (!patientForm.name.trim() || !patientForm.phone.trim()) {
          toast('Please fill in all required fields.', 'error');
          setSubmitting(false);
          return;
        }

        const res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patientForm),
        });

        if (!res.ok) throw new Error('Failed to create patient');
        const data = await res.json();
        toast(`Patient "${patientForm.name}" created successfully!`, 'success', { title: 'New Patient Added' });
        onCreated?.(data);
      } else {
        if (!driverForm.name.trim() || !driverForm.license_no.trim()) {
          toast('Please fill in all required fields.', 'error');
          setSubmitting(false);
          return;
        }

        const res = await fetch('/api/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(driverForm),
        });

        if (!res.ok) throw new Error('Failed to create driver');
        const data = await res.json();
        toast(`Driver "${driverForm.name}" created successfully!`, 'success', { title: 'New Driver Added' });
        onCreated?.(data);
      }

      onClose();
    } catch (err) {
      toast('Failed to create user: ' + err.message, 'error', { title: 'Error' });
    } finally {
      setSubmitting(false);
    }
  };

  const isPatient = type === 'patient';
  const accentColor = isPatient ? '#ff2d55' : '#ff9f0a';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${accentColor}18`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <UserPlus size={18} style={{ color: accentColor }} />
            </div>
            <h3 style={{ margin: 0 }}>
              {isPatient ? 'Register New Patient' : 'Add New Driver'}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input"
                placeholder={isPatient ? 'e.g. Abdur Rahman' : 'e.g. Karim Mia'}
                value={isPatient ? patientForm.name : driverForm.name}
                onChange={(e) =>
                  isPatient
                    ? setPatientForm({ ...patientForm, name: e.target.value })
                    : setDriverForm({ ...driverForm, name: e.target.value })
                }
                autoFocus
              />
            </div>

            {isPatient ? (
              <>
                <div className="form-group">
                  <label className="form-label">
                    <Phone size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -1 }} />
                    Phone Number *
                  </label>
                  <input
                    className="form-input"
                    placeholder="e.g. 01711000000"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <Droplet size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -1 }} />
                    Blood Type *
                  </label>
                  <select
                    className="form-input form-select"
                    value={patientForm.blood_type}
                    onChange={(e) => setPatientForm({ ...patientForm, blood_type: e.target.value })}
                  >
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">
                  <CreditCard size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -1 }} />
                  License Number *
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. BD-DL-12345"
                  value={driverForm.license_no}
                  onChange={(e) => setDriverForm({ ...driverForm, license_no: e.target.value })}
                />
              </div>
            )}

            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: `${accentColor}08`, border: `1px dashed ${accentColor}30`,
              fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>
              {isPatient
                ? '💡 After registration, the patient can update their medical profile, add pre-existing conditions, and use the SOS system.'
                : '💡 After adding, the driver will appear in the fleet roster. Set their shift status to "On Duty" to make them available for dispatch.'
              }
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ background: accentColor, borderColor: accentColor }}
            >
              {submitting ? 'Creating...' : (isPatient ? 'Register Patient' : 'Add Driver')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
