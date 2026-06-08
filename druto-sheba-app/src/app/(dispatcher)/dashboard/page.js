'use client';
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Truck, BedDouble, Users, Zap, RefreshCw, Clock, MessageCircle, Send, X, CloudLightning, Navigation, Map as MapIcon } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/Badges';
import { useToast } from '@/components/Toast';
import dynamic from 'next/dynamic';
import mqttService from '@/lib/mqttService';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const TrendGraph = ({ trend }) => {
  if (!trend || trend.length === 0) return null;
  const maxVal = Math.max(...trend.map(t => parseInt(t.count)), 5);
  const width = 300;
  const height = 140;
  const padding = 20;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  const points = trend.map((t, i) => {
    const count = parseInt(t.count) || 0;
    return {
      x: padding + (i * (chartWidth / (trend.length - 1 || 1))),
      y: height - padding - (maxVal > 0 ? (count / maxVal) * chartHeight : 0)
    };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaData = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div style={{ position: 'relative', width: '100%', height: height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaData} fill="url(#trendGradient)" />
        <path d={pathData} fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--bg-primary)" stroke="var(--blue)" strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 4px' }}>
        {trend.map((t, i) => (
          <span key={i} style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>{t.day}</span>
        ))}
      </div>
    </div>
  );
};

const SpecializationDistribution = ({ stats }) => {
  if (!stats || stats.length === 0) return null;
  const maxVal = Math.max(...stats.map(s => parseInt(s.count)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '15px 0' }}>
      {stats.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 100, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.spec}</div>
          <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(parseInt(s.count) / maxVal) * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, width: 20 }}>{s.count}</div>
        </div>
      ))}
    </div>
  );
};

export default function DispatcherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(null);
  const [activeChatTrip, setActiveChatTrip] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [mapModal, setMapModal] = useState({ open: false, title: '', pickupCoords: null, realtimeMarker: null, driver_id: null });
  const toast = useToast();

  // MQTT Connection for real-time tracking in the Map Modal
  useEffect(() => {
    if (!mapModal.open || !mapModal.driver_id) return;

    mqttService.connect(`dispatcher-${Math.random().toString(16).substr(2, 6)}`);
    
    const unsubscribe = mqttService.subscribe((data) => {
      if (data.id === `ambulance-${mapModal.driver_id}`) {
        if (data.status === 'offline') {
          setMapModal(prev => ({ ...prev, realtimeMarker: null }));
        } else {
          setMapModal(prev => ({
            ...prev,
            realtimeMarker: {
              ...prev.realtimeMarker,
              lat: data.lat,
              lng: data.lng,
              speed: data.speed,
              acc: data.acc
            }
          }));
        }
      }
    });

    return () => {
      unsubscribe();
      mqttService.disconnect();
    };
  }, [mapModal.open, mapModal.driver_id]);

  const [advisoryActive, setAdvisoryActive] = useState(false);

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
    const interval = setInterval(fetchData, 15000); // Poll every 15 seconds instead of 3
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
        toast(result.message, 'success', { title: 'Dispatch Success' });
      } else {
        toast(result.message + ' — Ensure at least one driver is "On_Duty".', 'error', { title: 'Dispatch Failed' });
      }
      fetchData();
    } catch (err) {
      toast('Network error during dispatch.', 'error');
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
        <div style={{ display: 'flex', gap: 12 }}>
          <button className={`btn btn-sm ${advisoryActive ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAdvisoryActive(!advisoryActive)} style={{ background: advisoryActive ? 'var(--orange)' : 'transparent', color: advisoryActive ? '#fff' : 'var(--orange)', borderColor: 'var(--orange)' }}>
            <CloudLightning size={14} /> Simulate Advisory
          </button>
          <button className="btn btn-secondary" onClick={() => { setLoading(true); fetchData(); }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {advisoryActive && (
        <div className="glass" style={{ padding: '16px 24px', marginBottom: 24, borderLeft: '4px solid var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slideIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <AlertTriangle size={20} color="var(--orange)" />
             </div>
             <div>
               <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>ACTIVE SYSTEM ADVISORY: Severe Monsoon Rain</h4>
               <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Expect +15m delays on average dispatch routes. Drivers advised to reduce speeds.</p>
             </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800 }}>ETA IMPACT CALCULATION</div>
             <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>+15% Transit Time</div>
          </div>
        </div>
      )}

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
        <div className="stat-card">
          <div className="stat-card-header">
             <div className="stat-card-icon" style={{ color: 'var(--orange)' }}><Zap size={20} /></div>
             <span className="stat-card-label">Fleet Utilization</span>
          </div>
          <div className="stat-card-value">
            {Math.round((s.dispatchedAmbulances / (s.availableAmbulances + s.dispatchedAmbulances || 1)) * 100)}%
          </div>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ 
              width: `${(s.dispatchedAmbulances / (s.availableAmbulances + s.dispatchedAmbulances || 1)) * 100}%`, 
              height: '100%', 
              background: 'var(--orange)',
              boxShadow: '0 0 10px var(--orange)'
            }} />
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
              {data?.activeView?.map((row) => (
                <tr key={row.request_id || row.id} className={row.severity_level === 'Critical' ? 'row-glow-critical' : row.severity_level === 'High' ? 'row-glow-high' : ''}>
                  <td style={{ fontWeight: 600 }}>#{row.request_id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{row.patient_name}</div>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
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
                      
                      {row.patient_lat && row.patient_lon && (
                        <button 
                          onClick={() => setMapModal({
                            open: true,
                            title: `Location: ${row.patient_name}`,
                            pickupCoords: { lat: row.patient_lat, lon: row.patient_lon },
                            driver_id: row.driver_id,
                            realtimeMarker: row.ambulance_lat && row.ambulance_lon ? {
                              lat: row.ambulance_lat,
                              lng: row.ambulance_lon,
                              id: row.assigned_ambulance,
                              title: `Ambulance ${row.assigned_ambulance}`
                            } : null
                          })}
                          style={{ fontSize: 11, color: 'var(--blue)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 500, background: 'rgba(10,132,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}
                          title="View Live Location"
                        >
                          <Navigation size={12} /> Map
                        </button>
                      )}
                    </div>
                  </td>
                  <td><span className="badge badge-critical" style={{ fontSize: 11 }}>{row.blood_type}</span></td>
                  <td><SeverityBadge level={row.severity_level} /></td>
                  <td><StatusBadge status={row.request_status} /></td>
                  <td>
                    {row.assigned_ambulance ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{row.assigned_ambulance}</span>
                        {row.driver_name && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{row.driver_name}</span>}
                        {row.ambulance_lat && row.ambulance_lon && (
                          <button 
                            onClick={() => setMapModal({
                              open: true,
                              title: `Location: Ambulance ${row.assigned_ambulance}`,
                              pickupCoords: { lat: row.patient_lat, lon: row.patient_lon },
                              driver_id: row.driver_id,
                              realtimeMarker: {
                                lat: row.ambulance_lat,
                                lng: row.ambulance_lon,
                                id: row.assigned_ambulance,
                                title: `Ambulance ${row.assigned_ambulance}`
                              }
                            })}
                            style={{ fontSize: 11, color: 'var(--orange, #f97316)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 500, background: 'rgba(249,115,22,0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}
                            title="View Ambulance Location"
                          >
                            <Navigation size={12} /> Map
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
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
                          {dispatching === row.request_id ? 'Broadcasting...' : 'Dispatch Mission'}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        const contact = row.emergency_contact;
                        alert(`MEDICAL PROFILE: ${row.patient_name}\n\nBlood Type: ${row.blood_type}\nConditions: ${(row.conditions || []).join(', ') || 'None reported'}\n\nSpecial Notes: ${row.special_notes || 'No special requirements'}\n\nEmergency Contact: ${contact?.name || 'Unknown'} (${contact?.relationship || 'N/A'})\nPhone: ${contact?.phone || 'N/A'}`);
                      }}>
                        Profile
                      </button>
                      {row.request_status === 'Admitted' && (
                        <button className="btn btn-sm"
                          style={{ background: 'var(--green-dim)', color: 'var(--green)', borderColor: 'var(--green-glow)' }}
                          onClick={async () => {
                            await fetch('/api/driver/accept', { 
                              method: 'POST', 
                              headers: { 'Content-Type': 'application/json' }, 
                              body: JSON.stringify({ request_id: row.request_id, action: 'Discharge' }) 
                            });
                            fetchData();
                          }}>
                          Discharge
                        </button>
                      )}
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
              {(data?.chatMessages || []).filter(m => m.trip_id === activeChatTrip.trip_id).map((m) => (
                <div key={m.message_id || Math.random()} style={{ alignSelf: m.sender === 'Dispatcher' ? 'flex-end' : 'flex-start', background: m.sender === 'Dispatcher' ? 'var(--blue)' : 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 12, maxWidth: '80%' }}>
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

      {(data?.recentTrips?.length > 0 || data?.trend?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div className="table-wrapper">
            <div className="table-header">
              <h3><Clock size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Recent Dispatches</h3>
            </div>
            {data?.recentTrips?.length > 0 ? (
              <table>
                <thead>
                  <tr><th>Trip</th><th>Patient</th><th>Ambulance</th><th>Hospital</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {data?.recentTrips?.map((t) => (
                    <tr key={t.trip_id || t.id}>
                      <td style={{ fontWeight: 600 }}>#{t.trip_id}</td>
                      <td>{t.patient_name}</td>
                      <td>{t.license_plate}</td>
                      <td>{t.hospital_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.time_dispatched).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}><p>No recent dispatches</p></div>
            )}
          </div>

          <div className="table-wrapper">
            <div className="table-header">
              <h3><Zap size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Weekly Volume Trend</h3>
            </div>
            <div style={{ padding: '24px 16px 16px' }}>
              <TrendGraph trend={data?.trend} />
            </div>
            <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Medical Breakdown</h4>
              <SpecializationDistribution stats={data?.specializationStats} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTop: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Peak Load</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{Math.max(...(data?.trend || []).map(t => parseInt(t.count)), 0)} Calls/Day</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Status</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>OPTIMAL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mapModal.open && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }} onClick={(e) => { if (typeof e.target.className === 'string' && e.target.className.includes('modal-overlay')) setMapModal({ ...mapModal, open: false }) }}>
          <div className="modal-content" style={{ width: '90vw', maxWidth: '1200px', height: '85vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><MapIcon size={20} /> {mapModal.title}</h3>
              <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setMapModal({ ...mapModal, open: false })}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <MapView 
                pickupCoords={mapModal.pickupCoords} 
                realtimeMarker={mapModal.realtimeMarker}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
