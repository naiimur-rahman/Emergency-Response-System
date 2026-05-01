'use client';
import { useState, useEffect } from 'react';
import { Activity, BarChart3, ShieldAlert, Map } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>System Analytics</h2>
          <p className="page-header-sub">Advanced insights powered by PostGIS & Window Functions</p>
        </div>
      </div>

      <div className="content-grid">
        {/* Hospital Rankings */}
        <div className="section-card">
          <div className="section-header">
            <h3><BarChart3 size={16} /> Hospital ICU Ranking</h3>
          </div>
          <div className="section-body">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Hospital</th>
                  <th>ICU Beds</th>
                </tr>
              </thead>
              <tbody>
                {data.hospitalRank.map((h, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 800, color: i === 0 ? 'var(--yellow)' : 'inherit' }}>#{h.icu_rank}</td>
                    <td>{h.name}</td>
                    <td>{h.icu_beds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spatial Zone Analysis */}
        <div className="section-card">
          <div className="section-header">
            <h3><Map size={16} /> Emergencies by Zone</h3>
          </div>
          <div className="section-body">
            <table>
              <thead>
                <tr>
                  <th>Zone Name</th>
                  <th>Request Count</th>
                </tr>
              </thead>
              <tbody>
                {data.zoneAnalysis.map((z, i) => (
                  <tr key={i}>
                    <td>{z.zone_name}</td>
                    <td style={{ fontWeight: 700 }}>{z.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Maintenance Running Totals */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header">
            <h3><Activity size={16} /> Maintenance Cost Tracking (Running Totals)</h3>
          </div>
          <div className="section-body">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Service Type</th>
                  <th>Cost</th>
                  <th>Running Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.maintenanceStats.map((m, i) => (
                  <tr key={i}>
                    <td>{m.license_plate}</td>
                    <td>{m.maintenance_type}</td>
                    <td>৳{m.cost}</td>
                    <td style={{ fontWeight: 700, color: 'var(--blue)' }}>৳{m.running_total}</td>
                    <td>{new Date(m.date_started).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header">
            <h3><ShieldAlert size={16} /> Low Inventory Critical Alerts</h3>
          </div>
          <div className="section-body">
            <div className="cards-grid">
              {data.inventoryAlerts.map((v, i) => (
                <div className="card" key={i} style={{ borderColor: v.status === 'LOW' ? 'var(--red)' : 'var(--border-subtle)' }}>
                   <div className="card-header">
                      <span className="card-title">{v.item_name}</span>
                      <span className={`badge ${v.status === 'LOW' ? 'badge-critical' : 'badge-low'}`}>{v.status}</span>
                   </div>
                   <div className="card-body">
                      <div className="card-row">
                        <span className="card-row-label">Ambulance</span>
                        <span className="card-row-value">{v.license_plate}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-row-label">Stock Left</span>
                        <span className="card-row-value" style={{ color: v.status === 'LOW' ? 'var(--red)' : 'inherit' }}>{v.quantity} units</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
