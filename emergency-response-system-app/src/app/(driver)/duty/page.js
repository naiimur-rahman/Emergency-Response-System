'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigation, PhoneCall, Truck, AlertTriangle, Building2, CheckCircle, Clock, MessageCircle, Send, Radio, MapPin, Gauge } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge } from '@/components/Badges';
import { useUser } from '@/lib/UserContext';
import mqttService from '@/lib/mqttService';

export default function DriverDutyPage() {
  const { activeDriver } = useUser();
  const [trip, setTrip] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Real-time Telemetry State
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [uptime, setUptime] = useState('00:00');
  const [realtimeMarker, setRealtimeMarker] = useState(null);

  const watchId = useRef(null);
  const tripStartTime = useRef(null);
  const lastSentTime = useRef(0);



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

  // MQTT Connection
  useEffect(() => {
    if (!activeDriver?.id) return;
    mqttService.connect(`driver-${activeDriver.id}`);
    return () => mqttService.disconnect();
  }, [activeDriver?.id]);

  // Broadcasting Logic
  const startBroadcasting = useCallback(() => {
    if (!navigator.geolocation) return;

    setIsBroadcasting(true);
    tripStartTime.current = Date.now();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed: rawSpeed, accuracy: acc } = pos.coords;
        const currentSpeed = (rawSpeed || 0) * 3.6; // m/s to km/h
        
        setSpeed(currentSpeed);
        setAccuracy(acc);
        setRealtimeMarker({ lat: latitude, lng: longitude, speed: currentSpeed.toFixed(1), acc });

        const now = Date.now();
        if (now - lastSentTime.current > 500) { // Throttling
          mqttService.publish({
            id: `ambulance-${activeDriver.id}`,
            driver_name: activeDriver.name,
            lat: latitude,
            lng: longitude,
            speed: currentSpeed.toFixed(1),
            acc: acc,
            status: 'active'
          });
          lastSentTime.current = now;
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [activeDriver]);

  const stopBroadcasting = useCallback(() => {
    setIsBroadcasting(false);
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    mqttService.publishOffline(`ambulance-${activeDriver.id}`);
    setRealtimeMarker(null);
    setSpeed(0);
    setAccuracy(0);
    setUptime('00:00');
  }, [activeDriver]);

  // Uptime Counter
  useEffect(() => {
    if (!isBroadcasting) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - tripStartTime.current) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setUptime(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [isBroadcasting]);

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
    const interval = setInterval(fetchTrip, 5000);
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
          <h2 style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Active Duty
          </h2>
          <p className="page-header-sub">Nexus Real-Time Dispatch System</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`glass px-4 py-2 flex items-center gap-2 ${isBroadcasting ? 'border-green-500/50' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${isBroadcasting ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
            <span style={{ fontSize: 12, fontWeight: 700, color: isBroadcasting ? 'var(--green)' : 'var(--text-muted)' }}>
              {isBroadcasting ? 'LIVE BROADCASTING' : 'READY'}
            </span>
          </div>
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
            className={`btn ${activeDriver?.status === 'On_Duty' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 20, fontSize: 12, padding: '8px 20px', minWidth: 120, boxShadow: activeDriver?.status === 'On_Duty' ? '0 0 20px rgba(255,45,85,0.3)' : 'none' }}
          >
            {actionLoading ? '...' : (activeDriver?.status === 'On_Duty' ? '🟢 ONLINE' : '⚪ OFFLINE')}
          </button>
        </div>
      </div>

      {!trip ? (
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 10 }}>
          <div className="animate-float">
            <Radio size={64} style={{ color: 'var(--blue)', opacity: 0.3, marginBottom: 24 }} />
          </div>
          <h3 style={{ fontSize: 24, fontWeight: 700 }}>Scanning for Dispatch...</h3>
          <p style={{ maxWidth: 400, margin: '12px auto' }}>You are currently on the standby list. Emergency requests will be pushed to your terminal instantly.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
          
          {/* Left Panel: Details & Actions */}
          <div style={{ width: '420px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 8 }}>
            
            {/* Trip Card */}
            <div className="glass p-6 border-l-4 border-l-orange-500 shadow-2xl">
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
                    {actionLoading ? 'CONFIRMING...' : 'ACCEPT MISSION'}
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
                        <button onClick={() => handleAction('Picked')} className="btn btn-secondary" style={{ height: 48, borderRadius: 12, fontWeight: 700, borderColor: 'var(--orange)', color: 'var(--orange)' }}>PICKED UP</button>
                       )}
                       {trip.request_status === 'Picked Up' && (
                        <button onClick={() => handleAction('Arrived')} className="btn btn-secondary" style={{ height: 48, borderRadius: 12, fontWeight: 700, borderColor: 'var(--blue)', color: 'var(--blue)' }}>ARRIVED</button>
                       )}
                       {trip.request_status === 'Arrived' && (
                        <button onClick={() => handleAction('Complete')} className="btn btn-primary" style={{ height: 48, borderRadius: 12, fontWeight: 700, background: 'var(--green)', borderColor: 'var(--green)', gridColumn: 'span 2' }}>COMPLETE MISSION</button>
                       )}
                    </div>
                  </div>
                )}
              </div>

              {/* Telemetry Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
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
            <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 250, border: 'none' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={16} style={{ color: 'var(--blue)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>Nexus Dispatch Chat</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.sender.includes('Driver') ? 'flex-end' : 'flex-start', background: m.sender.includes('Driver') ? 'rgba(10,132,255,0.2)' : 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 16, maxWidth: '85%', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.5, marginBottom: 4 }}>{m.sender.toUpperCase()}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>{m.text}</div>
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
                <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', borderRadius: 12 }}><Send size={18}/></button>
              </form>
            </div>
          </div>

          {/* Right Panel: Map Navigation */}
          <div style={{ flex: 1, borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
             <MapView 
                pickupCoords={{ lat: trip.patient_lat, lon: trip.patient_lon }} 
                hospitals={[{ hospital_id: 1, name: trip.hospital_name, lat: trip.hospital_lat, lon: trip.hospital_lon, general_beds: 'Destination', icu_beds: 'Secured' }]}
                requestStatus={trip.request_status}
                realtimeMarker={realtimeMarker}
             />
             
             {/* Map Overlay Stats */}
             <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, zIndex: 1000, display: 'flex', gap: 12 }}>
                <div className="glass p-4 flex-1 flex items-center gap-4 shadow-2xl">
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)' }}>
                        <Gauge size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Live Speed</div>
                        <div style={{ fontSize: 24, fontWeight: 900 }}>{speed.toFixed(1)} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>km/h</span></div>
                    </div>
                </div>
                <div className="glass p-4 flex-1 flex items-center gap-4 shadow-2xl">
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
             <div className="glass px-4 py-2" style={{ position: 'absolute', top: 24, left: 24, zIndex: 1000, fontWeight: 800, fontSize: 12, color: 'var(--yellow)', border: '1px solid var(--yellow-glow)' }}>
                DISPATCHED: UNIT {trip.license_plate}
             </div>
          </div>

        </div>
      )}
    </div>
  );
}

