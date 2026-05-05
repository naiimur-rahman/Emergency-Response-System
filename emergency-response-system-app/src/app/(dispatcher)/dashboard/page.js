'use client';
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Truck, BedDouble, Users, Zap, RefreshCw, Clock, MessageCircle, Send, X } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/Badges';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(null);
  const [activeChatTrip, setActiveChatTrip] = useState(null);
  const [chatMessage, setChatMessage] = useState('');

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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: activeChatTrip.trip_id, text: chatMessage, sender: 'Dispatcher' })
      });
      setChatMessage('');
      fetchData();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
    const interval = setInterval(fetchData, 3000);
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
          <h3><span className="pulse-dot"></span> Live Emergency Feed</h3>
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
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
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
                      {!row.primary_specialization && row.suggested_spec && (
                        <span className="badge" style={{ fontSize: 9, background: 'rgba(10,132,255,0.1)', color: 'var(--blue)', cursor: 'help' }} title="AI Suggestion based on patient profile">
                          💡 Suggest: {row.suggested_spec}
                        </span>
                      )}
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
                      {row.trip_id && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setActiveChatTrip(row)}>
                          <MessageCircle size={14} />
                        </button>
                      )}
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

      {activeChatTrip && (
        <div className="modal-overlay" onClick={() => setActiveChatTrip(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Chat with Driver (Trip #{activeChatTrip.trip_id})</h3>
              <button className="btn-ghost" onClick={() => setActiveChatTrip(null)}><X size={18}/></button>
            </div>
            <div style={{ height: 300, overflowY: 'auto', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data.chatMessages || []).filter(m => m.trip_id === activeChatTrip.trip_id).map((m, i) => (
                <div key={i} style={{ alignSelf: m.sender === 'Dispatcher' ? 'flex-end' : 'flex-start', background: m.sender === 'Dispatcher' ? 'var(--blue)' : 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 12, maxWidth: '80%' }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>{m.sender}</div>
                  <div style={{ fontSize: 13 }}>{m.message_text}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Type a message..." 
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
              />
              <button type="submit" className="btn btn-primary"><Send size={18}/></button>
            </form>
          </div>
        </div>
      )}

      {data?.recentTrips?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div className="table-wrapper">
            <div className="table-header">
              <h3><Clock size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Recent Dispatches</h3>
            </div>
            <table>
              <thead>
                <tr><th>Trip</th><th>Patient</th><th>Ambulance</th><th>Hospital</th><th>Time</th></tr>
              </thead>
              <tbody>
                {data.recentTrips.map((t) => (
                  <tr key={t.trip_id}>
                    <td style={{ fontWeight: 600 }}>#{t.trip_id}</td>
                    <td>{t.patient_name}</td>
                    <td>{t.license_plate}</td>
                    <td>{t.hospital_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.time_dispatched).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-wrapper">
            <div className="table-header">
              <h3><Zap size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Fleet Insights</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Response Time (Avg)</label>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>8.4 min</div>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 8 }}>
                   <div style={{ width: '84%', height: '100%', background: 'var(--green)', borderRadius: 2 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fleet Utilization</label>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)' }}>{Math.round((s.dispatchedAmbulances / (s.availableAmbulances + s.dispatchedAmbulances)) * 100) || 0}%</div>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 8 }}>
                   <div style={{ width: `${(s.dispatchedAmbulances / (s.availableAmbulances + s.dispatchedAmbulances)) * 100 || 0}%`, height: '100%', background: 'var(--blue)', borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ marginTop: 20, padding: 12, background: 'rgba(255,159,10,0.05)', borderRadius: 8, border: '1px dashed rgba(255,159,10,0.3)' }}>
                 <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--yellow)' }}>🔥 Area Hotspot</div>
                 <div style={{ fontSize: 14, marginTop: 4 }}>Dhanmondi / Panthapath</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
