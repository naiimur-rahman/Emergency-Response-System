'use client';
import { useState } from 'react';
import { Database, Play, AlertCircle, Map, Activity, Shield } from 'lucide-react';

const queries = [
  { id: 'dispatch', title: 'Specialization-Aware Dispatch', icon: Activity, desc: 'Finds the BEST hospital for a specific patient condition using Advanced Joins, ILIKE matching, PostGIS Distance, and Ranking.' },
  { id: 'maintenance', title: 'Predictive Maintenance Alerts', icon: AlertCircle, desc: 'Identifies vehicles at risk of breakdown using Window Functions, CASE logic, and Fleet Analytics.' },
  { id: 'zones', title: 'Zone-Based Emergency Black Spots', icon: Map, desc: 'Determines where to station more ambulances using PostGIS ST_Contains, Spatial Joins, and Density Ranking.' },
  { id: 'audit', title: 'Full Audit Trail Analysis', icon: Shield, desc: 'Analyzes JSONB audit logs to track state transitions and detect tampering.' }
];

export default function AdminQueriesPage() {
  const [activeQuery, setActiveQuery] = useState(queries[0].id);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runQuery = async (queryId) => {
    setActiveQuery(queryId);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryName: queryId })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Live SQL Query Showcase</h2>
          <p className="page-header-sub">Execute complex DBMS operations directly against the PostgreSQL engine</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {queries.map((q) => {
            const Icon = q.icon;
            const isActive = activeQuery === q.id;
            return (
              <div 
                key={q.id} 
                className={`card ${isActive ? 'active-card' : ''}`}
                style={{ 
                  cursor: 'pointer', padding: '16px', borderRadius: '12px', 
                  border: isActive ? '2px solid var(--blue)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'var(--bg-secondary)' : 'var(--bg-primary)'
                }}
                onClick={() => runQuery(q.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <Icon size={20} color={isActive ? 'var(--blue)' : 'var(--text-secondary)'} />
                  <h3 style={{ margin: 0, fontSize: '16px', color: isActive ? 'var(--blue)' : 'var(--text-primary)' }}>{q.title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{q.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="section-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3><Database size={16} /> PostgreSQL Execution Engine</h3>
            {activeQuery && (
              <button 
                onClick={() => runQuery(activeQuery)} 
                disabled={loading}
                className="btn btn-primary btn-sm"
              >
                <Play size={14} /> {loading ? 'Executing...' : 'Run Query Live'}
              </button>
            )}
          </div>
          <div className="section-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {result ? (
              <>
                <div style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '16px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', overflowX: 'auto' }}>
                  <div style={{ color: '#569cd6', marginBottom: '8px' }}>-- Executed SQL</div>
                  <pre style={{ margin: 0 }}>{result.sql?.trim()}</pre>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  {result.rows?.length > 0 ? (
                    <table style={{ width: '100%', fontSize: '14px' }}>
                      <thead>
                        <tr>
                          {Object.keys(result.rows[0]).map(k => (
                            <th key={k} style={{ padding: '8px', borderBottom: '2px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} style={{ padding: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                                {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                     <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Query returned 0 rows.</div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', flexDirection: 'column', gap: '12px' }}>
                <Database size={48} style={{ opacity: 0.2 }} />
                <p>Select a query on the left to execute it directly against the Supabase database.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
