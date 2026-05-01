'use client';
import { useState, useEffect } from 'react';
import { History, Star, Clock, MapPin, Banknote } from 'lucide-react';
import { SeverityBadge } from '@/components/Badges';
import { useUser } from '@/lib/UserContext';

export default function DriverHistory() {
  const { activeDriver } = useUser();
  const [data, setData] = useState({ earnings: '৳0', rating: 0, trips: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeDriver?.id) {
      setLoading(true);
      fetch(`/api/driver/history?driver_id=${activeDriver.id}`)
        .then(res => res.json())
        .then(resData => {
          setData(resData);
          setLoading(false);
        });
    }
  }, [activeDriver]);
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Trip History</h2>
          <p className="page-header-sub">Review your past completed emergency dispatches</p>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Earnings</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)' }}>{data.earnings}</div>
           </div>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Average Rating</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>{data.rating} <Star size={16} fill="currentColor" /></div>
           </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Date & Time</th>
              <th>Patient</th>
              <th>Route</th>
              <th>Duration</th>
              <th>Earnings</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Loading...</td></tr> : data.trips.map((trip) => (
              <tr key={trip.id}>
                <td style={{ fontWeight: 600 }}>#{trip.id}</td>
                <td>{trip.date}</td>
                <td>{trip.patient}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 13 }}>{trip.from} → {trip.to}</span>
                  </div>
                </td>
                <td><Clock size={12} style={{ display: 'inline', marginRight: 4, color: 'var(--text-muted)' }} />{trip.time}</td>
                <td style={{ fontWeight: 600, color: 'var(--green)' }}>{trip.fare}</td>
                <td>
                  <div style={{ display: 'flex', gap: 2, color: 'var(--yellow)' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill={i < trip.rating ? 'currentColor' : 'none'} opacity={i < trip.rating ? 1 : 0.3} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
