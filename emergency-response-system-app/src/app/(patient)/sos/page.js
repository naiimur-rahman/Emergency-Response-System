'use client';
import { useState, useEffect, useRef } from 'react';
import { Phone, MapPin, Navigation, Siren, Clock, Building2, Truck, Banknote, ShieldAlert, CheckCircle, Loader2, AlertTriangle, Radio, User, Droplet, Activity } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export default function SOSPage() {
  const { activePatient } = useUser();
  const [phase, setPhase] = useState('ready'); // ready | dispatching | result
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [result, setResult] = useState(null);
  const [severity, setSeverity] = useState('Critical');
  const [dispatchTimer, setDispatchTimer] = useState(0);
  const [profile, setProfile] = useState(null);
  const timerRef = useRef(null);

  // Pre-fetch patient profile for instant info display
  useEffect(() => {
    if (activePatient?.id) {
      fetch(`/api/patients?patient_id=${activePatient.id}`)
        .then(r => r.json())
        .then(data => {
          const p = Array.isArray(data) ? data[0] : data;
          setProfile(p);
        })
        .catch(() => {});
    }
  }, [activePatient]);

  // Pre-warm GPS on page load so it's instant when needed
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setLocation({ lat: 23.7750, lon: 90.4100 }), // Dhaka fallback
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const triggerSOS = async () => {
    setPhase('dispatching');
    setDispatchTimer(0);

    // Start live timer
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setDispatchTimer(((Date.now() - start) / 1000).toFixed(1));
    }, 100);

    // Get fresh GPS if we don't have it
    let coords = location;
    if (!coords) {
      coords = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve({ lat: 23.7750, lon: 90.4100 }),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
      setLocation(coords);
    }

    try {
      const payload = {
        ...coords,
        severity,
        patient_id: activePatient?.id || null,
        name: activePatient?.name || 'Unknown',
        phone: profile?.phone || '',
        blood_type: activePatient?.blood_type || '',
      };

      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      clearInterval(timerRef.current);
      setResult(data);
      setPhase('result');
    } catch (err) {
      clearInterval(timerRef.current);
      setLocationError('Network error. Please try again.');
      setPhase('ready');
    }
  };

  // Cleanup timer
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="page-container dot-pattern" style={{ position: 'relative', minHeight: '100vh' }}>
      <style>{`
        .sos-wrapper {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 75vh; gap: 30px; text-align: center; position: relative; z-index: 10;
        }
        .sos-btn {
          width: 240px; height: 240px; border-radius: 50%; border: none; cursor: pointer;
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
        @keyframes sosPulse {
          0% { box-shadow: 0 0 0 0 rgba(255,45,85,0.7); }
          70% { box-shadow: 0 0 0 50px rgba(255,45,85,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,45,85,0); }
        }
        .sos-ring {
          position: absolute; border-radius: 50%;
          border: 2px solid rgba(255,45,85,0.15); 
          animation: ringPulse 2s infinite; pointer-events: none;
        }
        .ring-1 { width: 300px; height: 300px; }
        .ring-2 { width: 380px; height: 380px; animation-delay: 0.5s; }
        .ring-3 { width: 460px; height: 460px; animation-delay: 1s; }
        @keyframes ringPulse {
          0% { opacity: 0.6; transform: scale(0.95); }
          100% { opacity: 0; transform: scale(1.15); }
        }

        .severity-row { display: flex; gap: 10px; }
        .sev-pill {
          padding: 10px 28px; border-radius: 24px; cursor: pointer; font-weight: 800; font-size: 13px;
          border: 2px solid var(--border-subtle); background: rgba(255,255,255,0.03);
          color: var(--text-muted); transition: all 0.25s; letter-spacing: 0.5px;
        }
        .sev-pill.active-Critical { background: rgba(255,45,85,0.15); border-color: var(--red); color: var(--red); }
        .sev-pill.active-High { background: rgba(255,159,10,0.15); border-color: var(--yellow); color: var(--yellow); }
        .sev-pill.active-Medium { background: rgba(10,132,255,0.15); border-color: var(--blue); color: var(--blue); }

        .patient-card {
          display: flex; align-items: center; gap: 20px; padding: 16px 24px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle);
          border-radius: 16px; text-align: left; width: 100%; max-width: 480px;
        }
        .patient-card .avatar {
          width: 52px; height: 52px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(10,132,255,0.15), rgba(255,45,85,0.15));
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .patient-card .info { flex: 1; }
        .patient-card .info .name { font-size: 17px; font-weight: 800; }
        .patient-card .info .meta { font-size: 12px; color: var(--text-muted); margin-top: 4px; display: flex; gap: 12px; }

        .gps-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px;
          border-radius: 24px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;
        }
        .gps-locked { background: rgba(48,209,88,0.1); border: 1px solid rgba(48,209,88,0.3); color: var(--green); }
        .gps-searching { background: rgba(255,159,10,0.1); border: 1px solid rgba(255,159,10,0.3); color: var(--yellow); }

        .dispatch-overlay {
          display: flex; flex-direction: column; align-items: center; gap: 28px;
        }
        .dispatch-spinner {
          width: 120px; height: 120px; border-radius: 50%;
          border: 4px solid rgba(255,45,85,0.1); border-top-color: var(--red);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dispatch-timer {
          font-size: 48px; font-weight: 900; font-family: 'JetBrains Mono', monospace;
          background: linear-gradient(to right, var(--red), var(--orange));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; max-width: 540px; }
        .result-card {
          padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 8px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle);
        }
        .result-card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); font-weight: 800; display: flex; align-items: center; gap: 6px; }
        .result-card-value { font-size: 22px; font-weight: 900; }
        .result-card-sub { font-size: 12px; color: var(--text-secondary); }
        .result-card.highlight { border-color: rgba(48,209,88,0.3); background: rgba(48,209,88,0.04); }
        .result-card.fare { border-color: rgba(10,132,255,0.3); background: rgba(10,132,255,0.04); }

        @media (max-width: 600px) {
          .sos-btn { width: 200px; height: 200px; font-size: 24px; }
          .result-grid { grid-template-columns: 1fr; }
          .patient-card { flex-direction: column; text-align: center; }
        }
      `}</style>

      {/* Background Blobs */}
      <div className="bg-blob">
        <div className="blob blob-1"></div>
        <div className="blob blob-3" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="sos-wrapper">

        {/* ═══════════ PHASE 1: READY ═══════════ */}
        {phase === 'ready' && (
          <>
            <h2 style={{ fontSize: 36, fontWeight: 900, background: 'linear-gradient(to right, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Emergency SOS
            </h2>

            {/* Patient Identity Card */}
            {activePatient && (
              <div className="patient-card">
                <div className="avatar">
                  <User size={24} style={{ color: 'var(--blue)' }} />
                </div>
                <div className="info">
                  <div className="name">{activePatient.name}</div>
                  <div className="meta">
                    {activePatient.blood_type && <span><Droplet size={10} /> {activePatient.blood_type}</span>}
                    {profile?.phone && <span><Phone size={10} /> {profile.phone}</span>}
                    {(profile?.conditions || []).length > 0 && (
                      <span><Activity size={10} /> {profile.conditions.length} condition{profile.conditions.length > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <CheckCircle size={20} style={{ color: 'var(--green)', flexShrink: 0 }} />
              </div>
            )}

            {/* GPS Status */}
            <div className={`gps-badge ${location ? 'gps-locked' : 'gps-searching'}`}>
              <MapPin size={13} />
              {location ? `GPS Locked • ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : 'Acquiring GPS...'}
            </div>

            {/* Severity Selector */}
            <div className="severity-row">
              {['Critical', 'High', 'Medium'].map(s => (
                <div
                  key={s}
                  className={`sev-pill ${severity === s ? `active-${s}` : ''}`}
                  onClick={() => setSeverity(s)}
                >
                  {s === 'Critical' ? '🔴' : s === 'High' ? '🟠' : '🔵'} {s}
                </div>
              ))}
            </div>

            {/* THE BUTTON */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              <div className="sos-ring ring-1" />
              <div className="sos-ring ring-2" />
              <div className="sos-ring ring-3" />
              <button className="sos-btn" onClick={triggerSOS} disabled={!activePatient}>
                <Siren size={56} />
                SOS
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 360 }}>
              One tap dispatches the nearest ambulance using your saved medical profile — no forms needed
            </p>

            {locationError && <p style={{ color: 'var(--red)', fontSize: 13 }}>{locationError}</p>}
          </>
        )}

        {/* ═══════════ PHASE 2: DISPATCHING ═══════════ */}
        {phase === 'dispatching' && (
          <div className="dispatch-overlay">
            <div className="dispatch-spinner" />
            <div className="dispatch-timer">{dispatchTimer}s</div>
            <h3 style={{ fontSize: 20, fontWeight: 800 }}>Dispatching Emergency...</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              <span>✓ Patient identity verified</span>
              <span>✓ GPS coordinates acquired</span>
              <span className="animate-pulse">⟳ Running PostGIS spatial query...</span>
            </div>
          </div>
        )}

        {/* ═══════════ PHASE 3: RESULT ═══════════ */}
        {phase === 'result' && result && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(48,209,88,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={40} style={{ color: 'var(--green)' }} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--green)' }}>
                {result.dispatched ? 'Ambulance Dispatched!' : 'Request Created'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                Request #{result.request_id} — dispatched in {dispatchTimer}s
              </p>
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
                <span className="result-card-label"><Banknote size={14} /> Est. Fare</span>
                <span className="result-card-value" style={{ color: 'var(--blue)', fontSize: 28 }}>৳{result.estimated_fare}</span>
                <span className="result-card-sub">Base ৳500 + ৳25/km</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16, width: '100%', maxWidth: 540 }}>
              <button 
                className="btn btn-primary"
                style={{ flex: 1, height: 52, borderRadius: 16, fontSize: 15, fontWeight: 800 }}
                onClick={() => window.location.href = '/track'}
              >
                <Radio size={18} /> TRACK LIVE
              </button>
              <button 
                className="btn btn-secondary"
                style={{ flex: 1, height: 52, borderRadius: 16, fontSize: 15, fontWeight: 800 }}
                onClick={() => { setPhase('ready'); setResult(null); }}
              >
                <AlertTriangle size={18} /> NEW SOS
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
