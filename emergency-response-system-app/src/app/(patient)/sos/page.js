'use client';
import { useState, useEffect, useRef } from 'react';
import { Phone, MapPin, Siren, Clock, Building2, Truck, Banknote, ShieldAlert, CheckCircle, Loader2, AlertTriangle, Radio, User, Droplet, Activity, ChevronRight, Navigation } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

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
    <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' }}>
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
          .sos-btn { width: 140px; height: 140px; font-size: 20px; }
          .result-grid { grid-template-columns: 1fr; }
          .patient-card { flex-direction: column; text-align: center; }
          .hospital-item { flex-direction: column; gap: 12px; align-items: flex-start; }
          .floating-bottom-card { left: 16px; right: 16px; bottom: 16px; width: auto; padding: 20px; }
          .uber-layout { margin: 0; border-radius: 0; }
        }
        .uber-layout {
          position: relative;
          height: 100vh;
          width: 100%;
          overflow: hidden;
          background: var(--bg-primary);
        }
        .map-background {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .floating-top-card {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-subtle);
          border-radius: 40px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: var(--shadow-card);
        }
        .floating-bottom-card {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          background: linear-gradient(180deg, var(--bg-card), rgba(0,0,0,0.8));
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: 24px;
          width: 90%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
        }
      `}</style>

      <div className="uber-layout">
        
        {/* Full Screen Map Background */}
        <div className="map-background">
          <MapView 
            hospitals={phase === 'recommendations' ? hospitals : []} 
            pickupCoords={location} 
            requestStatus={phase === 'result' ? 'Dispatched' : 'Pending'}
          />
        </div>

        {/* Floating Top Indicator */}
        <div className="floating-top-card">
          <div className={`gps-badge ${location ? (locationSource === 'gps' ? 'gps-locked' : 'gps-searching') : (gpsLoading ? 'gps-searching' : 'gps-error')}`} style={{ background: 'transparent', border: 'none', padding: 0 }}>
            {gpsLoading ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
            {gpsLoading ? 'Acquiring GPS...' : location ? `${locationSource.toUpperCase()} • ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : 'Location Unavailable'}
          </div>
        </div>

        {/* Floating Bottom Interaction Card */}
        <div className="floating-bottom-card">
          
          {phase === 'ready' && (
            <>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>Emergency SOS</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tap the button below to summon an ambulance immediately.</p>
              </div>

              <div className="severity-row">
                {['Critical', 'High', 'Medium'].map(s => (
                  <div key={s} className={`sev-pill ${severity === s ? `active-${s}` : ''}`} onClick={() => setSeverity(s)} style={{ padding: '8px 20px', fontSize: 12 }}>
                    {s === 'Critical' ? '🔴' : s === 'High' ? '🟠' : '🔵'} {s}
                  </div>
                ))}
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px 0' }}>
                <div className="sos-ring ring-1" style={{ width: 180, height: 180 }} />
                <div className="sos-ring ring-2" style={{ width: 220, height: 220 }} />
                <button className="sos-btn" onClick={triggerSOS} disabled={!activePatient} style={{ width: 140, height: 140, fontSize: 22 }}>
                  <Siren size={36} /> SOS
                </button>
              </div>
              {locationError && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: -10 }}>{locationError}</p>}
            </>
          )}

          {phase === 'loading_recs' && (
            <div className="dispatch-overlay" style={{ padding: '40px 0' }}>
              <div className="dispatch-spinner" style={{ width: 80, height: 80, borderWidth: 3 }} />
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Analyzing Situation...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>Finding the best hospital for your condition.</p>
            </div>
          )}

          {phase === 'recommendations' && (
            <div style={{ width: '100%', maxHeight: '50vh', overflowY: 'auto', paddingRight: 8 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Select Destination</h3>
              <div className="hospital-list">
                {hospitals.map((h, i) => (
                  <div key={h.hospital_id} className={`hospital-item ${h.spec_match ? 'best-match' : ''}`} onClick={() => confirmDispatch(h.hospital_id)} style={{ padding: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {h.name} {h.spec_match && <span style={{ fontSize: 9, background: 'var(--green)', color: '#000', padding: '2px 4px', borderRadius: 6, fontWeight: 900 }}>BEST MATCH</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 8 }}>
                        <span><Navigation size={10} style={{ display: 'inline' }} /> {h.distance_km} km</span>
                        <span><Clock size={10} style={{ display: 'inline' }} /> {h.eta_minutes} min</span>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--blue)' }} />
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={() => setPhase('ready')}>Cancel Request</button>
            </div>
          )}

          {phase === 'dispatching' && (
            <div className="dispatch-overlay" style={{ padding: '40px 0' }}>
              <div className="dispatch-spinner" style={{ width: 80, height: 80, borderWidth: 3 }} />
              <div className="dispatch-timer" style={{ fontSize: 32 }}>{dispatchTimer}s</div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>Dispatching Ambulance...</h3>
            </div>
          )}

          {phase === 'result' && result && (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(48,209,88,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={24} style={{ color: 'var(--green)' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--green)' }}>Dispatched!</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Request #{result.request_id} • ৳{result.estimated_fare}</p>
                </div>
              </div>

              <div className="result-grid">
                <div className="result-card" style={{ padding: 12, borderColor: 'rgba(48,209,88,0.3)', background: 'rgba(48,209,88,0.04)' }}>
                  <span className="result-card-label"><Clock size={12} /> ETA</span>
                  <span className="result-card-value" style={{ fontSize: 18 }}>{result.eta_minutes} min</span>
                </div>
                <div className="result-card" style={{ padding: 12 }}>
                  <span className="result-card-label"><Building2 size={12} /> Hospital</span>
                  <span className="result-card-value" style={{ fontSize: 14 }}>{result.nearest_hospital}</span>
                </div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', height: 48, borderRadius: 12, fontSize: 14, fontWeight: 800, marginTop: 16 }} onClick={() => window.location.href = '/track'}>
                <Radio size={16} /> GO TO LIVE TRACKING
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
