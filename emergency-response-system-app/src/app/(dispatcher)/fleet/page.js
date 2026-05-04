'use client';
import { useState, useEffect, useCallback } from 'react';
import { Truck, Users, Plus, ToggleLeft, ToggleRight, Trash2, Search, Wrench } from 'lucide-react';
import { StatusBadge, EquipmentBadge } from '@/components/Badges';
import Modal from '@/components/Modal';

export default function FleetPage() {
  const [ambulances, setAmbulances] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAmbModal, setShowAmbModal] = useState(false);
  const [showDrvModal, setShowDrvModal] = useState(false);
  const [ambForm, setAmbForm] = useState({ license_plate: '', equipment_level: 'Basic' });
  const [drvForm, setDrvForm] = useState({ 
    name: '', 
    license_no: '',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '16:00'
  });

  const fetchData = useCallback(async () => {
    try {
      const [a, d] = await Promise.all([
        fetch('/api/ambulances').then(r => r.json()),
        fetch('/api/drivers').then(r => r.json()),
      ]);
      setAmbulances(Array.isArray(a) ? a : []);
      setDrivers(Array.isArray(d) ? d : []);
    } catch (err) { 
      console.error('Fetch error:', err);
      setAmbulances([]);
      setDrivers([]);
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
  }, [fetchData]);


  const addAmbulance = async () => {
    await fetch('/api/ambulances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ambForm) });
    setShowAmbModal(false);
    setAmbForm({ license_plate: '', equipment_level: 'Basic' });
    fetchData();
  };

  const addDriver = async () => {
    await fetch('/api/drivers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(drvForm) });
    setShowDrvModal(false);
    setDrvForm({ 
      name: '', 
      license_no: '',
      shift_date: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      end_time: '16:00'
    });
    fetchData();
  };

  const removeAmbulance = async (ambulance) => {
    if (!confirm(`Are you sure you want to remove ambulance ${ambulance.license_plate}?`)) return;
    await fetch('/api/ambulances', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehicle_id: ambulance.vehicle_id }) });
    fetchData();
  };

  const toggleShift = async (driver) => {
    const newStatus = driver.shift_status === 'On_Duty' ? 'Off_Duty' : 'On_Duty';
    await fetch('/api/drivers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driver_id: driver.driver_id, shift_status: newStatus }) });
    fetchData();
  };

  const removeDriver = async (driver) => {
    if (!confirm(`Are you sure you want to remove ${driver.name} from the system?`)) return;
    await fetch('/api/drivers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driver_id: driver.driver_id }) });
    fetchData();
  };

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  const filteredAmb = ambulances.filter(a => a.license_plate.toLowerCase().includes(search.toLowerCase()));
  const filteredDrv = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Fleet & Crew Management</h2>
          <p className="page-header-sub">{ambulances.length} ambulances · {drivers.length} drivers</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
            <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', padding: '0 16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <Search size={16} color="var(--text-muted)" />
                <input 
                    type="text" 
                    placeholder="Search fleet..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px 12px', outline: 'none', width: 200 }}
                />
            </div>
        </div>
      </div>

      <div className="content-grid">
        {/* Ambulance Section */}
        <div className="section-card">
          <div className="section-header">
            <h3><Truck size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Ambulances</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAmbModal(true)}><Plus size={14} /> Add</button>
          </div>
          <div style={{ padding: 16 }}>
            <div className="cards-grid" style={{ gridTemplateColumns: '1fr' }}>
              {filteredAmb.map(a => (
                <div className="card" key={a.vehicle_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
                  {a.current_status === 'Maintenance_Required' && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--red)' }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: a.current_status === 'Available' ? 'var(--green)' : a.current_status === 'Dispatched' ? 'var(--blue)' : 'var(--red)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {a.license_plate}
                        {a.current_status === 'Maintenance_Required' && <Wrench size={14} color="var(--red)" />}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.trips_since_maintenance || 0} trips since last service</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <EquipmentBadge level={a.equipment_level} />
                    <StatusBadge status={a.current_status} />
                    <button className="btn-icon" onClick={() => removeAmbulance(a)} title="Remove Ambulance" style={{ color: 'var(--red)', marginLeft: 8 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredAmb.length === 0 && <div className="empty-state" style={{ padding: 20 }}><p>No ambulances found</p></div>}
            </div>
          </div>
        </div>

        {/* Driver Section */}
        <div className="section-card">
          <div className="section-header">
            <h3><Users size={16} style={{ display: 'inline', verticalAlign: -3, marginRight: 8 }} />Drivers</h3>
            <button className="btn btn-blue btn-sm" onClick={() => setShowDrvModal(true)}><Plus size={14} /> Add</button>
          </div>
          <div style={{ padding: 16 }}>
            <div className="cards-grid" style={{ gridTemplateColumns: '1fr' }}>
              {filteredDrv.map(d => (
                <div className="card" key={d.driver_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>License: {d.license_no}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <StatusBadge status={d.shift_status} />
                    <button className="btn-icon" onClick={() => toggleShift(d)} title="Toggle Shift">
                      {d.shift_status === 'On_Duty' ? <ToggleRight size={20} color="var(--green)" /> : <ToggleLeft size={20} />}
                    </button>
                    <button className="btn-icon" onClick={() => removeDriver(d)} title="Remove Driver" style={{ color: 'var(--red)', marginLeft: 8 }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredDrv.length === 0 && <div className="empty-state" style={{ padding: 20 }}><p>No drivers found</p></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showAmbModal} onClose={() => setShowAmbModal(false)} title="Add Ambulance" footer={
        <><button className="btn btn-secondary" onClick={() => setShowAmbModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={addAmbulance} disabled={!ambForm.license_plate}>Add Ambulance</button></>
      }>
        <div className="form-group">
          <label className="form-label">License Plate</label>
          <input className="form-input" placeholder="e.g. DHA-13-5566" value={ambForm.license_plate} onChange={e => setAmbForm({ ...ambForm, license_plate: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Equipment Level</label>
          <select className="form-input form-select" value={ambForm.equipment_level} onChange={e => setAmbForm({ ...ambForm, equipment_level: e.target.value })}>
            <option value="Basic">Basic</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </Modal>

      <Modal isOpen={showDrvModal} onClose={() => setShowDrvModal(false)} title="Add Driver" footer={
        <><button className="btn btn-secondary" onClick={() => setShowDrvModal(false)}>Cancel</button>
          <button className="btn btn-blue" onClick={addDriver} disabled={!drvForm.name || !drvForm.license_no}>Add Driver</button></>
      }>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" placeholder="Enter driver name" value={drvForm.name} onChange={e => setDrvForm({ ...drvForm, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">License Number</label>
          <input className="form-input" placeholder="e.g. BD-DL-12345" value={drvForm.license_no} onChange={e => setDrvForm({ ...drvForm, license_no: e.target.value })} />
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Shift Date</label>
            <input type="date" className="form-input" value={drvForm.shift_date} onChange={e => setDrvForm({ ...drvForm, shift_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Start Time</label>
            <input type="time" className="form-input" value={drvForm.start_time} onChange={e => setDrvForm({ ...drvForm, start_time: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">End Time</label>
          <input type="time" className="form-input" value={drvForm.end_time} onChange={e => setDrvForm({ ...drvForm, end_time: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
