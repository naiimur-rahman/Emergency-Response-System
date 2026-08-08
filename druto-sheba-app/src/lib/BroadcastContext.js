'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from './UserContext';
import mqttService from './mqttService';

const BroadcastContext = createContext();

export function BroadcastProvider({ children }) {
  const { activeDriver } = useUser();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [uptime, setUptime] = useState('00:00');
  const [realtimeMarker, setRealtimeMarker] = useState(null);

  const watchId = useRef(null);
  const tripStartTime = useRef(null);
  const lastSentTime = useRef(0);
  const activeDriverRef = useRef(activeDriver);

  // Keep track of activeDriver in ref for async callbacks
  useEffect(() => {
    activeDriverRef.current = activeDriver;
  }, [activeDriver]);

  // Clean up broadcasting on driver switch
  useEffect(() => {
    stopBroadcasting();
    if (activeDriver?.id) {
      mqttService.connect(`driver-${activeDriver.id}`);
    }
    return () => {
      stopBroadcasting();
      mqttService.disconnect();
    };
  }, [activeDriver?.id]);

  // Uptime counter
  useEffect(() => {
    if (!isBroadcasting) return;
    const interval = setInterval(() => {
      if (!tripStartTime.current) return;
      const diff = Math.floor((Date.now() - tripStartTime.current) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setUptime(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [isBroadcasting]);

  const startBroadcasting = useCallback(() => {
    if (!navigator.geolocation || !activeDriverRef.current?.id) return;

    setIsBroadcasting(true);
    tripStartTime.current = Date.now();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed: rawSpeed, accuracy: acc } = pos.coords;
        const currentSpeed = (rawSpeed || 0) * 3.6; // m/s to km/h
        
        setSpeed(currentSpeed);
        setAccuracy(acc);
        setRealtimeMarker({ lat: latitude, lng: longitude, speed: currentSpeed.toFixed(1), acc });

        const now = Date.now();
        if (now - lastSentTime.current > 500) { // Throttling MQTT publish
          mqttService.publish({
            id: `ambulance-${activeDriverRef.current.id}`,
            driver_name: activeDriverRef.current.name,
            lat: latitude,
            lng: longitude,
            speed: currentSpeed.toFixed(1),
            acc: acc,
            status: 'active'
          });
          lastSentTime.current = now;
        }

        // Persist to database every 10 seconds (sending driver_id to resolve vehicle dynamically)
        if (now - (window.lastDbUpdate || 0) > 10000) {
          fetch('/api/driver/location', {
            method: 'POST',
            body: JSON.stringify({ driver_id: activeDriverRef.current.id, lat: latitude, lng: longitude })
          }).catch(err => console.error(err));
          window.lastDbUpdate = now;
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
  }, []);

  const stopBroadcasting = useCallback(() => {
    setIsBroadcasting(false);
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (activeDriverRef.current?.id) {
      mqttService.publishOffline(`ambulance-${activeDriverRef.current.id}`);
    }
    setRealtimeMarker(null);
    setSpeed(0);
    setAccuracy(0);
    setUptime('00:00');
  }, []);

  return (
    <BroadcastContext.Provider value={{
      isBroadcasting,
      speed,
      accuracy,
      uptime,
      realtimeMarker,
      startBroadcasting,
      stopBroadcasting
    }}>
      {children}
    </BroadcastContext.Provider>
  );
}

export function useBroadcast() {
  return useContext(BroadcastContext);
}
