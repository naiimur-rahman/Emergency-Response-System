'use client';
import { useState, useEffect } from 'react';
import { ClipboardList, Clock, ArrowRight } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '@/components/Badges';

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trips').then(r => r.json()).then(setTrips).catch(console.error).finally(() => setLoading(false));
  }, []);

  const formatTime = (ts) => ts ? new Date(ts).toLocaleString() : '—';

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Trip Logs</h2>
          <p className="page-header-sub">{trips.length} recorded dispatches</p>
        </div>
      </div>

      {trips.length > 0 ? (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Trip</th>
                <th>Patient</th>
                <th>Blood</th>
                <th>Severity</th>
                <th>Ambulance</th>
                <th>Driver</th>
                <th>Hospital</th>
                <th>Dispatched</th>
                <th>At Scene</th>
                <th>At Hospital</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.trip_id}>
                  <td style={{ fontWeight: 600 }}>#{t.trip_id}</td>
                  <td>{t.patient_name}</td>
                  <td>{t.blood_type}</td>
                  <td><SeverityBadge level={t.severity_level} /></td>
                  <td>{t.license_plate}</td>
                  <td>{t.driver_name}</td>
                  <td>{t.hospital_name}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatTime(t.time_dispatched)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatTime(t.time_arrived_scene)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatTime(t.time_reached_hospital)}</td>
                  <td><StatusBadge status={t.request_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="section-card">
          <div className="empty-state">
            <ClipboardList size={40} />
            <p>No trip logs yet. Dispatch an emergency to create the first trip record.</p>
          </div>
        </div>
      )}
    </div>
  );
}
