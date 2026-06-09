'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, CheckCircle2, XCircle, Calendar, Power } from 'lucide-react';

export default function ManageDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterHospital, setFilterHospital] = useState('');
  const [filterSpec, setFilterSpec] = useState('');

  const loadData = async () => {
    if (!supabase) {
      const generatedDoctors = [];
      const specs = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'];
      const hosps = ['Central Hospital', 'City Clinic'];
      const names = ['Rahim Ahmed', 'Farhana Khan', 'Tarek Rahman', 'Salma Begum', 'Shahin Islam', 'Nusrat Jahan', 'Karim Hossain', 'Riyad Ahmed', 'Ayesha Siddiqua', 'Kamrul Hasan', 'Sadia Afrin', 'Mehedi Hasan', 'Monir Hossain', 'Sharmin Akter', 'Rubel Mia', 'Tania Sultana', 'Zahid Hasan', 'Fatema Zohra', 'Rafiqul Islam', 'Sonia Akter'];
      
      let idCounter = 1;
      for (const h of hosps) {
        for (const s of specs) {
          for (let i = 0; i < 4; i++) {
             generatedDoctors.push({
               doctor_id: idCounter,
               name: 'Dr. ' + names[(idCounter - 1) % names.length],
               is_available: Math.random() > 0.2, // 80% available
               hospitals: { name: h },
               specializations: { spec_name: s }
             });
             idCounter++;
          }
        }
      }
      setDoctors(generatedDoctors);

      setAssignments([
        { assignment_id: 1, patients: { name: 'Afsana' }, doctors: { name: generatedDoctors[0].name }, appointment_date: '2026-06-15', appointment_time: '10:00:00', status: 'Pending' },
        { assignment_id: 2, patients: { name: 'Kamal' }, doctors: { name: generatedDoctors[1].name }, appointment_date: '2026-06-16', appointment_time: '14:30:00', status: 'Confirmed' },
        { assignment_id: 3, patients: { name: 'Jamal' }, doctors: { name: generatedDoctors[5].name }, appointment_date: '2026-06-17', appointment_time: '09:15:00', status: 'Pending' },
        { assignment_id: 4, patients: { name: 'Rina' }, doctors: { name: generatedDoctors[6].name }, appointment_date: '2026-06-18', appointment_time: '11:00:00', status: 'Confirmed' }
      ]);
      setLoading(false);
      return;
    }
    setLoading(true);
    
    const { data: dData } = await supabase
      .from('doctors')
      .select('*, hospitals(name), specializations(spec_name)');
      
    setDoctors(dData || []);

    const { data: aData } = await supabase
      .from('doctor_assignments')
      .select('*, patients(name), doctors(name)')
      .order('appointment_date', { ascending: false });
      
    setAssignments(aData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleAvailability = async (doctorId, currentStatus) => {
    if (!supabase) return alert('Demo mode');
    await supabase.from('doctors').update({ is_available: !currentStatus }).eq('doctor_id', doctorId);
    loadData();
  };

  const updateAssignmentStatus = async (assignmentId, status) => {
    if (!supabase) return alert('Demo mode');
    await supabase.from('doctor_assignments').update({ status }).eq('assignment_id', assignmentId);
    loadData();
  };

  if (loading) {
    return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;
  }

  const uniqueHospitals = Array.from(new Set(doctors.map(d => d.hospitals?.name))).filter(Boolean).sort();
  const uniqueSpecs = Array.from(new Set(doctors.map(d => d.specializations?.spec_name))).filter(Boolean).sort();

  const filteredDoctors = doctors.filter(doc => {
    if (filterHospital && doc.hospitals?.name !== filterHospital) return false;
    if (filterSpec && doc.specializations?.spec_name !== filterSpec) return false;
    return true;
  });

  return (
    <div className="page-container dot-pattern" style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div>
          <h2>Manage Doctors & Appointments</h2>
          <p className="page-header-sub">Update doctor availability and manage patient assignments.</p>
        </div>
      </div>

      <div className="content-grid">
        
        {/* Doctors List */}
        <div className="section-card">
          <div className="section-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} /> Doctors Directory ({filteredDoctors.length})
              </h3>
            </div>
            <div className="form-row">
              <select className="form-select" style={{ padding: '8px 12px', fontSize: '13px' }} value={filterHospital} onChange={e => setFilterHospital(e.target.value)}>
                <option value="">All Hospitals</option>
                {uniqueHospitals.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <select className="form-select" style={{ padding: '8px 12px', fontSize: '13px' }} value={filterSpec} onChange={e => setFilterSpec(e.target.value)}>
                <option value="">All Departments</option>
                {uniqueSpecs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="section-body" style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredDoctors.map(doc => (
              <div key={doc.doctor_id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="card-title" style={{ marginBottom: '4px' }}>{doc.name}</div>
                  <div className="card-row-label" style={{ marginBottom: '12px' }}>{doc.hospitals?.name} • {doc.specializations?.spec_name}</div>
                  
                  <div className={`badge ${doc.is_available ? 'badge-available' : 'badge-maintenance'}`}>
                    <div className="badge-dot"></div>
                    {doc.is_available ? 'Available' : 'Unavailable'}
                  </div>
                </div>
                
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggleAvailability(doc.doctor_id, doc.is_available)}
                >
                  <Power size={14} /> Toggle
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Assignments List */}
        <div className="section-card">
          <div className="section-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> Appointments
            </h3>
          </div>
          <div className="section-body" style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assignments.map(a => (
              <div key={a.assignment_id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="card-title">Patient: {a.patients?.name}</div>
                    <div className="card-row-label" style={{ marginTop: '4px' }}>Doctor: {a.doctors?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      {a.appointment_date} at {a.appointment_time?.slice(0,5)}
                    </div>
                  </div>
                  <div className={`badge ${
                    a.status === 'Confirmed' ? 'badge-available' :
                    a.status === 'Pending' ? 'badge-pending' :
                    a.status === 'Cancelled' ? 'badge-critical' : 'badge-admitted'
                  }`}>
                    <div className="badge-dot"></div>
                    {a.status}
                  </div>
                </div>
                
                {a.status === 'Pending' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => updateAssignmentStatus(a.assignment_id, 'Confirmed')}>
                      Confirm
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => updateAssignmentStatus(a.assignment_id, 'Cancelled')}>
                      Cancel
                    </button>
                  </div>
                )}
                {a.status === 'Confirmed' && (
                  <button className="btn btn-blue btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} onClick={() => updateAssignmentStatus(a.assignment_id, 'Completed')}>
                    Mark Completed
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
