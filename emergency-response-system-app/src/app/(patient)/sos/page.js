'use client';
import { useState, useEffect, useRef } from 'react';
import { Phone, MapPin, Navigation, Siren, Clock, Building2, Truck, Banknote, ShieldAlert, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function SOSPage() {
  const [phase, setPhase] = useState('ready'); // ready | locating | form | dispatching | result
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', blood_type: '', severity: 'Critical' });
  const [result, setResult] = useState(null);
  const pulseRef = useRef(null);

  const getLocation = () => {
    setPhase('locating');
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setPhase('ready');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setPhase('form');
      },
      (err) => {
        // Fallback to Dhaka center for demo
        setLocation({ lat: 23.7750, lon: 90.4100 });
        setPhase('form');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPhase('dispatching');
    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...location }),
      });
      const data = await res.json();
      setResult(data);
      setPhase('result');
    } catch (err) {
      setLocationError('Network error. Try again.');
      setPhase('form');
    }
  };

  return (
    <div className="page-container">
      <style>{`
        .sos-wrapper {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 70vh; gap: 30px; text-align: center;
        }
        .sos-btn {
          width: 220px; height: 220px; border-radius: 50%; border: none; cursor: pointer;
          background: radial-gradient(circle, #ff2d55 0%, #cc0033 70%);
          color: white; font-size: 28px; font-weight: 900; letter-spacing: 4px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          box-shadow: 0 0 0 0 rgba(255,45,85,0.7);
          animation: sosPulse 1.5s infinite;
          transition: transform 0.2s;
          position: relative; z-index: 2;
        }
        .sos-btn:hover { transform: scale(1.08); }
        .sos-btn:active { transform: scale(0.95); }
        .sos-btn .sos-icon { font-size: 48px; }
        @keyframes sosPulse {
          0% { box-shadow: 0 0 0 0 rgba(255,45,85,0.7); }
          70% { box-shadow: 0 0 0 40px rgba(255,45,85,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,45,85,0); }
        }
        .sos-ring {
          position: absolute; width: 280px; height: 280px; border-radius: 50%;
          border: 2px solid rgba(255,45,85,0.2); top: 50%; left: 50%;
          transform: translate(-50%, -50%); z-index: 1;
          animation: ringPulse 2s infinite; pointer-events: none;
        }
        .sos-ring-2 { width: 340px; height: 340px; animation-delay: 0.5s; }
        @keyframes ringPulse {
          0% { opacity: 0.8; transform: translate(-50%, -50%) scale(0.9); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
        }
        .sos-subtitle { color: var(--text-muted); font-size: 14px; max-width: 300px; }

        .sos-form { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 16px; }
        .sos-form .form-row { display: flex; gap: 12px; }
        .sos-form .form-row > * { flex: 1; }
        .sos-input-group { display: flex; flex-direction: column; gap: 6px; text-align: left; }
        .sos-input-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; }
        .sos-input-group input, .sos-input-group select {
          padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border-subtle);
          border-radius: 10px; color: var(--text-primary); font-size: 15px; outline: none;
          transition: border-color 0.2s;
        }
        .sos-input-group input:focus, .sos-input-group select:focus { border-color: var(--red); }

        .severity-pills { display: flex; gap: 8px; }
        .severity-pill {
          flex: 1; padding: 10px; border-radius: 10px; border: 1px solid var(--border-subtle);
          background: var(--bg-card); color: var(--text-muted); cursor: pointer; text-align: center;
          font-size: 13px; font-weight: 600; transition: all 0.2s;
        }
        .severity-pill.active-critical { background: rgba(255,45,85,0.15); border-color: var(--red); color: var(--red); }
        .severity-pill.active-high { background: rgba(255,159,10,0.15); border-color: var(--yellow); color: var(--yellow); }
        .severity-pill.active-medium { background: rgba(10,132,255,0.15); border-color: var(--blue); color: var(--blue); }

        .sos-location-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
          background: rgba(48,209,88,0.1); border: 1px solid rgba(48,209,88,0.3);
          border-radius: 20px; color: var(--green); font-size: 13px; font-weight: 500;
        }

        .sos-submit-btn {
          padding: 16px; background: var(--red); color: white; border: none; border-radius: 12px;
          font-size: 16px; font-weight: 700; cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 10px; letter-spacing: 1px; transition: all 0.2s;
        }
        .sos-submit-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .sos-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .sos-result { width: 100%; max-width: 520px; }
        .sos-result-header {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 30px; margin-bottom: 20px;
        }
        .sos-result-header .check-icon {
          width: 70px; height: 70px; border-radius: 50%;
          background: rgba(48,209,88,0.15); display: flex; align-items: center;
          justify-content: center; animation: checkPop 0.5s ease;
        }
        @keyframes checkPop {
          0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); }
        }
        .sos-result-header h2 { color: var(--green); font-size: 22px; }
        .sos-result-header p { color: var(--text-muted); font-size: 14px; }
        .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .result-card {
          padding: 20px; background: var(--bg-card); border: 1px solid var(--border-subtle);
          border-radius: 14px; display: flex; flex-direction: column; gap: 8px;
        }
        .result-card-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
        .result-card-value { font-size: 20px; font-weight: 700; color: var(--text-primary); }
        .result-card-sub { font-size: 12px; color: var(--text-secondary); }
        .result-card.highlight { border-color: var(--green); background: rgba(48,209,88,0.05); }
        .result-card.fare { border-color: var(--blue); background: rgba(10,132,255,0.05); }
        .fare-value { color: var(--blue) !important; font-size: 28px !important; }

        .dispatching-anim {
          display: flex; flex-direction: column; align-items: center; gap: 20px;
        }
        .dispatching-anim .spin-icon { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .sos-btn { width: 180px; height: 180px; font-size: 22px; }
          .sos-form .form-row { flex-direction: column; }
          .result-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="sos-wrapper">
        {/* PHASE 1: READY — Giant SOS Button */}
        {phase === 'ready' && (
          <>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>Emergency SOS</h2>
            <p className="sos-subtitle">Press the button to share your location and request an ambulance instantly</p>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="sos-ring" />
              <div className="sos-ring sos-ring-2" />
              <button className="sos-btn" onClick={getLocation}>
                <Siren size={48} />
                SOS
              </button>
            </div>
            {locationError && <p style={{ color: 'var(--red)', fontSize: 13 }}>{locationError}</p>}
          </>
        )}

        {/* PHASE 2: LOCATING */}
        {phase === 'locating' && (
          <div className="dispatching-anim">
            <Navigation size={48} className="spin-icon" style={{ color: 'var(--blue)' }} />
            <h3 style={{ color: 'var(--text-primary)' }}>Fetching your location...</h3>
            <p className="sos-subtitle">Please allow location access when prompted</p>
          </div>
        )}

        {/* PHASE 3: QUICK FORM */}
        {phase === 'form' && (
          <>
            <div className="sos-location-badge">
              <MapPin size={14} />
              Location: {location?.lat.toFixed(4)}, {location?.lon.toFixed(4)}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Quick Details</h2>
            <form className="sos-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="sos-input-group">
                  <label>Your Name</label>
                  <input required placeholder="Full name" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="sos-input-group">
                  <label>Phone</label>
                  <input required placeholder="01XXXXXXXXX" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="sos-input-group">
                  <label>Blood Type</label>
                  <select value={form.blood_type} onChange={e => setForm(f => ({ ...f, blood_type: e.target.value }))}>
                    <option value="">Unknown</option>
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>O+</option><option>O-</option><option>AB+</option><option>AB-</option>
                  </select>
                </div>
              </div>
              <div className="sos-input-group">
                <label>Severity</label>
                <div className="severity-pills">
                  {['Critical', 'High', 'Medium'].map(s => (
                    <div key={s}
                      className={`severity-pill ${form.severity === s ? `active-${s.toLowerCase()}` : ''}`}
                      onClick={() => setForm(f => ({ ...f, severity: s }))}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
              <button type="submit" className="sos-submit-btn">
                <Siren size={20} /> REQUEST AMBULANCE NOW
              </button>
            </form>
          </>
        )}

        {/* PHASE 4: DISPATCHING ANIMATION */}
        {phase === 'dispatching' && (
          <div className="dispatching-anim">
            <Loader2 size={56} className="spin-icon" style={{ color: 'var(--red)' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: 20 }}>Dispatching Emergency...</h3>
            <p className="sos-subtitle">Finding nearest ambulance and hospital using PostGIS spatial analysis</p>
          </div>
        )}

        {/* PHASE 5: RESULT */}
        {phase === 'result' && result && (
          <div className="sos-result">
            <div className="sos-result-header">
              <div className="check-icon">
                <CheckCircle size={36} style={{ color: 'var(--green)' }} />
              </div>
              <h2>{result.dispatched ? 'Ambulance Dispatched!' : 'Request Created'}</h2>
              <p>Request #{result.request_id} — {result.dispatch_message}</p>
            </div>

            <div className="result-grid">
              <div className="result-card highlight">
                <span className="result-card-label"><Truck size={14} /> Ambulance</span>
                <span className="result-card-value">{result.ambulance}</span>
                <span className="result-card-sub">En route to your location</span>
              </div>
              <div className="result-card highlight">
                <span className="result-card-label"><Clock size={14} /> ETA</span>
                <span className="result-card-value">{result.eta_minutes} min</span>
                <span className="result-card-sub">Estimated arrival</span>
              </div>
              <div className="result-card">
                <span className="result-card-label"><Building2 size={14} /> Hospital</span>
                <span className="result-card-value" style={{ fontSize: 16 }}>{result.nearest_hospital}</span>
                <span className="result-card-sub">{result.distance_km} km away</span>
              </div>
              <div className="result-card fare">
                <span className="result-card-label"><Banknote size={14} /> Estimated Fare</span>
                <span className="result-card-value fare-value">৳{result.estimated_fare}</span>
                <span className="result-card-sub">Base ৳500 + ৳25/km + surcharge</span>
              </div>
            </div>

            <button className="sos-submit-btn" style={{ marginTop: 24, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              onClick={() => { setPhase('ready'); setResult(null); setForm({ name: '', phone: '', blood_type: '', severity: 'Critical' }); }}>
              <AlertTriangle size={18} /> New Emergency
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
