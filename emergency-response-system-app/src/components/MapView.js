'use client';
import { useEffect, useState, useRef } from 'react';

// Helper component to auto-fit map bounds to all markers
function FitBounds({ bounds, mapLib }) {
  const MapHook = mapLib;
  if (!MapHook) return null;

  return <FitBoundsInner bounds={bounds} useMap={MapHook.useMap} />;
}

function FitBoundsInner({ bounds, useMap }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (!bounds || bounds.length < 2) return;
    // Only auto-fit once on initial load, then let user pan freely
    if (hasFitted.current) return;
    try {
      const L = window.L || require('leaflet');
      const latLngBounds = L.latLngBounds(bounds);
      if (latLngBounds.isValid()) {
        map.fitBounds(latLngBounds, { padding: [60, 60], maxZoom: 15 });
        hasFitted.current = true;
      }
    } catch {}
  }, [bounds, map]);

  return null;
}

// Recenter map when ambulance moves
function FollowAmbulance({ position, shouldFollow, useMap }) {
  const map = useMap();
  useEffect(() => {
    if (shouldFollow && position) {
      map.panTo(position, { animate: true, duration: 0.5 });
    }
  }, [position, shouldFollow, map]);
  return null;
}

export default function MapView({ hospitals = [], pickupCoords = null, requestStatus = 'Pending', realtimeMarker = null }) {
  const [MapComponents, setMapComponents] = useState(null);
  const [followAmbulance, setFollowAmbulance] = useState(true);
  const [patientToHospitalRoute, setPatientToHospitalRoute] = useState(null);
  const [ambulanceToPatientRoute, setAmbulanceToPatientRoute] = useState(null);
  const [initialAmbulancePos, setInitialAmbulancePos] = useState(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with Leaflet
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([L, RL]) => {
      // Fix default marker icon
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Custom DivIcon: Hospital 🏥
      const hospitalIcon = new L.DivIcon({
        html: `<div style="
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #0a84ff, #0066cc);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; box-shadow: 0 4px 12px rgba(10,132,255,0.5);
          border: 2px solid rgba(255,255,255,0.3);
        ">🏥</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24],
        className: 'custom-div-icon',
      });

      // Custom DivIcon: Government Hospital 🏛️
      const govtHospitalIcon = new L.DivIcon({
        html: `<div style="
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg, #5856d6, #3634a3);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; box-shadow: 0 4px 12px rgba(88,86,214,0.5);
          border: 2px solid rgba(255,255,255,0.3);
        ">🏛️</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24],
        className: 'custom-div-icon',
      });

      // Custom DivIcon: Patient Emergency 🆘
      const emergencyIcon = new L.DivIcon({
        html: `<div class="patient-marker-pulse" style="position:relative; width:44px; height:44px;">
          <div style="
            position:absolute; top:0; left:0; width:44px; height:44px; border-radius:50%;
            background: rgba(255,45,85,0.2);
            animation: markerPulse 2s ease-out infinite;
          "></div>
          <div style="
            position:absolute; top:6px; left:6px;
            width: 32px; height: 32px; border-radius: 50%;
            background: linear-gradient(135deg, #ff2d55, #cc0033);
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; box-shadow: 0 4px 16px rgba(255,45,85,0.6);
            border: 2px solid rgba(255,255,255,0.4);
          ">📍</div>
        </div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -26],
        className: 'custom-div-icon',
      });

      // Custom DivIcon: Ambulance 🚑
      const ambulanceIcon = new L.DivIcon({
        html: `<div style="position:relative; width:48px; height:48px;">
          <div style="
            position:absolute; top:0; left:0; width:48px; height:48px; border-radius:50%;
            background: rgba(255,159,10,0.15);
            animation: markerPulse 1.5s ease-out infinite;
          "></div>
          <div style="
            position:absolute; top:6px; left:6px;
            width: 36px; height: 36px; border-radius: 50%;
            background: linear-gradient(135deg, #ff9f0a, #e68600);
            display: flex; align-items: center; justify-content: center;
            font-size: 20px; box-shadow: 0 4px 16px rgba(255,159,10,0.6);
            border: 2px solid rgba(255,255,255,0.4);
          ">🚑</div>
        </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -28],
        className: 'custom-div-icon',
      });

      window.L = L;
      setMapComponents({ L, RL, hospitalIcon, govtHospitalIcon, emergencyIcon, ambulanceIcon });
    });
  }, []);





  // Determine map center: prioritize pickup, then first hospital, then Dhaka
  const center = pickupCoords
    ? [pickupCoords.lat, pickupCoords.lon]
    : hospitals.length > 0
      ? [hospitals[0].lat, hospitals[0].lon]
      : [23.7750, 90.4100];

  const currentAmbulancePos = realtimeMarker ? [realtimeMarker.lat, realtimeMarker.lng] : null;

  // Build route polyline points
  const routePoints = [];
  if (currentAmbulancePos) routePoints.push(currentAmbulancePos);
  if (pickupCoords) routePoints.push([pickupCoords.lat, pickupCoords.lon]);
  if (hospitals.length > 0) routePoints.push([hospitals[0].lat, hospitals[0].lon]);

  // Build bounds for auto-fit
  const boundsPoints = [];
  if (pickupCoords) boundsPoints.push([pickupCoords.lat, pickupCoords.lon]);
  hospitals.forEach(h => boundsPoints.push([h.lat, h.lon]));
  if (currentAmbulancePos) boundsPoints.push(currentAmbulancePos);

  useEffect(() => {
    if (currentAmbulancePos && !initialAmbulancePos) {
      setInitialAmbulancePos(currentAmbulancePos);
    }
  }, [currentAmbulancePos, initialAmbulancePos]);

  useEffect(() => {
    if (pickupCoords && hospitals.length > 0 && hospitals[0].lat && hospitals[0].lon) {
      const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoords.lon},${pickupCoords.lat};${hospitals[0].lon},${hospitals[0].lat}?overview=full&geometries=geojson`;
      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setPatientToHospitalRoute(coords);
          }
        }).catch(err => console.error("OSRM Route Error", err));
    } else {
      setPatientToHospitalRoute(null);
    }
  }, [pickupCoords, hospitals]);

  useEffect(() => {
    if (initialAmbulancePos && pickupCoords) {
      const url = `https://router.project-osrm.org/route/v1/driving/${initialAmbulancePos[1]},${initialAmbulancePos[0]};${pickupCoords.lon},${pickupCoords.lat}?overview=full&geometries=geojson`;
      fetch(url)
        .then(r => r.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setAmbulanceToPatientRoute(coords);
          }
        }).catch(err => console.error("OSRM Route Error", err));
    } else {
      setAmbulanceToPatientRoute(null);
    }
  }, [initialAmbulancePos, pickupCoords]);

  // Route segments: Ambulance→Patient (orange), Patient→Hospital (blue)
  const ambulanceToPatient = ambulanceToPatientRoute || (currentAmbulancePos && pickupCoords
    ? [currentAmbulancePos, [pickupCoords.lat, pickupCoords.lon]]
    : null);

  const patientToHospital = patientToHospitalRoute || (pickupCoords && hospitals.length > 0 && hospitals[0].lat && hospitals[0].lon
    ? [[pickupCoords.lat, pickupCoords.lon], [hospitals[0].lat, hospitals[0].lon]]
    : null);

  if (!MapComponents) {
    return (
      <div className="map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}>
        <div className="spinner" />
      </div>
    );
  }

  const { RL, hospitalIcon, govtHospitalIcon, emergencyIcon, ambulanceIcon } = MapComponents;
  const { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } = RL;

  return (
    <div className="map-container" style={{ position: 'relative' }}>

      {/* Inject CSS for custom marker animations */}
      <style>{`
        .custom-div-icon { background: transparent !important; border: none !important; }
        @keyframes markerPulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          background: rgba(20,20,30,0.95) !important;
          color: #fff !important;
          border-radius: 14px !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5) !important;
          backdrop-filter: blur(12px) !important;
        }
        .leaflet-popup-tip { background: rgba(20,20,30,0.95) !important; }
        .leaflet-popup-content { margin: 12px 16px !important; font-family: inherit !important; }
        .popup-title { font-size: 14px; font-weight: 800; margin-bottom: 4px; }
        .popup-sub { font-size: 11px; opacity: 0.6; }
        .popup-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 800;
          margin-top: 6px; letter-spacing: 0.5px;
        }
        .leaflet-control-zoom a {
          background: rgba(20,20,30,0.9) !important;
          color: #fff !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .follow-btn {
          position: absolute; top: 12px; right: 12px; z-index: 1000;
          padding: 8px 14px; border-radius: 10px; font-size: 11px; font-weight: 800;
          border: 1px solid rgba(255,255,255,0.1); cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          transition: all 0.2s;
        }
        .follow-btn:hover { transform: scale(1.05); }
        .follow-active { background: rgba(48,209,88,0.15); color: #30d158; border-color: rgba(48,209,88,0.3); }
        .follow-inactive { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); }
      `}</style>

      {/* Follow ambulance toggle button */}
      {currentAmbulancePos && (
        <button
          className={`follow-btn ${followAmbulance ? 'follow-active' : 'follow-inactive'}`}
          onClick={() => setFollowAmbulance(!followAmbulance)}
        >
          {followAmbulance ? '🔒 Following' : '🔓 Free Pan'}
        </button>
      )}

      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true} zoomControl={true}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Auto-fit bounds */}
        {boundsPoints.length >= 2 && (
          <FitBoundsInner bounds={boundsPoints} useMap={RL.useMap} />
        )}

        {/* Follow ambulance */}
        {currentAmbulancePos && (
          <FollowAmbulance position={currentAmbulancePos} shouldFollow={followAmbulance} useMap={RL.useMap} />
        )}

        {/* Route: Ambulance → Patient (dashed orange) */}
        {ambulanceToPatient && (
          <Polyline
            positions={ambulanceToPatient}
            pathOptions={{
              color: '#ff9f0a',
              weight: 4,
              dashArray: '12, 8',
              opacity: 0.8,
            }}
          />
        )}

        {/* Route: Patient → Hospital (solid blue) */}
        {patientToHospital && (
          <Polyline
            positions={patientToHospital}
            pathOptions={{
              color: '#0a84ff',
              weight: 4,
              dashArray: '8, 6',
              opacity: 0.7,
            }}
          />
        )}

        {/* Hospital markers */}
        {hospitals.map((h) => (
          <Marker key={h.hospital_id} position={[h.lat, h.lon]} icon={h.type === 'Government' ? govtHospitalIcon : hospitalIcon}>
            <Popup>
              <div class="popup-title">🏥 {h.name}</div>
              <div class="popup-sub">{h.type || 'Private'} Hospital</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <span class="popup-badge" style={{ background: 'rgba(48,209,88,0.15)', color: '#30d158' }}>
                  🛏️ General: {h.general_beds}
                </span>
                <span class="popup-badge" style={{ background: 'rgba(255,45,85,0.15)', color: '#ff2d55' }}>
                  ❤️ ICU: {h.icu_beds}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Patient pickup marker */}
        {pickupCoords && (
          <Marker position={[pickupCoords.lat, pickupCoords.lon]} icon={emergencyIcon}>
            <Popup>
              <div class="popup-title">📍 Emergency Pickup</div>
              <div class="popup-sub">Patient Location</div>
              <div class="popup-badge" style={{ background: 'rgba(255,45,85,0.15)', color: '#ff2d55' }}>
                🆘 {requestStatus}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Ambulance marker */}
        {currentAmbulancePos && (
          <>
            <Marker position={currentAmbulancePos} icon={ambulanceIcon}>
              <Popup>
                <div class="popup-title">🚑 Ambulance Unit</div>
                {realtimeMarker && (
                  <>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <span class="popup-badge" style={{ background: 'rgba(10,132,255,0.15)', color: '#0a84ff' }}>
                        🏎️ {realtimeMarker.speed} km/h
                      </span>
                      <span class="popup-badge" style={{ background: 'rgba(48,209,88,0.15)', color: '#30d158' }}>
                        📡 ±{Math.round(realtimeMarker.acc || 0)}m
                      </span>
                    </div>
                  </>
                )}
              </Popup>
            </Marker>
            {/* GPS accuracy circle */}
            {realtimeMarker && realtimeMarker.acc > 15 && (
              <Circle
                center={currentAmbulancePos}
                radius={realtimeMarker.acc}
                pathOptions={{ color: '#ff9f0a', weight: 1, fillColor: '#ff9f0a', fillOpacity: 0.08 }}
              />
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}
