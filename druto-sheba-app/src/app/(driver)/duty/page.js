'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Navigation, PhoneCall, Truck, AlertTriangle, Building2, CheckCircle, Clock, MessageCircle, Send, Radio, MapPin, Gauge, PackageCheck, Save } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge } from '@/components/Badges';
import { useUser } from '@/lib/UserContext';
import { useBroadcast } from '@/lib/BroadcastContext';

export default function DriverDutyPage() {
  const { activeDriver } = useUser();
  const { isBroadcasting, speed, accuracy, uptime, realtimeMarker, startBroadcasting, stopBroadcasting } = useBroadcast();
  const [trip, setTrip] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [broadcastRequests, setBroadcastRequests] = useState([]);
  const [shiftSummary, setShiftSummary] = useState(null);
  const [equipmentLog, setEquipmentLog] = useState({ oxygen: 75, defibrillator: 'Ready', supplies: 'Stocked' });
  const [equipmentSaving, setEquipmentSaving] = useState(false);

  const [panicLoading, setPanicLoading] = useState(false);
  const panicTimer = useRef(null);

  const fetchTrip = useCallback(async () => {
    if (!activeDriver?.id) return;
    try {
      const [res, shiftRes] = await Promise.all([
        fetch(`/api/driver/duty?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/driver/shift-log?driver_id=${activeDriver.id}&t=${Date.now()}`, { cache: 'no-store' })
      ]);
      const data = await res.json();
      const shiftData = await shiftRes.json();
      setTrip(data.active_trip);
      setBroadcastRequests(data.broadcast_requests || []);
      setChatMessages(data.chat_messages || []);
      if (!shiftData.error) setShiftSummary(shiftData);
      
      const vehicleId = data.active_trip?.vehicle_id || 1;
      const invRes = await fetch(`/api/ambulances/inventory?vehicle_id=${vehicleId}&t=${Date.now()}`, { cache: 'no-store' });
      if (invRes.ok) {
        const invData = await invRes.json();
        if (invData && invData.length > 0) {
          const oxy = invData.find(i => i.item_name === 'Oxygen Level (%)');
          const defib = invData.find(i => i.item_name === 'Defibrillator');
          const supp = invData.find(i => i.item_name === 'Basic Supplies');
          
          setEquipmentLog(prev => ({
            oxygen: oxy ? oxy.quantity : prev.oxygen,
            defibrillator: defib ? (defib.quantity > 0 ? 'Ready' : 'Needs Service') : prev.defibrillator,
            supplies: supp ? (supp.quantity > 0 ? 'Stocked' : 'Low') : prev.supplies
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeDriver]);

  useAutoRefresh(fetchTrip);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !trip || isSending) return;
    
    setIsSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: trip.trip_id, text: newMessage, sender: `Driver (${activeDriver.name})` })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert('Failed to send message: ' + (errData.error || res.statusText));
      } else {
        setNewMessage('');
        fetchTrip();
      }
    } catch (err) {
      console.error(err);
      alert('Network error while sending message.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!activeDriver?.id) {
        setLoading(false);
        return;
      }
      await fetchTrip();
    };
    init();
  }, [activeDriver, fetchTrip]);

  const handleAction = async (action, reqId = null) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/driver/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          request_id: reqId || trip.request_id, 
          action,
          driver_id: activeDriver.id 
        }),
      });
      const result = await res.json();
      if (result.success) {
        if (action === 'Complete') {
          stopBroadcasting();
          setTrip(null);
        } else {
          fetchTrip();
        }
      } else {
        alert('Action failed: ' + result.error);
      }
    } catch (err) {
      alert('Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  const updateDriverStatus = async (shift_status) => {
    setActionLoading(true);
    try {
      await fetch('/api/drivers', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ driver_id: activeDriver.id, shift_status }) 
      });
      window.location.reload();
    } catch (e) {
      alert('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const saveEquipmentLog = async () => {
    const vehicleId = trip?.vehicle_id || 1;
    setEquipmentSaving(true);
    try {
      const items = [
        { item_name: 'Oxygen Level (%)', quantity: Number(equipmentLog.oxygen) || 0 },
        { item_name: 'Defibrillator', quantity: equipmentLog.defibrillator === 'Ready' ? 1 : 0 },
        { item_name: 'Basic Supplies', quantity: equipmentLog.supplies === 'Stocked' ? 1 : 0 },
      ];
      await Promise.all(items.map((item) => fetch('/api/ambulances/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_id: vehicleId, ...item }),
      })));
      setTimeout(() => alert('Equipment checklist saved.'), 100);
    } catch {
      setTimeout(() => alert('Failed to save equipment checklist.'), 100);
    } finally {
      setEquipmentSaving(false);
    }
  };

  const handlePanicPress = async () => {
    if (activeDriver?.status === 'EMERGENCY_SOS') return;
    
    if (!window.confirm("URGENT: Trigger SOS Emergency Protocol? This will instantly alert all dispatchers.")) {
      return;
    }
    
    setPanicLoading(true);
    try {
      await fetch('/api/driver/panic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: activeDriver.id, location: 'Current GPS Location' })
      });
      window.location.reload();
    } catch (err) {
      alert('Panic signal failed to send.');
    } finally {
      setPanicLoading(false);
    }
  };

  if (!activeDriver) return null;
  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;


  return (
    <div className="page-container dot-pattern" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px', position: 'relative' }}>
      
      {/* Background Blobs */}
      <div className="bg-blob">
        <div className="blob blob-1"></div>
        <div className="blob blob-2" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="page-header" style={{ marginBottom: 16, flexShrink: 0, position: 'relative', zIndex: 10 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 800 }}>
            Active Duty
          </h2>
          <p className="page-header-sub">Emergency Real-Time Dispatch</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="glass" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderColor: isBroadcasting ? 'var(--green)' : 'var(--border-accent)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: isBroadcasting ? 'var(--green)' : 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: isBroadcasting ? 'var(--green)' : 'var(--text-muted)' }}>
              {isBroadcasting ? 'LIVE BROADCASTING' : 'READY'}
            </span>
          </div>
          <select
            className="form-input form-select"
            value={activeDriver?.status || 'Offline'}
            onChange={e => updateDriverStatus(e.target.value)}
            disabled={actionLoading || activeDriver?.status === 'EMERGENCY_SOS'}
            style={{ width: 150, height: 38, borderRadius: 20, fontSize: 12, fontWeight: 800 }}
          >
            <option value="Available">Available</option>
            <option value="Dispatched">Dispatched</option>
            <option value="On_Trip">On-Trip</option>
            <option value="Offline">Offline</option>
            <option value="On_Duty">On Duty</option>
            <option value="Off_Duty">Off Duty</option>
          </select>
          
          <button
            onClick={handlePanicPress}
            disabled={panicLoading}
            style={{
               background: activeDriver?.status === 'EMERGENCY_SOS' ? 'var(--red)' : 'rgba(255,45,85,0.1)',
               border: `1px solid var(--red)`,
               color: activeDriver?.status === 'EMERGENCY_SOS' ? '#fff' : 'var(--red)',
               padding: '8px 16px',
               borderRadius: 20,
               fontSize: 12,
               fontWeight: 800,
               display: 'flex',
               alignItems: 'center',
               gap: 6,
               cursor: 'pointer',
               boxShadow: activeDriver?.status === 'EMERGENCY_SOS' ? '0 0 30px var(--red)' : 'none',
               transition: 'all 0.2s',
               animation: activeDriver?.status === 'EMERGENCY_SOS' ? 'pulse 1s infinite' : 'none'
            }}
            title="Hold for 1.5 seconds to trigger SOS"
          >
             <AlertTriangle size={14} />
             {panicLoading ? '...' : (activeDriver?.status === 'EMERGENCY_SOS' ? 'SOS ACTIVE' : 'SOS PANIC')}
          </button>
        </div>
      </div>

      <div className="track-layout">
        
        {/* Left Panel: Details & Actions */}
        <div className="track-sidebar">
          {!trip ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
              
              {/* Broadcasts Section (MOVED TO TOP) */}
              {broadcastRequests.length > 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--orange)' }}>
                    <div className="live-dot" style={{ background: 'var(--orange)' }} />
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>INCOMING MISSION BROADCASTS ({broadcastRequests.length})</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: '400px', paddingRight: 4 }}>
                    {broadcastRequests.map((req) => (
                      <div key={req.request_id} className="glass" style={{ padding: 16, borderLeft: '4px solid var(--orange)', transition: 'background-color 0.2s', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800 }}>REQUEST ID</div>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>#{req.request_id}</div>
                          </div>
                          <SeverityBadge level={req.severity_level} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <MapPin size={14} style={{ color: 'var(--red)' }} />
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{req.patient_name} • {req.patient_lat.toFixed(4)}, {req.patient_lon.toFixed(4)}</div>
                        </div>
                        <button 
                          onClick={() => handleAction('Accept', req.request_id)}
                          disabled={actionLoading}
                          className="btn btn-primary"
                          style={{ width: '100%', height: 40, borderRadius: 10, fontSize: 13, fontWeight: 800, background: 'var(--orange)', borderColor: 'var(--orange)' }}
                        >
                          {actionLoading ? 'CLAIMING...' : 'CLAIM MISSION'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="glass" style={{ padding: 24, borderLeft: '4px solid var(--blue)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <div className="animate-float">
                  <Radio size={48} style={{ color: 'var(--blue)', marginBottom: 16 }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800 }}>Scanning for Dispatch...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>You are on the standby list. Emergency requests will appear here instantly.</p>
                
                <div style={{ marginTop: 24, width: '100%' }}>
                  <button 
                    onClick={isBroadcasting ? stopBroadcasting : startBroadcasting}
                    className={`btn ${isBroadcasting ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ width: '100%', height: 44, borderRadius: 12, fontSize: 12, fontWeight: 800, background: isBroadcasting ? 'rgba(255,45,85,0.1)' : 'var(--blue)', borderColor: isBroadcasting ? 'var(--red)' : 'var(--blue)', color: isBroadcasting ? 'var(--red)' : '#fff' }}
                  >
                    {isBroadcasting ? '🛑 STOP LOCATION BROADCAST' : '📡 START LOCATION BROADCAST'}
                  </button>
                </div>
              </div>

              <div className="glass" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <PackageCheck size={16} style={{ color: 'var(--green)' }} />
                  <h4 style={{ fontSize: 13, fontWeight: 800 }}>Start-Shift Equipment</h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800 }}>Oxygen Level: {equipmentLog.oxygen}%</label>
                  <input type="range" min="0" max="100" value={equipmentLog.oxygen} onChange={e => setEquipmentLog({ ...equipmentLog, oxygen: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <select className="form-input form-select" value={equipmentLog.defibrillator} onChange={e => setEquipmentLog({ ...equipmentLog, defibrillator: e.target.value })}>
                      <option value="Ready">Defib Ready</option>
                      <option value="Needs Service">Defib Service</option>
                    </select>
                    <select className="form-input form-select" value={equipmentLog.supplies} onChange={e => setEquipmentLog({ ...equipmentLog, supplies: e.target.value })}>
                      <option value="Stocked">Supplies Stocked</option>
                      <option value="Low">Supplies Low</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={saveEquipmentLog} disabled={equipmentSaving} style={{ width: '100%', height: 38, borderRadius: 10 }}>
                    <Save size={14} /> {equipmentSaving ? 'Saving...' : 'Save Checklist'}
                  </button>
                </div>
              </div>

              <div className="glass" style={{ padding: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 14 }}>Current Shift</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div style={{ background: 'rgba(10, 132, 255, 0.1)', border: '1px solid rgba(10, 132, 255, 0.2)', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--blue)' }}>{shiftSummary?.hours_worked || 0}</div>
                    <div style={{ fontSize: 9, color: 'var(--blue)', opacity: 0.8, fontWeight: 800 }}>HOURS</div>
                  </div>
                  <div style={{ background: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.2)', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--green)' }}>{shiftSummary?.trips_completed || 0}</div>
                    <div style={{ fontSize: 9, color: 'var(--green)', opacity: 0.8, fontWeight: 800 }}>TRIPS</div>
                  </div>
                  <div style={{ background: 'rgba(255, 149, 0, 0.1)', border: '1px solid rgba(255, 149, 0, 0.2)', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--orange)' }}>৳{shiftSummary?.estimated_earnings || 0}</div>
                    <div style={{ fontSize: 9, color: 'var(--orange)', opacity: 0.8, fontWeight: 800 }}>EARNED</div>
                  </div>
                </div>
              </div>

              {/* Broadcasts section moved to top */}
            </div>
          ) : (
            <>
              {/* Trip Card */}
              <div className="glass" style={{ padding: 24, borderLeft: '4px solid var(--orange)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--orange)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                      Active Assignment
                    </span>
                    <h3 style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }}>#{trip.trip_id}</h3>
                  </div>
                  <SeverityBadge level={trip.severity_level} />
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ marginBottom: 24 }}>
                  {(trip.request_status === 'Active' || trip.request_status === 'Pending') && (
                    <button 
                      onClick={() => handleAction('Accept')} 
                      disabled={actionLoading} 
                      className="btn btn-primary"
                      style={{ width: '100%', height: 56, borderRadius: 16, fontSize: 16, fontWeight: 800, letterSpacing: 1 }}
                    >
                      {actionLoading ? 'CONFIRMING...' : (trip.request_status === 'Active' ? 'START MISSION' : 'ACCEPT MISSION')}
                    </button>
                  )}
                  
                  {trip.request_status !== 'Active' && trip.request_status !== 'Pending' && trip.request_status !== 'Complete' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      
                      {/* START/STOP BROADCAST TOGGLE */}
                      <button 
                        onClick={isBroadcasting ? stopBroadcasting : startBroadcasting}
                        className={`btn ${isBroadcasting ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ width: '100%', height: 56, borderRadius: 16, fontSize: 15, fontWeight: 800, background: isBroadcasting ? 'rgba(255,45,85,0.1)' : 'var(--blue)', borderColor: isBroadcasting ? 'var(--red)' : 'var(--blue)', color: isBroadcasting ? 'var(--red)' : '#fff' }}
                      >
                        {isBroadcasting ? '🛑 STOP BROADCAST' : '📡 START BROADCAST'}
                      </button>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {trip.request_status === 'En Route' && (
                          <button onClick={() => handleAction('ArrivedPatient')} className="btn btn-secondary" style={{ height: 48, borderRadius: 12, fontWeight: 700, borderColor: 'var(--orange)', color: 'var(--orange)' }}>ARRIVED AT PATIENT</button>
                        )}
                        {trip.request_status === 'Picked Up' && (
                          <button onClick={() => handleAction('EnRouteHospital')} className="btn btn-secondary" style={{ height: 48, borderRadius: 12, fontWeight: 700, borderColor: 'var(--blue)', color: 'var(--blue)' }}>EN ROUTE HOSPITAL</button>
                        )}
                        {trip.request_status === 'Arrived' && (
                          <button onClick={() => handleAction('Complete')} className="btn btn-primary" style={{ height: 48, borderRadius: 12, fontWeight: 700, background: 'var(--green)', borderColor: 'var(--green)', gridColumn: 'span 2' }}>COMPLETE MISSION</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Telemetry Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div className="glass-dark p-3 rounded-xl text-center">
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Speed</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)' }}>{speed.toFixed(1)}<span style={{ fontSize: 10, marginLeft: 2 }}>km/h</span></p>
                  </div>
                  <div className="glass-dark p-3 rounded-xl text-center">
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>GPS Acc</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: accuracy < 20 ? 'var(--green)' : 'var(--yellow)' }}>{Math.round(accuracy)}m</p>
                  </div>
                  <div className="glass-dark p-3 rounded-xl text-center">
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Time</p>
                    <p style={{ fontSize: 18, fontWeight: 800 }}>{uptime}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AlertTriangle size={20} style={{ color: 'var(--orange)' }} />
                    <div>
                      <label style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>PATIENT PROFILE</label>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{trip.patient_name} · {trip.blood_type || 'N/A'} · {trip.emergency_type || 'General'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        For: {trip.requested_for || 'Self'} · Allergies: {trip.allergies || 'None reported'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Conditions: {(trip.conditions || []).join(', ') || 'None reported'}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <MapPin size={20} style={{ color: 'var(--red)' }} />
                    <div>
                      <label style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>PICKUP LOCATION</label>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{trip.patient_lat.toFixed(4)}, {trip.patient_lon.toFixed(4)}</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Building2 size={20} style={{ color: 'var(--blue)' }} />
                    <div>
                      <label style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>DESTINATION</label>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{trip.hospital_name}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat with Dispatcher */}
              <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 250, border: 'none', marginTop: 16 }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageCircle size={16} style={{ color: 'var(--blue)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Emergency Dispatch Chat</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chatMessages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.sender.includes('Driver') ? 'flex-end' : 'flex-start', background: m.sender.includes('Driver') ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 16, maxWidth: '85%', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}>{m.sender.toUpperCase()}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{m.message_text}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} style={{ padding: 12, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.3)' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ fontSize: 13, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12 }}
                    placeholder="Type message..." 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                  />
                  <button type="submit" disabled={isSending} className="btn btn-primary" style={{ padding: '0 16px', borderRadius: 12, opacity: isSending ? 0.7 : 1 }}>
                    {isSending ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Send size={18}/>}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Right Panel: Map Navigation */}
        <div className="track-map">
          {trip ? (
            <>
              <MapView 
                pickupCoords={{ lat: trip.patient_lat, lon: trip.patient_lon }} 
                hospitals={[{ hospital_id: 1, name: trip.hospital_name, lat: trip.hospital_lat, lon: trip.hospital_lon, general_beds: 'Destination', icu_beds: 'Secured' }]}
                requestStatus={trip.request_status}
                realtimeMarker={realtimeMarker}
              />
              
              {/* Map Overlay Stats */}
              <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, zIndex: 1000, display: 'flex', gap: 12 }}>
                <div className="glass" style={{ flex: 1, padding: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)' }}>
                        <Gauge size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Live Speed</div>
                        <div style={{ fontSize: 24, fontWeight: 900 }}>{speed.toFixed(1)} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>km/h</span></div>
                    </div>
                </div>
                <div className="glass" style={{ flex: 1, padding: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(10,132,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
                        <Navigation size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Navigation</div>
                        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {trip.request_status === 'En Route' ? 'Moving to Pickup' : 'Driving to Hospital'}
                        </div>
                    </div>
                </div>
              </div>

              {/* Status Badge Over Map */}
              <div className="glass" style={{ padding: '8px 16px', position: 'absolute', top: 24, left: 24, zIndex: 1000, fontWeight: 800, fontSize: 12, color: 'var(--yellow)', border: '1px solid var(--yellow-glow)' }}>
                DISPATCHED: UNIT {trip.license_plate}
              </div>
            </>
          ) : (
            <>
              <MapView realtimeMarker={realtimeMarker} />
              <div className="glass" style={{ padding: '8px 16px', position: 'absolute', top: 24, left: 24, zIndex: 1000, fontWeight: 800, fontSize: 12, color: 'var(--blue)', border: '1px solid var(--blue-glow)' }}>
                STANDBY POSITION
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
