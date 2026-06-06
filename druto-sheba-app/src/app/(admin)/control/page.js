'use client';
import { useCallback, useEffect, useState } from 'react';
import { Save, UserPlus, ShieldBan, Truck, Settings, ClipboardList, RefreshCw } from 'lucide-react';
import { StatusBadge, EquipmentBadge } from '@/components/Badges';
import { useToast } from '@/components/Toast';

export default function AdminControlPage() {
  const toast = useToast();
  const [data, setData] = useState({ users: [], ambulances: [], audit: [], pricing: {} });
  const [userForm, setUserForm] = useState({ username: '', role: 'Dispatcher' });
  const [fleetForm, setFleetForm] = useState({ license_plate: '', equipment_level: 'Basic', hub: 'Central Hub', next_service_date: '' });
  const [pricing, setPricing] = useState({ base_fare: 500, per_km_charge: 25, night_multiplier: 1.35, critical_surcharge: 500 });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/control');
      const json = await res.json();
      setData(json);
      setPricing(json.pricing || pricing);
    } catch {
      toast('Failed to load admin controls.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createUser = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user', ...userForm }),
    });
    if (res.ok) {
      toast('User created. Default password is password123.', 'success');
      setUserForm({ username: '', role: 'Dispatcher' });
      fetchData();
    }
  };

  const updateUser = async (user, patch) => {
    await fetch('/api/admin/control', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user', user_id: user.user_id, ...patch }),
    });
    fetchData();
  };

  const createAmbulance = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ambulance', ...fleetForm }),
    });
    if (res.ok) {
      toast('Ambulance registered.', 'success');
      setFleetForm({ license_plate: '', equipment_level: 'Basic', hub: 'Central Hub', next_service_date: '' });
      fetchData();
    }
  };

  const updateAmbulance = async (vehicle_id, patch) => {
    await fetch('/api/admin/control', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ambulance', vehicle_id, ...patch }),
    });
    fetchData();
  };

  const savePricing = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/control', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pricing', ...pricing }),
    });
    if (res.ok) toast('Pricing engine updated.', 'success');
  };

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Admin Control</h2>
          <p className="page-header-sub">Roles, fleet registry, pricing engine, and audit ledger</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="section-card">
          <div className="section-header"><h3><UserPlus size={16} /> User & Role Management</h3></div>
          <form onSubmit={createUser} className="section-body" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10 }}>
            <input required className="form-input" placeholder="Username" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} />
            <select className="form-input form-select" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
              <option>Dispatcher</option><option>Admin</option>
            </select>
            <button className="btn btn-primary"><UserPlus size={16} /> Add</button>
          </form>
          <div className="section-body" style={{ paddingTop: 0 }}>
            <table>
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{data.users.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.username}</td>
                  <td>
                    <select className="form-input form-select" value={u.role} onChange={e => updateUser(u, { role: e.target.value })} style={{ height: 34, fontSize: 12 }}>
                      <option>Dispatcher</option><option>Admin</option>
                    </select>
                  </td>
                  <td>{u.blocked ? 'Blocked' : 'Active'}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => updateUser(u, { blocked: !u.blocked })}><ShieldBan size={14} /> {u.blocked ? 'Unblock' : 'Block'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="section-card">
          <div className="section-header"><h3><Settings size={16} /> Pricing Engine</h3></div>
          <form onSubmit={savePricing} className="section-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="form-label">Base Fare<input className="form-input" type="number" value={pricing.base_fare || 0} onChange={e => setPricing({ ...pricing, base_fare: e.target.value })} /></label>
            <label className="form-label">Per KM<input className="form-input" type="number" value={pricing.per_km_charge || 0} onChange={e => setPricing({ ...pricing, per_km_charge: e.target.value })} /></label>
            <label className="form-label">Night Multiplier<input className="form-input" type="number" step="0.01" value={pricing.night_multiplier || 1} onChange={e => setPricing({ ...pricing, night_multiplier: e.target.value })} /></label>
            <label className="form-label">Critical Surcharge<input className="form-input" type="number" value={pricing.critical_surcharge || 0} onChange={e => setPricing({ ...pricing, critical_surcharge: e.target.value })} /></label>
            <button className="btn btn-primary" style={{ gridColumn: '1 / -1' }}><Save size={16} /> Save Pricing</button>
          </form>
        </div>
      </div>

      <div className="section-card" style={{ marginTop: 24 }}>
        <div className="section-header"><h3><Truck size={16} /> Fleet Management</h3></div>
        <form onSubmit={createAmbulance} className="section-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10 }}>
          <input required className="form-input" placeholder="License plate" value={fleetForm.license_plate} onChange={e => setFleetForm({ ...fleetForm, license_plate: e.target.value })} />
          <select className="form-input form-select" value={fleetForm.equipment_level} onChange={e => setFleetForm({ ...fleetForm, equipment_level: e.target.value })}>
            <option>Basic</option><option>Advanced</option><option>Basic Life Support</option><option>Advanced Life Support</option><option>ICU Support</option>
          </select>
          <input className="form-input" placeholder="Hub" value={fleetForm.hub} onChange={e => setFleetForm({ ...fleetForm, hub: e.target.value })} />
          <input className="form-input" type="date" value={fleetForm.next_service_date} onChange={e => setFleetForm({ ...fleetForm, next_service_date: e.target.value })} />
          <button className="btn btn-primary">Register</button>
        </form>
        <div className="section-body" style={{ paddingTop: 0 }}>
          <table>
            <thead><tr><th>Plate</th><th>Equipment</th><th>Status</th><th>Hub</th><th>Next Service</th></tr></thead>
            <tbody>{data.ambulances.map((a) => (
              <tr key={a.vehicle_id}>
                <td>{a.license_plate}</td>
                <td><EquipmentBadge level={a.equipment_level} /></td>
                <td>
                  <select className="form-input form-select" value={a.current_status} onChange={e => updateAmbulance(a.vehicle_id, { current_status: e.target.value })} style={{ height: 34, fontSize: 12 }}>
                    <option>Available</option><option>Dispatched</option><option>Maintenance</option><option>Maintenance_Required</option>
                  </select>
                </td>
                <td>{a.hub || 'Central Hub'}</td>
                <td>{a.next_service_date || 'Not set'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="section-card" style={{ marginTop: 24 }}>
        <div className="section-header"><h3><ClipboardList size={16} /> Audit Logs</h3></div>
        <div className="section-body">
          <table>
            <thead><tr><th>Time</th><th>Table</th><th>Operation</th><th>Changed By</th><th>Summary</th></tr></thead>
            <tbody>{(data.audit || []).map((a) => (
              <tr key={a.audit_id}>
                <td>{a.changed_at ? new Date(a.changed_at).toLocaleString() : 'Now'}</td>
                <td>{a.table_name}</td>
                <td><StatusBadge status={a.operation} /></td>
                <td>{a.changed_by || 'system'}</td>
                <td>{a.summary || `${a.operation} on record ${a.record_id}`}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
