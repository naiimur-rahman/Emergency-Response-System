'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, User, XCircle, CheckCircle } from 'lucide-react';

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAppointments = async () => {
    if (!supabase) return setLoading(false);
    
    // Patient ID is hardcoded to 1 for demo purposes
    const patientId = 1; 
    
    const { data } = await supabase
      .from('doctor_assignments')
      .select(`
        assignment_id,
        appointment_date,
        appointment_time,
        status,
        doctors (
          name,
          phone,
          hospitals (name),
          specializations (spec_name)
        )
      `)
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false });
      
    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleCancel = async (assignmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    
    const { error } = await supabase
      .from('doctor_assignments')
      .update({ status: 'Cancelled' })
      .eq('assignment_id', assignmentId);
      
    if (error) {
      alert('Failed to cancel appointment: ' + error.message);
    } else {
      loadAppointments();
    }
  };

  return (
    <div className="page-container dot-pattern" style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div>
          <h2>My Appointments</h2>
          <p className="page-header-sub">View and manage your doctor appointments.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /></div>
      ) : appointments.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
          <Calendar size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3>No Appointments Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>You haven't booked any doctor appointments yet.</p>
        </div>
      ) : (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {appointments.map(app => (
            <div key={app.assignment_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'var(--blue-dim)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <div className="card-title" style={{ fontSize: '15px' }}>{app.doctors?.name}</div>
                    <div className="card-row-label">{app.doctors?.specializations?.spec_name}</div>
                  </div>
                </div>
                <div className={`badge ${app.status === 'Pending' ? 'badge-low' : app.status === 'Confirmed' ? 'badge-ok' : 'badge-critical'}`}>
                  {app.status}
                </div>
              </div>
              
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-sm)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Calendar size={16} color="var(--blue)" />
                  <span style={{ fontWeight: '600' }}>Date:</span> {new Date(app.appointment_date).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Clock size={16} color="var(--orange)" />
                  <span style={{ fontWeight: '600' }}>Time:</span> {app.appointment_time?.slice(0, 5) || 'TBD'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <User size={16} color="var(--green)" />
                  <span style={{ fontWeight: '600' }}>Hospital:</span> {app.doctors?.hospitals?.name}
                </div>
              </div>
              
              {(app.status === 'Pending' || app.status === 'Confirmed') && (
                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', borderColor: 'var(--red)', color: 'var(--red)' }}
                  onClick={() => handleCancel(app.assignment_id)}
                >
                  Cancel Appointment
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
