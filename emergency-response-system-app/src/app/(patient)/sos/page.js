'use client';
import { useState, useEffect, useRef } from 'react';
import { Phone, MapPin, Siren, Clock, Building2, Truck, Banknote, ShieldAlert, CheckCircle, Loader2, AlertTriangle, Radio, User, Droplet, Activity, ChevronRight } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

function getAccuratePosition(timeoutMs = 15000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lon: null, accuracy: null, source: 'unavailable' });
      return;
    }
    let resolved = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (resolved) return;
        resolved = true;
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), source: 'gps' });
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (resolved) return;
            resolved = true;
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), source: 'network' });
          },
          async () => {
            if (resolved) return;
            try {
              const ipRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
              const ipData = await ipRes.json();
              if (ipData.latitude && ipData.longitude) {
                resolved = true;
                resolve({ lat: ipData.latitude, lon: ipData.longitude, accuracy: 5000, source: 'ip' });
                return;
              }
            } catch {}
            resolved = true;
            resolve({ lat: null, lon: null, accuracy: null, source: 'failed' });
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

export default function SOSPage() {
  const { activePatient } = useUser();
  const [phase, setPhase] = useState('ready'); // ready | loading_recs | recommendations | dispatching | result
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationSource, setLocationSource] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [severity, setSeverity] = useState('Critical');
  const [dispatchTimer, setDispatchTimer] = useState(0);
  const [profile, setProfile] = useState(null);
  const timerRef = useRef(null);
  const watchRef = useRef(null);

  useEffect(() => {
    if (activePatient?.id) {
      fetch(`/api/patients?patient_id=${activePatient.id}`)
        .then(r => r.json())
        .then(data => setProfile(Array.isArray(data) ? data[0] : data))
        .catch(() => {});
    }
  }, [activePatient]);

  useEffect(() => {
    let cancelled = false;
    setGpsLoading(true);
    getAccuratePosition(15000).then((result) => {
      if (cancelled) return;
      setGpsLoading(false);
      if (result.source !== 'failed' && result.source !== 'unavailable') {
        setLocation({ lat: result.lat, lon: result.lon });
        setLocationSource(result.source);
        setGpsAccuracy(result.accuracy);
        if (result.source === 'ip') setLocationError('⚠️ Using approximate IP location.');
      } else {
        setLocationError('Could not determine location. Please enable GPS.');
      }
    });

    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          const { latitude, longitude, accuracy } = pos.coords;
          if (!gpsAccuracy || accuracy < gpsAccuracy) {
            setLocation({ lat: latitude, lon: longitude });
            setLocationSource('gps');
            setGpsAccuracy(Math.round(accuracy));
            setGpsLoading(false);
            setLocationError(null);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    }
    return () => {
      cancelled = true;
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, []);

  const triggerSOS = async () => {
    setPhase('loading_recs');
    setLocationError(null);

    let coords = location;
    if (!coords || locationSource === 'ip') {
      const freshPos = await getAccuratePosition(12000);
      if (freshPos.source !== 'failed' && freshPos.source !== 'unavailable') {
        coords = { lat: freshPos.lat, lon: freshPos.lon };
        setLocation(coords);
        setLocationSource(freshPos.source);
        setGpsAccuracy(freshPos.accuracy);
      } else if (!coords) {
        setLocationError('❌ Cannot acquire location. Please enable GPS.');
        setPhase('ready');
        return;
      }
    }

    try {
      const payload = { ...coords, severity, patient_id: activePatient?.id || null };
      const res = await fetch('/api/hospitals/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setHospitals(data.hospitals || []);
      setPhase('recommendations');
    } catch (err) {
      setLocationError('Network error fetching hospitals.');
      setPhase('ready');
    }
  };

  const confirmDispatch = async (hospitalId) => {
    setPhase('dispatching');
    setDispatchTimer(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setDispatchTimer(((Date.now() - start) / 1000).toFixed(1));
    }, 100);

    try {
      const payload = {
        lat: location.lat, lon: location.lon,
        severity, hospital_id: hospitalId,
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

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

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
          animation: sosPulse 1.5s infinite; transition: transform 0.2s; position: relative; z-index: 2;
        }
        .sos-btn:hover { transform: scale(1.08); }
        .sos-btn:active { transform: scale(0.95); }
        @keyframes sosPulse {
          0% { box-shadow: 0 0 0 0 rgba(255,45,85,0.7); }
          70% { box-shadow: 0 0 0 50px rgba(255,45,85,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,45,85,0); }
        }
        .sos-ring {
          position: absolute; border-radius: 50%; border: 2px solid rgba(255,45,85,0.15); 
          animation: ringPulse 2s infinite; pointer-events: none;
        }
        .ring-1 { width: 300px; height: 300px; }
        .ring-2 { width: 380px; height: 380px; animation-delay: 0.5s; }
        .ring-3 { width: 460px; height: 460px; animation-delay: 1s; }
        @keyframes ringPulse { 0% { opacity: 0.6; transform: scale(0.95); } 100% { opacity: 0; transform: scale(1.15); } }
        .severity-row { display: flex; gap: 10px; }
        .sev-pill {
          padding: 10px 28px; border-radius: 24px; cursor: pointer; font-weight: 800; font-size: 13px;
          border: 2px solid var(--border-subtle); background: var(--bg-glass);
          color: var(--text-muted); transition: all 0.25s; letter-spacing: 0.5px;
        }
        .sev-pill.active-Critical { background: rgba(255,45,85,0.15); border-color: var(--red); color: var(--red); }
        .sev-pill.active-High { background: rgba(255,159,10,0.15); border-color: var(--yellow); color: var(--yellow); }
        .sev-pill.active-Medium { background: rgba(10,132,255,0.15); border-color: var(--blue); color: var(--blue); }
        .patient-card {
          display: flex; align-items: center; gap: 20px; padding: 16px 24px;
          background: var(--bg-card); border: 1px solid var(--border-subtle);
          border-radius: 16px; text-align: left; width: 100%; max-width: 480px;
        }
        .patient-card .avatar {
          width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, rgba(10,132,255,0.15), rgba(255,45,85,0.15));
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .gps-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 8px 20px; border-radius: 24px; font-size: 12px; font-weight: 700;
        }
        .gps-locked { background: rgba(48,209,88,0.1); border: 1px solid rgba(48,209,88,0.3); color: var(--green); }
        .gps-searching { background: rgba(255,159,10,0.1); border: 1px solid rgba(255,159,10,0.3); color: var(--yellow); }
        .gps-error { background: rgba(255,45,85,0.1); border: 1px solid rgba(255,45,85,0.3); color: var(--red); }
        .dispatch-overlay { display: flex; flex-direction: column; align-items: center; gap: 28px; }
        .dispatch-spinner {
          width: 120px; height: 120px; border-radius: 50%; border: 4px solid rgba(255,45,85,0.1); border-top-color: var(--red);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .dispatch-timer {
          font-size: 48px; font-weight: 900; font-family: 'JetBrains Mono', monospace;
          background: linear-gradient(to right, var(--red), var(--orange)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; max-width: 540px; }
        .result-card {
          padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 8px;
          background: var(--bg-card); border: 1px solid var(--border-subtle); text-align: left;
        }
        .result-card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); font-weight: 800; display: flex; align-items: center; gap: 6px; }
        .result-card-value { font-size: 22px; font-weight: 900; color: var(--text-primary); }
        .result-card-sub { font-size: 12px; color: var(--text-secondary); }
        
        .hospital-list { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 540px; }
        .hospital-item {
          display: flex; align-items: center; justify-content: space-between; padding: 16px 20px;
          background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px;
          cursor: pointer; transition: all 0.2s; text-align: left;
        }
        .hospital-item:hover { background: var(--bg-card-hover); border-color: var(--blue); transform: translateY(-2px); }
        .hospital-item.best-match { border-color: rgba(48,209,88,0.4); background: rgba(48,209,88,0.05); }

        @media (max-width: 600px) {
          .sos-btn { width: 200px; height: 200px; font-size: 24px; }
          .result-grid { grid-template-columns: 1fr; }
          .patient-card { flex-direction: column; text-align: center; }
          .hospital-item { flex-direction: column; gap: 12px; align-items: flex-start; }
        }
      `}</style>

      <div className="bg-blob"><div className="blob blob-1"></div><div className="blob blob-3" style={{ animationDelay: '3s' }}></div></div>

      <div className="sos-wrapper">
        {phase === 'ready' && (
          <>
            <h2 style={{ fontSize: 36, fontWeight: 900, background: 'linear-gradient(to right, var(--text-primary), var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Emergency SOS
            </h2>

            {activePatient && (
              <div className="patient-card">
                <div className="avatar"><User size={24} style={{ color: 'var(--blue)' }} /></div>
                <div className="info">
                  <div className="name" style={{ color: 'var(--text-primary)' }}>{activePatient.name}</div>
                  <div className="meta">
                    {activePatient.blood_type && <span><Droplet size={10} /> {activePatient.blood_type}</span>}
                    {profile?.phone && <span><Phone size={10} /> {profile.phone}</span>}
                  </div>
                </div>
                <CheckCircle size={20} style={{ color: 'var(--green)', flexShrink: 0 }} />
              </div>
            )}

            <div className={`gps-badge ${location ? (locationSource === 'gps' ? 'gps-locked' : 'gps-searching') : (gpsLoading ? 'gps-searching' : 'gps-error')}`}>
              {gpsLoading ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
              {gpsLoading ? 'Acquiring GPS...' : location ? `${locationSource.toUpperCase()} • ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}${gpsAccuracy ? ` • ±${gpsAccuracy}m` : ''}` : 'Location Unavailable'}
            </div>

            <div className="severity-row">
              {['Critical', 'High', 'Medium'].map(s => (
                <div key={s} className={`sev-pill ${severity === s ? `active-${s}` : ''}`} onClick={() => setSeverity(s)}>
                  {s === 'Critical' ? '🔴' : s === 'High' ? '🟠' : '🔵'} {s}
                </div>
              ))}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              <div className="sos-ring ring-1" /><div className="sos-ring ring-2" /><div className="sos-ring ring-3" />
              <button className="sos-btn" onClick={triggerSOS} disabled={!activePatient}>
                <Siren size={56} /> SOS
              </button>
            </div>
            {locationError && <p style={{ color: 'var(--red)', fontSize: 13 }}>{locationError}</p>}
          </>
        )}

        {phase === 'loading_recs' && (
          <div className="dispatch-overlay">
            <div className="dispatch-spinner" />
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Finding Best Hospitals...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Analyzing your medical profile and location...</p>
          </div>
        )}

        {phase === 'recommendations' && (
          <>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>Select Destination</h2>
            <p style={{ color: 'var(--text-muted)' }}>Based on your medical conditions, here are the best options:</p>
            <div className="hospital-list">
              {hospitals.map((h, i) => (
                <div key={h.hospital_id} className={`hospital-item ${h.spec_match ? 'best-match' : ''}`} onClick={() => confirmDispatch(h.hospital_id)}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {h.name} {h.spec_match && <span style={{ fontSize: 10, background: 'var(--green)', color: '#000', padding: '2px 6px', borderRadius: 10, fontWeight: 900 }}>BEST MATCH</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12 }}>
                      <span><MapPin size={10} style={{ display: 'inline', marginRight: 2 }} /> {h.distance_km} km</span>
                      <span><Clock size={10} style={{ display: 'inline', marginRight: 2 }} /> {h.eta_minutes} min ETA</span>
                      <span><Banknote size={10} style={{ display: 'inline', marginRight: 2 }} /> ৳{h.estimated_fare}</span>
                    </div>
                  </div>
                  <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={() => setPhase('ready')}>Cancel</button>
          </>
        )}

        {phase === 'dispatching' && (
          <div className="dispatch-overlay">
            <div className="dispatch-spinner" />
            <div className="dispatch-timer">{dispatchTimer}s</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Dispatching Ambulance...</h3>
          </div>
        )}

        {phase === 'result' && result && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(48,209,88,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={40} style={{ color: 'var(--green)' }} />
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--green)' }}>
                {result.dispatched ? 'Ambulance Dispatched!' : 'Request Created'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Request #{result.request_id} — {dispatchTimer}s</p>
            </div>

            <div className="result-grid">
              <div className="result-card" style={{ borderColor: 'rgba(48,209,88,0.3)', background: 'rgba(48,209,88,0.04)' }}>
                <span className="result-card-label"><Truck size={14} /> Ambulance</span>
                <span className="result-card-value">{result.ambulance}</span>
              </div>
              <div className="result-card" style={{ borderColor: 'rgba(48,209,88,0.3)', background: 'rgba(48,209,88,0.04)' }}>
                <span className="result-card-label"><Clock size={14} /> ETA</span>
                <span className="result-card-value">{result.eta_minutes} min</span>
              </div>
              <div className="result-card">
                <span className="result-card-label"><Building2 size={14} /> Hospital</span>
                <span className="result-card-value" style={{ fontSize: 16 }}>{result.nearest_hospital}</span>
              </div>
              <div className="result-card" style={{ borderColor: 'rgba(10,132,255,0.3)', background: 'rgba(10,132,255,0.04)' }}>
                <span className="result-card-label"><Banknote size={14} /> Est. Fare</span>
                <span className="result-card-value" style={{ color: 'var(--blue)', fontSize: 28 }}>৳{result.estimated_fare}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16, width: '100%', maxWidth: 540 }}>
              <button className="btn btn-primary" style={{ flex: 1, height: 52, borderRadius: 16, fontSize: 15, fontWeight: 800 }} onClick={() => window.location.href = '/track'}>
                <Radio size={18} /> TRACK LIVE
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
