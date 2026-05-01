'use client';
import { useEffect, useState } from 'react';

export default function MapView({ hospitals = [], pickupCoords = null }) {
  const [MapComponents, setMapComponents] = useState(null);

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

      const govtIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const privateIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const emergencyIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      setMapComponents({ L, RL, govtIcon, privateIcon, emergencyIcon });
    });
  }, []);

  if (!MapComponents) {
    return <div className="map-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)' }}><div className="spinner" /></div>;
  }

  const { RL, govtIcon, privateIcon, emergencyIcon } = MapComponents;
  const { MapContainer, TileLayer, Marker, Popup } = RL;
  const center = [23.7750, 90.4100]; // Dhaka center

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {hospitals.map((h) => (
          <Marker key={h.hospital_id} position={[h.lat, h.lon]} icon={h.type === 'Government' ? govtIcon : privateIcon}>
            <Popup>
              <strong>{h.name}</strong><br />
              <span style={{ fontSize: 11, color: h.type === 'Government' ? 'var(--blue)' : 'var(--green)', fontWeight: 700 }}>{h.type} Hospital</span><br />
              General: {h.general_beds} | ICU: {h.icu_beds}
            </Popup>
          </Marker>
        ))}
        {pickupCoords && (
          <Marker position={[pickupCoords.lat, pickupCoords.lon]} icon={emergencyIcon}>
            <Popup><strong>Emergency Pickup</strong></Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
