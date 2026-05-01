'use client';
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Truck, BedDouble, Users, Zap, RefreshCw, Clock } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/Badges';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDispatch = async (requestId) => {
    setDispatching(requestId);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId }),
      });
      const result = await res.json();
      
      if (result.success) {
        alert('SUCCESS: ' + result.message);
      } else {
        alert('DISPATCH FAILED: ' + result.message + '\n\nTIP: Ensure at least one driver is marked as "On_Duty" in the Driver Portal.');
      }
      fetchData();
    } catch (err) {
      alert('Network error during dispatch.');
    } finally {
      setDispatching(null);
    }
  };

  if (loading && !data) {
    return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;
  }

  const s = data?.stats || {};

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Command Center</h2>
          <p className="page-header-sub">Real-time dispatch overview — Dhaka Metropolitan</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { setLoading(true); fetchData(); }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card red">
          <div className="stat-card-header">
            <div className="stat-card-icon"><AlertTriangle size={20} /></div>
            <span className="stat-card-label">Active Emergencies</span>
          </div>
          <div className="stat-card-value">{s.activeEmergencies || 0}</div>
          <div className="stat-card-sub">{s.pendingRequests || 0} pending · {s.activeDispatches || 0} dispatched</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-header">
            <div className="stat-card-icon"><Truck size={20} /></div>
            <span className="stat-card-label">Available Fleet</span>
          </div>
          <div className="stat-card-value">{s.availableAmbulances || 0}</div>
          <div className="stat-card-sub">{s.dispatchedAmbulances || 0} currently dispatched</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-card-header">
            <div className="stat-card-icon"><BedDouble size={20} /></div>
            <span className="stat-card-label">Hospital Beds</span>
          </div>
          <div className="stat-card-value">{(s.totalGeneralBeds || 0) + (s.totalIcuBeds || 0)}</div>
          <div className="stat-card-sub">{s.totalGeneralBeds || 0} general · {s.totalIcuBeds || 0} ICU</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-card-header">
            <div className="stat-card-icon"><Users size={20} /></div>
            <span className="stat-card-label">On-Duty Drivers</span>
          </div>
          <div className="stat-card-value">{s.onDutyDrivers || 0}</div>
          <div className="stat-card-sub">
            {s.maintenanceAlerts > 0 ? (
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>⚠️ {s.maintenanceAlerts} maintenance alerts</span>
            ) : (
              'Ready for dispatch'
            )}
          </div>
        </div>
      </div>

      <div className="table-wrapper" style={{ marginBottom: 20 }}>
        <div className="table-header">
          <h3>🔴 Live Emergency Feed</h3>
        </div>
        {data?.activeView?.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Patient / Medical</th><th>Blood</th><th>Severity</th>
                <th>Status</th><th>Ambulance</th><th>Hospital</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.activeView.map((row) => (
                <tr key={row.request_id}>
                  <td style={{ fontWeight: 600 }}>#{row.request_id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.patient_name}</div>
                    <div style={{ marginTop: 6 }}>
                      <select 
                        className="form-input btn-sm" 
                        style={{ fontSize: 10, padding: '2px 8px', width: 'auto', background: 'rgba(255,255,255,0.05)' }}
                        value={row.primary_specialization || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await fetch('/api/patients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_id: row.patient_id, primary_specialization: val }) });
                          fetchData();
                        }}
                      >
                        <option value="">General Care</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Trauma Surgery">Trauma</option>
                        <option value="Burn Unit">Burn Unit</option>
                        <option value="Pediatrics">Pediatrics</option>
                      </select>
                    </div>
                  </td>
                  <td><span className="badge badge-critical" style={{ fontSize: 11 }}>{row.blood_type}</span></td>
                  <td><SeverityBadge level={row.severity_level} /></td>
                  <td><StatusBadge status={row.request_status} /></td>
                  <td>{row.assigned_ambulance || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td>
                    {row.destination_hospital || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    {row.hospital_type && (
                      <div style={{ fontSize: 10, color: row.hospital_type === 'Government' ? 'var(--blue)' : 'var(--green)', fontWeight: 600, marginTop: 2 }}>
                        {row.hospital_type}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {row.request_status === 'Pending' && (
                        <button className="btn btn-primary btn-sm"
                          onClick={() => handleDispatch(row.request_id)}
                          disabled={dispatching === row.request_id}>
                          <Zap size={14} />
                          {dispatching === row.request_id ? 'Dispatching...' : 'Dispatch'}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        const contact = row.emergency_contact;
                        alert(`MEDICAL PROFILE: ${row.patient_name}\n\nBlood Type: ${row.blood_type}\nConditions: ${(row.conditions || []).join(', ') || 'None reported'}\n\nSpecial Notes: ${row.special_notes || 'No special requirements'}\n\nEmergency Contact: ${contact?.name || 'Unknown'} (${contact?.relationship || 'N/A'})\nPhone: ${contact?.phone || 'N/A'}`);
                      }}>
                        Profile
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state"><p>No active emergencies</p></div>
        )}
      </div>

      {data?.recentTrips?.length > 0 && (
        <div className="table-wrapper">
          <div className="table-header">
            <h3><Clock size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Recent Dispatches</h3>
          </div>
          <table>
            <thead>
              <tr><th>Trip</th><th>Patient</th><th>Ambulance</th><th>Hospital</th><th>Dispatched At</th></tr>
            </thead>
            <tbody>
              {data.recentTrips.map((t) => (
                <tr key={t.trip_id}>
                  <td style={{ fontWeight: 600 }}>#{t.trip_id}</td>
                  <td>{t.patient_name}</td>
                  <td>{t.license_plate}</td>
                  <td>{t.hospital_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.time_dispatched).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
