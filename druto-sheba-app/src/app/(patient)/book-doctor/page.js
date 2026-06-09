'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, MapPin, User, Activity } from 'lucide-react';

export default function BookDoctorPage() {
  const [hospitals, setHospitals] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [doctors, setDoctors] = useState([]);
  
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!supabase) {
         setHospitals([{ hospital_id: 1, name: 'Central Hospital' }, { hospital_id: 2, name: 'City Clinic' }]);
         setSpecs([{ spec_id: 1, spec_name: 'Cardiology' }, { spec_id: 2, spec_name: 'Neurology' }]);
         setLoading(false);
         return;
      }
      const [hRes, sRes] = await Promise.all([
        supabase.from('hospitals').select('*'),
        supabase.from('specializations').select('*')
      ]);
      setHospitals(hRes.data || []);
      setSpecs(sRes.data || []);
      setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadDoctors() {
      if (!selectedHospital || !selectedSpec) return;
      if (!supabase) {
        const names = ['Rahim Ahmed', 'Farhana Khan', 'Tarek Rahman', 'Salma Begum', 'Shahin Islam', 'Nusrat Jahan', 'Karim Hossain', 'Riyad Ahmed', 'Ayesha Siddiqua', 'Kamrul Hasan', 'Sadia Afrin', 'Mehedi Hasan'];
        
        const mockDocs = [];
        for (let i = 1; i <= 5; i++) {
          const id = parseInt(selectedHospital) * 100 + parseInt(selectedSpec) * 10 + i;
          const name = 'Dr. ' + names[id % names.length];
          mockDocs.push({
            doctor_id: id,
            name: name,
            phone: '01711' + id.toString().padStart(6, '0'),
            is_available: Math.random() > 0.2, // 80% available
            doctor_schedules: [
              { day_of_week: 'Monday', start_time: '09:00:00', end_time: '14:00:00' },
              { day_of_week: 'Thursday', start_time: '15:00:00', end_time: '20:00:00' }
            ]
          });
        }
        setDoctors(mockDocs.filter(d => d.is_available));
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('doctors')
        .select(`*, doctor_schedules ( day_of_week, start_time, end_time )`)
        .eq('hospital_id', selectedHospital)
        .eq('spec_id', selectedSpec)
        .eq('is_available', true);
      setDoctors(data || []);
      setLoading(false);
    }
    loadDoctors();
  }, [selectedHospital, selectedSpec]);

  const handleBook = async (doctorId) => {
    if (!supabase) return alert('Demo mode: Booking successful');
    setBookingLoading(true);
    
    const patientId = 1; 
    const date = new Date();
    date.setDate(date.getDate() + 3);
    const dateString = date.toISOString().split('T')[0];

    const { error } = await supabase.from('doctor_assignments').insert({
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: dateString,
      appointment_time: '10:00:00',
      status: 'Pending'
    });

    setBookingLoading(false);
    if (error) alert('Error booking appointment: ' + error.message);
    else alert('Appointment request sent successfully!');
  };

  return (
    <div className="page-container dot-pattern" style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div>
          <h2>Book a Doctor</h2>
          <p className="page-header-sub">Find a specialist and request an appointment.</p>
        </div>
      </div>

      <div className="glass" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Find a Specialist</h3>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Hospital</label>
            <select 
              className="form-select"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
            >
              <option value="">-- Choose Hospital --</option>
              {hospitals.map(h => (
                <option key={h.hospital_id} value={h.hospital_id}>{h.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Specialization</label>
            <select 
              className="form-select"
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
              disabled={!selectedHospital}
            >
              <option value="">-- Choose Specialization --</option>
              {specs.map(s => (
                <option key={s.spec_id} value={s.spec_id}>{s.spec_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-container"><div className="spinner" /></div>}

      {selectedHospital && selectedSpec && !loading && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Available Doctors</h3>
          {doctors.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
              No available doctors found for this specialization at the selected hospital.
            </div>
          ) : (
            <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {doctors.map(doc => (
                <div key={doc.doctor_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'var(--blue-dim)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={24} />
                    </div>
                    <div>
                      <div className="card-title">{doc.name}</div>
                      <div className="card-row-label">{doc.phone}</div>
                    </div>
                  </div>
                  
                  {doc.doctor_schedules && doc.doctor_schedules.length > 0 && (
                    <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        <Clock size={14} /> Schedule
                      </div>
                      {doc.doctor_schedules.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{s.day_of_week}</span>
                          <span style={{ fontWeight: '500' }}>{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                    onClick={() => handleBook(doc.doctor_id)}
                    disabled={bookingLoading}
                  >
                    Request Appointment
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
