'use client';
import { useState, useEffect } from 'react';
import { Activity, BarChart3, ShieldAlert, Map, TrendingUp } from 'lucide-react';

const CostTrendGraph = ({ data }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => parseFloat(d.total_cost)), 1000);
  const width = 400;
  const height = 180;
  const padding = 30;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  const points = data.map((d, i) => ({
    x: padding + (i * (chartWidth / (data.length - 1 || 1))),
    y: height - padding - ((parseFloat(d.total_cost) / maxVal) * chartHeight)
  }));

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ width: '100%', padding: '20px 0' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <path d={pathData} fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--blue)" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.day}</span>
        ))}
      </div>
    </div>
  );
};

const ZoneBarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => parseInt(d.count)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 0' }}>
      {data.map((z, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 80, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{z.zone_name}</div>
          <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${(parseInt(z.count) / maxVal) * 100}%`, height: '100%', background: i === 0 ? 'var(--red)' : 'var(--blue)', borderRadius: 6 }} />
          </div>
          <div style={{ width: 30, fontSize: 11, fontWeight: 700 }}>{z.count}</div>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = () => {
      fetch('/api/analytics').then(r => r.json()).then(setData).finally(() => setLoading(false));
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
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

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Service Cost</div>
          <div className="stat-card-value">৳{data.maintenanceStats.reduce((acc, curr) => acc + parseFloat(curr.cost), 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg Requests/Zone</div>
          <div className="stat-card-value">{(data.zoneAnalysis.reduce((acc, curr) => acc + parseInt(curr.count), 0) / (data.zoneAnalysis.length || 1)).toFixed(1)}</div>
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
          <div className="section-body" style={{ padding: 20 }}>
            <ZoneBarChart data={data.zoneAnalysis} />
          </div>
        </div>

        {/* Cost Trend Graph */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header">
            <h3><TrendingUp size={16} /> Maintenance Spending Trend</h3>
          </div>
          <div className="section-body" style={{ padding: 20 }}>
            <CostTrendGraph data={data.costTrend} />
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
