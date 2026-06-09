'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Navigation, PhoneCall, Truck, AlertTriangle, Building2, ShieldAlert, Radio, Gauge, MapPin, MessageCircle, Send } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge } from '@/components/Badges';
import mqttService from '@/lib/mqttService';

export default function PatientTrackPage() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeMarker, setRealtimeMarker] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/patient/track?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setTrip(data.active_trip);
      setChatMessages(data.chat_messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !trip) return;
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: trip.trip_id, text: newMessage, sender: `Patient (${trip.patient_name || 'Self'})` })
      });
      setNewMessage('');
      fetchTrip();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTrip();
    const int = setInterval(fetchTrip, 3000);
    return () => clearInterval(int);
  }, [fetchTrip]);

  // MQTT Connection for real-time updates
  useEffect(() => {
    if (!trip) return;

    mqttService.connect(`patient-${Math.random().toString(16).substr(2, 6)}`);
    
    const unsubscribe = mqttService.subscribe((data) => {
      // Filter for the assigned ambulance
      if (data.id === `ambulance-${trip.driver_id}`) {
        if (data.status === 'offline') {
          setRealtimeMarker(null);
        } else {
          setRealtimeMarker({
            lat: data.lat,
            lng: data.lng,
            speed: data.speed,
            acc: data.acc
          });
        }
      }
    });

    return () => {
      unsubscribe();
      mqttService.disconnect();
    };
  }, [trip]);

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container dot-pattern" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px', position: 'relative' }}>
      
      {/* Background Blobs */}
      <div className="bg-blob">
        <div className="blob blob-1"></div>
        <div className="blob blob-3" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="page-header" style={{ marginBottom: 16, flexShrink: 0, position: 'relative', zIndex: 10 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 800 }}>
            Live Tracking
          </h2>
          <p className="page-header-sub">Monitor your rescue unit in real-time</p>
        </div>
      </div>

      {!trip ? (
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
          <div className="animate-float">
            <ShieldAlert size={64} style={{ color: 'var(--red)', opacity: 0.3, marginBottom: 24 }} />
          </div>
          <h3 style={{ fontSize: 24, fontWeight: 700 }}>No Active Emergencies</h3>
          <p style={{ maxWidth: 400, margin: '12px auto' }}>You don&apos;t have any active SOS requests. In case of emergency, use the SOS button on your dashboard.</p>
        </div>
      ) : (
        <div className="track-layout">
          
          {/* Left Panel: Details */}
          <div className="track-sidebar">
            
            <div className="glass" style={{ padding: 24, borderLeft: '4px solid var(--red)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--red)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'Unit Assigned' : 
                     trip.request_status === 'En Route' ? 'Unit Is Arriving' :
                     trip.request_status === 'Picked Up' ? 'Transporting' : 'Arrived'}
                  </span>
                  <h3 style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }}>Trip #{trip.trip_id || trip.request_id || 'Req'}</h3>
                </div>
                <SeverityBadge level={trip.severity_level} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,149,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--yellow)', flexShrink: 0 }}>
                    <Truck size={24} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>AMBULANCE ID</label>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{trip.license_plate || 'Unassigned'}</div>
                  </div>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, borderLeft: '3px solid var(--red)' }}>
                  <label style={{ fontSize: 9, color: 'var(--red)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={10}/> Pickup Point</label>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>GPS: {trip.patient_lat.toFixed(4)}, {trip.patient_lon.toFixed(4)}</div>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, borderLeft: '3px solid var(--blue)' }}>
                  <label style={{ fontSize: 9, color: 'var(--blue)', textTransform: 'uppercase', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={10}/> Destination</label>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{trip.hospital_name}</div>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', height: 56, borderRadius: 16, fontSize: 16, fontWeight: 800, boxShadow: '0 10px 20px rgba(255,45,85,0.2)' }}
                onClick={() => {
                  if (trip.driver_name) {
                    setShowDriverModal(true);
                  } else {
                    alert('Driver has not been assigned yet.');
                  }
                }}
              >
                 <PhoneCall size={18} /> CONTACT DRIVER
              </button>
              
              {showDriverModal && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800 }}>Driver Information</h4>
                    <button onClick={() => setShowDriverModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Close</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                        {trip.driver_name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{trip.driver_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assigned First Responder</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>{trip.driver_phone || 'N/A'}</div>
                      <a href={`tel:${trip.driver_phone}`} className="btn btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 20 }}>Call Now</a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Telemetry Status */}
            <div className="glass" style={{ padding: 20 }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Driver Telemetry</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div style={{ padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <Gauge size={16} style={{ color: 'var(--blue)' }} />
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>SPEED</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{realtimeMarker?.speed || '0.0'} km/h</div>
                    </div>
                 </div>
                 <div style={{ padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <Radio size={16} style={{ color: 'var(--green)' }} />
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>SIGNAL</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{realtimeMarker ? 'EXCELLENT' : 'CONNECTING'}</div>
                    </div>
                 </div>
              </div>
            </div>
            {/* Chat with Dispatcher / Driver */}
            <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 250, border: 'none', marginTop: 16 }}>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={16} style={{ color: 'var(--blue)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Emergency Chat</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.sender.includes('Patient') ? 'flex-end' : 'flex-start', background: m.sender.includes('Patient') ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 16, maxWidth: '85%', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}>{m.sender.toUpperCase()}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>{m.message_text}</div>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 20 }}>No messages yet. Send a message to the driver or dispatcher.</div>
                )}
              </div>
              <form onSubmit={handleSendMessage} style={{ padding: 12, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.3)' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ fontSize: 13, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, width: '100%' }}
                  placeholder="Type message..." 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', borderRadius: 12 }}><Send size={18}/></button>
              </form>
            </div>
          </div>

          {/* Right Panel: Map */}
          <div className="track-map">
             <MapView 
                pickupCoords={{ lat: trip.patient_lat, lon: trip.patient_lon }} 
                hospitals={[{ hospital_id: 1, name: trip.hospital_name, lat: trip.hospital_lat, lon: trip.hospital_lon, general_beds: 'Destination', icu_beds: 'Secured' }]}
                requestStatus={trip.request_status}
                realtimeMarker={realtimeMarker}
                initialAmbulanceLocation={{ lat: trip.ambulance_lat, lon: trip.ambulance_lon }}
             />
             
             {/* Map Status Overlay */}
             <div className="glass" style={{ padding: 20, position: 'absolute', top: 24, left: 24, right: 24, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 16 }}>
                 <div className="animate-pulse" style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,45,85,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
                    <Navigation size={24} />
                 </div>
                 <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Mission Status</div>
                     <div style={{ fontSize: 16, fontWeight: 700 }}>
                        {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'Ambulance is confirmed and preparing to leave.' : 
                         trip.request_status === 'En Route' ? 'Ambulance is moving towards your location.' :
                         trip.request_status === 'Picked Up' ? 'Transporting to hospital safely.' : 
                         'Arrived safely. Stand by for medical handover.'}
                     </div>
                 </div>
             </div>

             {/* Live Connection Tag */}
             <div className="glass" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, position: 'absolute', bottom: 24, left: 24, zIndex: 1000 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: realtimeMarker ? 'var(--green)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: 10, fontWeight: 800 }}>{realtimeMarker ? 'LIVE SYSTEM LINK' : 'ESTABLISHING LINK...'}</span>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}

