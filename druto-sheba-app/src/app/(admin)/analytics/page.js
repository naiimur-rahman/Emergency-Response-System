'use client';
import {  useState, useEffect , useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Activity, BarChart3, ShieldAlert, Map, TrendingUp, Star, MessageSquare, Clock, Server, Wifi, Cpu, Database } from 'lucide-react';

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

const ResponseTimeChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => parseInt(d.count)), 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, height: 100, alignItems: 'flex-end', padding: '10px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: '100%', height: `${(parseInt(d.count) / maxVal) * 80}px`, background: 'var(--blue)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
             <div style={{ position: 'absolute', top: -20, width: '100%', textAlign: 'center', fontSize: 10, fontWeight: 700 }}>{d.count}</div>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{d.range}</div>
        </div>
      ))}
    </div>
  );
};

const SpecDistChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const total = data.reduce((acc, curr) => acc + parseInt(curr.count), 0);
  let cumulative = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ width: 100, height: 100, borderRadius: '50%', background: `conic-gradient(${data.map((d, i) => {
        const start = cumulative;
        const end = cumulative + (parseInt(d.count) / total) * 100;
        cumulative = end;
        return `${i === 0 ? 'var(--blue)' : i === 1 ? 'var(--orange)' : i === 2 ? 'var(--green)' : 'var(--red)'} ${start}% ${end}%`;
      }).join(', ')})` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: i === 0 ? 'var(--blue)' : i === 1 ? 'var(--orange)' : i === 2 ? 'var(--green)' : 'var(--red)' }} />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{d.spec} ({Math.round((parseInt(d.count)/total)*100)}%)</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SystemHealthMonitor = () => {
  const [health, setHealth] = useState(null);

  const fetchHealth = useCallback(() => {
    fetch(`/api/admin/health?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  useAutoRefresh(fetchHealth);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (!health) return null;

  return (
    <div className="section-card" style={{ marginBottom: 24, background: 'linear-gradient(90deg, rgba(10,132,255,0.05) 0%, rgba(10,132,255,0) 100%)', borderLeft: '4px solid var(--blue)' }}>
      <div className="section-header" style={{ padding: '16px 24px', borderBottom: 'none' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Server size={18} color="var(--blue)" /> Live System Health</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
             <span className="pulse-dot" style={{ background: health.status === 'Healthy' ? 'var(--green)' : 'var(--red)' }} />
             {health.status}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated: {new Date(health.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '0 24px 20px' }}>
        <div style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Wifi size={24} color="var(--green)" opacity={0.8} />
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Connections</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{health.activeConnections}</div>
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Cpu size={24} color="var(--orange)" opacity={0.8} />
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Server Uptime</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</div>
          </div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Database size={24} color="var(--blue)" opacity={0.8} />
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>DB Latency</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: health.latency < 500 ? 'var(--text-primary)' : 'var(--red)' }}>{health.latency}ms</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  const emptyData = {
    hospitalRank: [], zoneAnalysis: [], maintenanceStats: [],
    inventoryAlerts: [], costTrend: [], recentReviews: [],
    responseTime: [], specDist: [], requestTrend: [],
  };
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(() => {
      fetch(`/api/analytics?t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(json => setData({ ...emptyData, ...json }))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []);

  useAutoRefresh(fetchAnalytics);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>System Analytics</h2>
          <p className="page-header-sub">Advanced insights powered by PostGIS & Window Functions</p>
        </div>
      </div>

      <SystemHealthMonitor />

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Total Service Cost</div>
          <div className="stat-card-value">৳{data?.maintenanceStats?.reduce((acc, curr) => acc + parseFloat(curr.cost), 0).toLocaleString() || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg Requests/Zone</div>
          <div className="stat-card-value">{(data?.zoneAnalysis?.reduce((acc, curr) => acc + parseInt(curr.count), 0) / (data?.zoneAnalysis?.length || 1)).toFixed(1) || 0}</div>
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
                {(data.hospitalRank || []).map((h, i) => (
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

        {/* Response Time Breakdown */}
        <div className="section-card">
          <div className="section-header">
            <h3><Clock size={16} /> Response Time Distribution</h3>
          </div>
          <div className="section-body" style={{ padding: 20 }}>
            <ResponseTimeChart data={data.responseTime} />
          </div>
        </div>

        {/* Medical Distribution */}
        <div className="section-card">
          <div className="section-header">
            <h3><Activity size={16} /> Medical Specialization</h3>
          </div>
          <div className="section-body" style={{ padding: 20 }}>
            <SpecDistChart data={data?.specDist} />
          </div>
        </div>

        {/* Weekly Volume Trend */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header">
            <h3><TrendingUp size={16} /> Weekly Request Volume</h3>
          </div>
          <div className="section-body" style={{ padding: '20px 40px' }}>
             {/* Simple SVG Trend for Analytics */}
             {data?.requestTrend && (
               <div style={{ height: 160, width: '100%' }}>
                 <svg width="100%" height="160" viewBox="0 0 800 160" preserveAspectRatio="none">
                    <path 
                      d={data.requestTrend.map((t, i) => `${i===0?'M':'L'} ${i * (800/(data.requestTrend.length-1))} ${160 - (parseInt(t.count)/(Math.max(...data.requestTrend.map(x=>parseInt(x.count)), 1)||1) * 120 + 20)}`).join(' ')}
                      fill="none" stroke="var(--blue)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                    />
                    {data.requestTrend.map((t, i) => (
                      <g key={i}>
                        <circle cx={i * (800/(data.requestTrend.length-1))} cy={160 - (parseInt(t.count)/(Math.max(...data.requestTrend.map(x=>parseInt(x.count)), 1)||1) * 120 + 20)} r="5" fill="var(--blue)" />
                        <text x={i * (800/(data.requestTrend.length-1))} y="155" textAnchor="middle" style={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 800 }}>{t.day}</text>
                      </g>
                    ))}
                 </svg>
               </div>
             )}
          </div>
        </div>

        {/* Cost Trend Graph */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header">
            <h3><TrendingUp size={16} /> Maintenance Spending Trend</h3>
          </div>
          <div className="section-body" style={{ padding: 20 }}>
            <CostTrendGraph data={data?.costTrend} />
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
                {data?.maintenanceStats?.map((m, i) => (
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
              {data?.inventoryAlerts?.map((v, i) => (
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
        {/* Recent Feedback */}
        <div className="section-card" style={{ gridColumn: '1 / -1' }}>
          <div className="section-header">
            <h3><MessageSquare size={16} /> Recent Patient Feedback</h3>
          </div>
          <div className="section-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, padding: 24 }}>
              {data?.recentReviews?.map((r, i) => (
                <div key={i} className="glass" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{r.patient_name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Trip #{r.trip_id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} size={14} fill={idx < r.rating ? 'var(--yellow)' : 'none'} stroke={idx < r.rating ? 'var(--yellow)' : 'var(--text-muted)'} />
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>"{r.comments || 'No comments left.'}"</p>
                  <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {new Date(r.submitted_at).toLocaleDateString()} {new Date(r.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              ))}
              {(data.recentReviews?.length === 0) && (
                <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '40px 0', color: 'var(--text-muted)' }}>
                  No feedback received yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
