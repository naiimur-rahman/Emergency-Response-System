'use client';
import { useState, useEffect, useCallback } from 'react';
import { Navigation, PhoneCall, Truck, AlertTriangle, Building2, ShieldAlert } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge } from '@/components/Badges';

export default function PatientTrackPage() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTrip = useCallback(async () => {
    try {
      // For the demo, we fetch the most recent active dispatch
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
    const init = async () => {
      await fetchTrip();
    };
    init();
    const interval = setInterval(fetchTrip, 5000);
    return () => clearInterval(interval);
  }, [fetchTrip]);



  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px' }}>
      <div className="page-header" style={{ marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h2>Live Tracking</h2>
          <p className="page-header-sub">Track your assigned ambulance in real-time</p>
        </div>
      </div>

      {!trip ? (
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <ShieldAlert size={48} style={{ color: 'var(--red)', opacity: 0.5, marginBottom: 16 }} />
          <h3>No Active Emergencies</h3>
          <p>You do not have any active SOS requests right now.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flex: 1, overflow: 'hidden' }}>
          
          {/* Left Panel: Details */}
          <div style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div className="section-card" style={{ padding: 24, background: 'linear-gradient(to bottom right, var(--bg-card), rgba(255,59,48,0.05))', borderColor: 'rgba(255,59,48,0.3)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'Ambulance Dispatched' : 
                     trip.request_status === 'En Route' ? 'Ambulance is Arriving' :
                     trip.request_status === 'Picked Up' ? 'En Route to Hospital' :
                     trip.request_status === 'Arrived' ? 'Arrived at Hospital' : 'Active'}
                  </span>
                  <h3 style={{ fontSize: 24, marginTop: 4 }}>Trip #{trip.trip_id}</h3>
                </div>
                <SeverityBadge level={trip.severity_level} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Assigned Unit</label>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Truck size={18} style={{ color: 'var(--yellow)' }}/> {trip.license_plate}
                  </div>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '3px solid var(--red)' }}>
                  <label style={{ fontSize: 11, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12}/> Your Location</label>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>{trip.patient_lat.toFixed(4)}, {trip.patient_lon.toFixed(4)}</div>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '3px solid var(--blue)' }}>
                  <label style={{ fontSize: 11, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={12}/> Destination Hospital</label>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{trip.hospital_name}</div>
                </div>
              </div>

              <button style={{ width: '100%', padding: 16, background: 'var(--bg-primary)', color: 'white', border: '1px solid var(--border-subtle)', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                 <PhoneCall size={16} /> Contact Driver
              </button>
            </div>
          </div>

          {/* Right Panel: Map */}
          <div style={{ flex: 1, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative' }}>
             <MapView 
                pickupCoords={{ lat: trip.patient_lat, lon: trip.patient_lon }} 
                hospitals={[{ hospital_id: 1, name: trip.hospital_name, lat: trip.hospital_lat, lon: trip.hospital_lon, general_beds: 'Destination', icu_beds: 'Secured' }]}
             />
             <div style={{ position: 'absolute', top: 20, left: 20, right: 20, background: 'var(--bg-card)', padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border-subtle)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 12, zIndex: 1000 }}>
                 <Navigation size={20} style={{ color: 'var(--red)' }} />
                 <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Status Updates</div>
                     <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'Ambulance is confirmed and preparing to leave.' : 
                         trip.request_status === 'En Route' ? 'Ambulance is on the way to your location.' :
                         trip.request_status === 'Picked Up' ? 'Transporting to hospital safely.' : 
                         'Arrived safely. Stand by for medical handover.'}
                     </div>
                 </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}
