'use client';
import { useState, useEffect } from 'react';
import { Navigation, PhoneCall, Truck, AlertTriangle, Building2, CheckCircle, Clock } from 'lucide-react';
import MapView from '@/components/MapView';
import { SeverityBadge } from '@/components/Badges';

import { useUser } from '@/lib/UserContext';

export default function DriverDutyPage() {
  const { activeDriver } = useUser();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!activeDriver?.id) return;
    fetchTrip();
    // Auto-refresh every 10 seconds for demo purposes
    const interval = setInterval(fetchTrip, 10000);
    return () => clearInterval(interval);
  }, [activeDriver]);

  const fetchTrip = async () => {
    if (!activeDriver?.id) return;
    try {
      const res = await fetch(`/api/driver/duty?driver_id=${activeDriver.id}`);
      const data = await res.json();
      setTrip(data.active_trip);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-active" style={{ fontSize: 13 }}><Truck size={14} /> Unit {trip?.license_plate || 'Online'}</span>
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
          <div style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div className="section-card" style={{ padding: 24, background: 'linear-gradient(to bottom right, var(--bg-card), rgba(255,159,10,0.05))', borderColor: 'rgba(255,159,10,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {trip.request_status === 'Pending' || trip.request_status === 'Active' ? 'New Dispatch Assigned' : 
                     trip.request_status === 'En Route' ? 'En Route to Patient' :
                     trip.request_status === 'Picked Up' ? 'Transporting to Hospital' :
                     trip.request_status === 'Arrived' ? 'At Hospital - Awaiting Handover' : 'Active Trip'}
                  </span>
                  <h3 style={{ fontSize: 24, marginTop: 4 }}>Trip #{trip.trip_id}</h3>
                </div>
                <SeverityBadge level={trip.severity_level} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Patient Details</label>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {trip.patient_name}
                    {trip.blood_type && <span className="badge badge-critical" style={{ fontSize: 11 }}>{trip.blood_type}</span>}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <PhoneCall size={14} /> {trip.patient_phone}
                  </div>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '3px solid var(--red)' }}>
                  <label style={{ fontSize: 11, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12}/> Emergency Location</label>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>GPS Coords: {trip.patient_lat.toFixed(4)}, {trip.patient_lon.toFixed(4)}</div>
                </div>

                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, borderLeft: '3px solid var(--blue)' }}>
                  <label style={{ fontSize: 11, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={12}/> Destination Hospital</label>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{trip.hospital_name}</div>
                </div>
              </div>

              {trip.request_status === 'Pending' || trip.request_status === 'Active' ? (
                <button 
                  onClick={() => handleAction('Accept')}
                  disabled={actionLoading}
                  style={{ width: '100%', padding: 16, background: 'var(--yellow)', color: 'black', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Navigation size={18} /> {actionLoading ? 'Updating...' : 'Accept & Navigate'}
                </button>
              ) : trip.request_status === 'En Route' ? (
                <button 
                  onClick={() => handleAction('Picked')}
                  disabled={actionLoading}
                  style={{ width: '100%', padding: 16, background: '#ff3b30', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <AlertTriangle size={18} /> {actionLoading ? 'Updating...' : 'Patient Picked Up'}
                </button>
              ) : trip.request_status === 'Picked Up' ? (
                <button 
                  onClick={() => handleAction('Arrived')}
                  disabled={actionLoading}
                  style={{ width: '100%', padding: 16, background: '#0a84ff', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Building2 size={18} /> {actionLoading ? 'Updating...' : 'Arrived at Hospital'}
                </button>
              ) : trip.request_status === 'Arrived' ? (
                <button 
                  onClick={() => handleAction('Complete')}
                  disabled={actionLoading}
                  style={{ width: '100%', padding: 16, background: 'var(--green)', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <CheckCircle size={18} /> {actionLoading ? 'Updating...' : 'Complete & Handover'}
                </button>
              ) : null}
            </div>
            
            <div className="section-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(10,132,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}><Clock size={20}/></div>
                <div>
                   <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Dispatched At</div>
                   <div style={{ fontWeight: 600 }}>{new Date(trip.time_dispatched).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            </div>
          </div>

          {/* Right Panel: Map Navigation */}
          <div style={{ flex: 1, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative' }}>
             <MapView 
                pickupCoords={{ lat: trip.patient_lat, lon: trip.patient_lon }} 
                hospitals={[{ hospital_id: 1, name: trip.hospital_name, lat: trip.hospital_lat, lon: trip.hospital_lon, general_beds: 'Destination', icu_beds: 'Secured' }]}
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
