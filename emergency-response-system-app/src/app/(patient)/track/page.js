'use client';
import { useState, useEffect, useCallback } from 'react';
import { Navigation, PhoneCall, Truck, AlertTriangle, Building2, ShieldAlert, Radio, Gauge, MapPin } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge } from '@/components/Badges';
import mqttService from '@/lib/mqttService';

export default function PatientTrackPage() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeMarker, setRealtimeMarker] = useState(null);

  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch('/api/patient/track');
      const data = await res.json();
      setTrip(data.active_trip);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrip();
    const interval = setInterval(fetchTrip, 10000); // Slower polling as backup
    return () => clearInterval(interval);
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
          <h2 style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
          <p style={{ maxWidth: 400, margin: '12px auto' }}>You don't have any active SOS requests. In case of emergency, use the SOS button on your dashboard.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
          
          {/* Left Panel: Details */}
          <div style={{ width: '420px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            
            <div className="glass p-6 border-l-4 border-l-red-500 shadow-2xl">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--red)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'Unit Assigned' : 
                     trip.request_status === 'En Route' ? 'Unit Is Arriving' :
                     trip.request_status === 'Picked Up' ? 'Transporting' : 'Arrived'}
                  </span>
                  <h3 style={{ fontSize: 32, fontWeight: 900, marginTop: 4 }}>Trip #{trip.trip_id}</h3>
                </div>
                <SeverityBadge level={trip.severity_level} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div className="glass-dark p-4 rounded-xl flex items-center gap-4">
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,214,10,0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'var(--yellow)', paddingLeft: 12 }}>
                    <Truck size={24} />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>AMBULANCE ID</label>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{trip.license_plate}</div>
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

              <button className="btn btn-primary" style={{ width: '100%', height: 56, borderRadius: 16, fontSize: 16, fontWeight: 800, boxShadow: '0 10px 20px rgba(255,45,85,0.2)' }}>
                 <PhoneCall size={18} /> CONTACT DRIVER
              </button>
            </div>

            {/* Telemetry Status */}
            <div className="glass p-5">
              <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Driver Telemetry</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div className="glass-dark p-3 rounded-xl flex items-center gap-3">
                    <Gauge size={16} style={{ color: 'var(--blue)' }} />
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>SPEED</div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{realtimeMarker?.speed || '0.0'} km/h</div>
                    </div>
                 </div>
                 <div className="glass-dark p-3 rounded-xl flex items-center gap-3">
                    <Radio size={16} style={{ color: 'var(--green)' }} />
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>SIGNAL</div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{realtimeMarker ? 'EXCELLENT' : 'CONNECTING'}</div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Map */}
          <div style={{ flex: 1, borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
             <MapView 
                pickupCoords={{ lat: trip.patient_lat, lon: trip.patient_lon }} 
                hospitals={[{ hospital_id: 1, name: trip.hospital_name, lat: trip.hospital_lat, lon: trip.hospital_lon, general_beds: 'Destination', icu_beds: 'Secured' }]}
                requestStatus={trip.request_status}
                realtimeMarker={realtimeMarker}
             />
             
             {/* Map Status Overlay */}
             <div className="glass p-5" style={{ position: 'absolute', top: 24, left: 24, right: 24, zIndex: 1000, display: 'flex', alignItems: 'center', gap: 16 }}>
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
             <div className="glass px-3 py-1.5 flex items-center gap-2" style={{ position: 'absolute', bottom: 24, left: 24, zIndex: 1000 }}>
                <div className={`w-2 h-2 rounded-full ${realtimeMarker ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                <span style={{ fontSize: 10, fontWeight: 800 }}>{realtimeMarker ? 'LIVE NEXUS LINK' : 'ESTABLISHING LINK...'}</span>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}

