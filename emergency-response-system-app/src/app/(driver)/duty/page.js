'use client';
import { useState, useEffect, useCallback } from 'react';
import { Navigation, PhoneCall, Truck, AlertTriangle, Building2, CheckCircle, Clock, MessageCircle, Send } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge } from '@/components/Badges';

import { useUser } from '@/lib/UserContext';

export default function DriverDutyPage() {
  const { activeDriver } = useUser();
  const [trip, setTrip] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTrip = useCallback(async () => {
    if (!activeDriver?.id) return;
    try {
      const res = await fetch(`/api/driver/duty?driver_id=${activeDriver.id}`);
      const data = await res.json();
      setTrip(data.active_trip);
      setChatMessages(data.chat_messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeDriver]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !trip) return;
    
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: trip.trip_id, text: newMessage, sender: `Driver (${activeDriver.name})` })
      });
      setNewMessage('');
      fetchTrip();
    } catch (err) {
      console.error(err);
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
    
    // Auto-refresh every 3 seconds for demo purposes
    const interval = setInterval(fetchTrip, 3000);
    return () => clearInterval(interval);
  }, [activeDriver, fetchTrip]);



  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/driver/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: trip.request_id, action }),
      });
      const result = await res.json();
      if (result.success) {
        if (action === 'Complete') {
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

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h2>Active Duty</h2>
          <p className="page-header-sub">Live navigation and dispatch assignments</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="badge badge-active" style={{ fontSize: 13 }}><Truck size={14} /> Unit {trip?.license_plate || 'Online'}</span>
          <button 
            onClick={async () => {
              setActionLoading(true);
              const newStatus = activeDriver?.status === 'On_Duty' ? 'Off_Duty' : 'On_Duty';
              try {
                await fetch('/api/drivers', { 
                  method: 'PATCH', 
                  headers: { 'Content-Type': 'application/json' }, 
                  body: JSON.stringify({ driver_id: activeDriver.id, shift_status: newStatus }) 
                });
                window.location.reload();
              } catch (e) {
                alert('Failed to update status');
              } finally {
                setActionLoading(false);
              }
            }}
            disabled={actionLoading}
            className={`btn btn-sm ${activeDriver?.status === 'On_Duty' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 20, fontSize: 11, padding: '4px 12px', minWidth: 100 }}
          >
            {actionLoading ? 'Updating...' : (activeDriver?.status === 'On_Duty' ? '🟢 ON DUTY' : '⚪ OFF DUTY')}
          </button>
        </div>
      </div>

      {!trip ? (
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Navigation size={48} style={{ color: 'var(--yellow)', opacity: 0.5, marginBottom: 16 }} />
          <h3>Waiting for Dispatch...</h3>
          <p>You are currently available. New emergency requests will appear here instantly.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden' }}>
          
          {/* Left Panel: Details & Actions */}
          <div style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 8 }}>
            <div className="section-card" style={{ padding: 24, border: '2px solid var(--yellow)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--yellow)', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'New Dispatch' : trip.request_status}
                  </span>
                  <h3 style={{ fontSize: 28, marginTop: 4 }}>Trip #{trip.trip_id}</h3>
                </div>
                <SeverityBadge level={trip.severity_level} />
              </div>

              {/* ACTION BUTTONS - FORCED HIGH CONTRAST */}
              <div style={{ marginBottom: 20 }}>
                {(trip.request_status === 'Active' || trip.request_status === 'Pending') && (
                  <button 
                    onClick={() => handleAction('Accept')} 
                    disabled={actionLoading} 
                    style={{ width: '100%', height: 48, background: '#0A84FF', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {actionLoading ? 'Confirming...' : 'ACCEPT DISPATCH'}
                  </button>
                )}
                {trip.request_status === 'En Route' && (
                  <button 
                    onClick={() => handleAction('Picked')} 
                    disabled={actionLoading} 
                    style={{ width: '100%', height: 48, background: '#FFD60A', color: '#000000', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {actionLoading ? 'Updating...' : 'PATIENT PICKED UP'}
                  </button>
                )}
                {trip.request_status === 'Picked Up' && (
                  <button 
                    onClick={() => handleAction('Arrived')} 
                    disabled={actionLoading} 
                    style={{ width: '100%', height: 48, background: '#0A84FF', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {actionLoading ? 'Updating...' : 'ARRIVED AT HOSPITAL'}
                  </button>
                )}
                {trip.request_status === 'Arrived' && (
                  <button 
                    onClick={() => handleAction('Complete')} 
                    disabled={actionLoading} 
                    style={{ width: '100%', height: 48, background: '#32D74B', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {actionLoading ? 'Completing...' : 'COMPLETE & HANDOVER'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 0 }}>
                <div>
                  <label style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Patient</label>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{trip.patient_name} <span className="badge badge-critical" style={{ fontSize: 10 }}>{trip.blood_type}</span></div>
                </div>

                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, borderLeft: '3px solid var(--red)' }}>
                  <label style={{ fontSize: 9, color: 'var(--red)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10}/> Location</label>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>GPS: {trip.patient_lat.toFixed(4)}, {trip.patient_lon.toFixed(4)}</div>
                </div>

                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, borderLeft: '3px solid var(--blue)' }}>
                  <label style={{ fontSize: 9, color: 'var(--blue)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={10}/> Destination</label>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{trip.hospital_name}</div>
                </div>
              </div>
            </div>

            <div className="section-card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(10,132,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}><Clock size={16}/></div>
                <div>
                   <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Dispatched At</div>
                   <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(trip.time_dispatched).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            </div>

            {/* Chat with Dispatcher */}
            <div className="section-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 250 }}>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={16} style={{ color: 'var(--blue)' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Dispatcher Chat</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.sender.includes('Driver') ? 'flex-end' : 'flex-start', background: m.sender.includes('Driver') ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 12, maxWidth: '90%' }}>
                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>{m.sender}</div>
                    <div style={{ fontSize: 12 }}>{m.text}</div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} style={{ padding: 12, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.2)' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ fontSize: 12 }}
                  placeholder="Message dispatcher..." 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm"><Send size={16}/></button>
              </form>
            </div>
          </div>

          {/* Right Panel: Map Navigation */}
          <div style={{ flex: 1, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative' }}>
             <MapView 
                pickupCoords={{ lat: trip.patient_lat, lon: trip.patient_lon }} 
                hospitals={[{ hospital_id: 1, name: trip.hospital_name, lat: trip.hospital_lat, lon: trip.hospital_lon, general_beds: 'Destination', icu_beds: 'Secured' }]}
                requestStatus={trip.request_status}
             />
             <div style={{ position: 'absolute', top: 20, left: 20, right: 20, background: 'var(--bg-card)', padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border-subtle)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 12, zIndex: 1000 }}>
                 <Navigation size={20} style={{ color: 'var(--yellow)' }} />
                 <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Navigation</div>
                     <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'Waiting for Acceptance' : 
                         trip.request_status === 'En Route' ? 'Proceed to Patient Location (Red Marker)' :
                         trip.request_status === 'Picked Up' ? 'Drive to Destination Hospital (Blue Marker)' : 
                         'Hand over patient to Emergency Room staff'}
                     </div>
                 </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}
