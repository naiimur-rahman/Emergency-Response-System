'use client';
import { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function Schedule() {
  const { activeDriver } = useUser();
  if (!activeDriver) return null;
  const [data, setData] = useState({ hours: '0 hrs', nextShift: '-', shifts: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!activeDriver?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/driver/schedule?driver_id=${activeDriver.id}`);
      const resData = await res.json();
      setData({
         hours: (resData.shifts.length * 8) + ' hrs',
         nextShift: resData.shifts.length > 0 ? 'Upcoming' : '-',
         shifts: resData.shifts
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeDriver]);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, [fetchData]);


  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Shift Schedule</h2>
          <p className="page-header-sub">View your upcoming shifts and working hours</p>
        </div>
        <button className="btn btn-secondary"><CalendarIcon size={16} /> Sync to Phone</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="section-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(10,132,255,0.1)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Hours This Week</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{data.hours}</div>
          </div>
        </div>
        <div className="section-card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, borderColor: 'rgba(255,159,10,0.3)', background: 'linear-gradient(to right, rgba(255,159,10,0.05), transparent)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,159,10,0.1)', color: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--yellow)' }}>Next Shift Starts In</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{data.nextShift}</div>
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Shift</th>
              <th>Time</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>Loading...</td></tr> : data.shifts.map((s, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 600 }}>{s.day}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.date}</div>
                </td>
                <td>
                  <span className={`badge ${s.shift === 'Off' ? 'badge-low' : s.shift === 'Night' ? 'badge-critical' : 'badge-active'}`}>
                    {s.shift}
                  </span>
                </td>
                <td style={{ color: s.shift === 'Off' ? 'var(--text-muted)' : 'inherit' }}>{s.time}</td>
                <td>{s.type}</td>
                <td style={{ color: 'var(--text-muted)' }}>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
