'use client';
import { useState, useEffect } from 'react';
import { FileText, MapPin, Download, CheckCircle, Clock } from 'lucide-react';
import { SeverityBadge } from '@/components/Badges';

export default function PatientHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/patient/history')
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      });
  }, []);
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Emergency History</h2>
          <p className="page-header-sub">Review your past ambulance requests and invoices</p>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr' }}>
        {loading ? <div className="loading-container" style={{ minHeight: 200 }}><div className="spinner" /></div> : history.map((trip) => (
          <div key={trip.id} className="section-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'transform 0.2s' }}>
            
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
               <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(48,209,88,0.1)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                 <CheckCircle size={24} />
               </div>
               <div>
                 <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>Trip #{trip.id}</h3>
                    <SeverityBadge level={trip.severity} />
                 </div>
                 <div style={{ display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14}/> {trip.date}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={14}/> {trip.from} → {trip.hospital}</span>
                 </div>
               </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
               <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Total Fare</div>
                 <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{trip.fare}</div>
               </div>
               <button className="btn btn-secondary btn-sm" style={{ padding: '8px 16px' }} title="Download Invoice">
                 <Download size={16} /> Invoice
               </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
