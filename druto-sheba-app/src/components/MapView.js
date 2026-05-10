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

// Recenter map when pickup coordinates are set
function AutoRecenter({ position, shouldFollow, useMap }) {
  const map = useMap();
  const hasCentered = useRef(false);
  const snapTimer = useRef(null);

  // Initial center and follow-on-change
  useEffect(() => {
    if (position) {
      const bounds = map.getBounds();
      const viewHeightLat = bounds.getNorth() - bounds.getSouth();
      const zoom = map.getZoom();
      const offsetFactor = zoom > 16 ? 0.15 : 0.25;
      const offsetLat = position.lat - (viewHeightLat * offsetFactor);
      const centerPos = [offsetLat, position.lon];

      if (!hasCentered.current) {
        map.setView(centerPos, 15, { animate: true });
        hasCentered.current = true;
      } else if (shouldFollow) {
        map.panTo(centerPos, { animate: true, duration: 0.5 });
      }
    }
  }, [position, shouldFollow, map]);

  // Snap back if user pans away while following
  useEffect(() => {
    if (!shouldFollow || !position) return;

    const snapBack = () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
      
      snapTimer.current = setTimeout(() => {
        if (shouldFollow && position) {
          const bounds = map.getBounds();
          const viewHeightLat = bounds.getNorth() - bounds.getSouth();
          const zoom = map.getZoom();
          const offsetFactor = zoom > 16 ? 0.15 : 0.25;
          const offsetLat = position.lat - (viewHeightLat * offsetFactor);
          const target = [offsetLat, position.lon];

          const currentCenter = map.getCenter();
          const dist = Math.sqrt(Math.pow(currentCenter.lat - offsetLat, 2) + Math.pow(currentCenter.lng - position.lon, 2));
          
          if (dist > viewHeightLat * 0.001) {
            map.setView(target, map.getZoom(), { animate: true });
          }
        }
      }, 3000); // 3 second delay
    };

    const clearTimer = () => { if (snapTimer.current) clearTimeout(snapTimer.current); };

    map.on('move', clearTimer);
    map.on('moveend', snapBack);

    return () => {
      if (snapTimer.current) clearTimeout(snapTimer.current);
      map.off('move', clearTimer);
      map.off('moveend', snapBack);
    };
  }, [map, shouldFollow, position]);

  return null;
}

export default function MapView({ 
  hospitals = [], 
  pickupCoords = null, 
  requestStatus = 'Pending', 
  realtimeMarker = null,
  onHospitalClick = null,
  selectedHospitalId = null
}) {
  const [MapComponents, setMapComponents] = useState(null);
  const [followAmbulance, setFollowAmbulance] = useState(true);
  const [followUser, setFollowUser] = useState(realtimeMarker ? false : true); // Priority to Driver/Ambulance if present
  const [patientToHospitalRoute, setPatientToHospitalRoute] = useState(null);
  const [ambulanceToPatientRoute, setAmbulanceToPatientRoute] = useState(null);
  const [initialAmbulancePos, setInitialAmbulancePos] = useState(null);

  const selectedHospital = selectedHospitalId 
    ? hospitals.find(h => h.hospital_id === selectedHospitalId) 
    : hospitals[0];

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
            font-size: 20px; box-shadow: 0 4px 166px rgba(255,159,10,0.6);
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

  // ... (rest of the component)

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
  if (selectedHospital) routePoints.push([selectedHospital.lat, selectedHospital.lon]);

  // Build bounds for auto-fit
  const boundsPoints = [];
  if (pickupCoords) boundsPoints.push([pickupCoords.lat, pickupCoords.lon]);
  hospitals.forEach(h => boundsPoints.push([h.lat, h.lon]));
  if (currentAmbulancePos) boundsPoints.push(currentAmbulancePos);

  useEffect(() => {
    if (currentAmbulancePos && !initialAmbulancePos) {
      const update = () => setInitialAmbulancePos(currentAmbulancePos);
      update();
    }
  }, [currentAmbulancePos, initialAmbulancePos]);

  useEffect(() => {
    let isMounted = true;
    const pLat = parseFloat(pickupCoords?.lat);
    const pLon = parseFloat(pickupCoords?.lon);
    const hLat = parseFloat(selectedHospital?.lat);
    const hLon = parseFloat(selectedHospital?.lon);

    if (pLat && pLon && hLat && hLon) {
      const url = `https://router.project-osrm.org/route/v1/driving/${pLon},${pLat};${hLon},${hLat}?overview=full&geometries=geojson`;
      
      // Add a small delay to prevent rapid-fire requests during location jitter
      const timer = setTimeout(() => {
        fetch(url)
          .then(r => r.json())
          .then(data => {
            if (isMounted && data.code === 'Ok' && data.routes.length > 0) {
              const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              setPatientToHospitalRoute(coords);
            }
          }).catch(err => {
            console.error("OSRM Route Error", err);
            if (isMounted) setPatientToHospitalRoute(null);
          });
      }, 500);
      return () => { isMounted = false; clearTimeout(timer); };
    } else {
      setPatientToHospitalRoute(null);
    }
    return () => { isMounted = false; };
  }, [pickupCoords?.lat, pickupCoords?.lon, selectedHospital?.lat, selectedHospital?.lon]);

  useEffect(() => {
    let isMounted = true;
    const aLat = parseFloat(initialAmbulancePos?.[0]);
    const aLon = parseFloat(initialAmbulancePos?.[1]);
    const pLat = parseFloat(pickupCoords?.lat);
    const pLon = parseFloat(pickupCoords?.lon);

    if (aLat && aLon && pLat && pLon) {
      const url = `https://router.project-osrm.org/route/v1/driving/${aLon},${aLat};${pLon},${pLat}?overview=full&geometries=geojson`;
      
      const timer = setTimeout(() => {
        fetch(url)
          .then(r => r.json())
          .then(data => {
            if (isMounted && data.code === 'Ok' && data.routes.length > 0) {
              const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
              setAmbulanceToPatientRoute(coords);
            }
          }).catch(err => {
            console.error("OSRM Route Error", err);
            if (isMounted) setAmbulanceToPatientRoute(null);
          });
      }, 500);
      return () => { isMounted = false; clearTimeout(timer); };
    } else {
      setAmbulanceToPatientRoute(null);
    }
    return () => { isMounted = false; };
  }, [initialAmbulancePos, pickupCoords?.lat, pickupCoords?.lon]);

  // Route segments: Ambulance→Patient (orange), Patient→Hospital (blue)
  const ambulanceToPatient = ambulanceToPatientRoute || (currentAmbulancePos && pickupCoords
    ? [currentAmbulancePos, [pickupCoords.lat, pickupCoords.lon]]
    : null);

  const patientToHospital = patientToHospitalRoute || (pickupCoords && selectedHospital?.lat && selectedHospital?.lon
    ? [[pickupCoords.lat, pickupCoords.lon], [selectedHospital.lat, selectedHospital.lon]]
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
          background: rgba(255,255,255,0.95) !important;
          color: #1a1a1a !important;
          border-radius: 14px !important;
          border: 1px solid rgba(0,0,0,0.05) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.15) !important;
          backdrop-filter: blur(12px) !important;
        }
        .leaflet-popup-tip { background: rgba(255,255,255,0.95) !important; }
        .leaflet-popup-content { margin: 12px 16px !important; font-family: inherit !important; }
        .popup-title { font-size: 14px; font-weight: 800; margin-bottom: 4px; color: #000; }
        .popup-sub { font-size: 11px; color: #666; }
        .popup-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 800;
          margin-top: 6px; letter-spacing: 0.5px;
        }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,0.9) !important;
          color: #000 !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
        }
        .follow-btn {
          position: absolute; top: 20px; right: 20px; z-index: 1000;
          padding: 8px 14px; border-radius: 10px; font-size: 11px; font-weight: 800;
          border: 1px solid rgba(0,0,0,0.1); cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          transition: all 0.2s;
          background: #fff;
          color: #000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .follow-btn:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .follow-active { background: #30d158; color: #fff; border-color: #30d158; }
        .follow-inactive { background: #f2f2f7; color: #8e8e93; }
      `}</style>

      {/* Follow ambulance toggle button */}
      {currentAmbulancePos && (
        <button
          className={`follow-btn ${followAmbulance ? 'follow-active' : 'follow-inactive'}`}
          onClick={() => {
            const next = !followAmbulance;
            setFollowAmbulance(next);
            if (next) setFollowUser(false);
          }}
        >
          {followAmbulance ? '🔒 Following Ambulance' : '🔓 Free Pan Ambulance'}
        </button>
      )}

      {/* Follow patient toggle button */}
      {pickupCoords && !currentAmbulancePos && (
        <button
          className={`follow-btn ${followUser ? 'follow-active' : 'follow-inactive'}`}
          onClick={() => {
            const next = !followUser;
            setFollowUser(next);
            if (next) setFollowAmbulance(false);
          }}
        >
          {followUser ? '🔒 Following You' : '🔓 Free Pan'}
        </button>
      )}

      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true} zoomControl={true}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Auto-fit bounds */}
        {boundsPoints.length >= 2 && !followUser && !followAmbulance && (
          <FitBoundsInner bounds={boundsPoints} useMap={RL.useMap} />
        )}

        {/* Follow ambulance (Priority) */}
        {currentAmbulancePos && followAmbulance ? (
          <FollowAmbulance position={currentAmbulancePos} shouldFollow={followAmbulance} useMap={RL.useMap} />
        ) : (
          /* Patient auto-recenter / follow (Only if ambulance not following) */
          pickupCoords && (
            <AutoRecenter position={pickupCoords} shouldFollow={followUser} useMap={RL.useMap} />
          )
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
          <Marker 
            key={h.hospital_id} 
            position={[h.lat, h.lon]} 
            icon={h.type === 'Government' ? govtHospitalIcon : hospitalIcon}
            eventHandlers={{
              click: () => onHospitalClick?.(h)
            }}
          >
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
