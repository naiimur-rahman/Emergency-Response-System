'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

const fallbackDriver = { id: 1, name: 'Senior Paramedic', role: 'Paramedic', license: 'DHA-11-9922', vehicle: 'DHA-11-9922' };

export function UserProvider({ children }) {
  const [availableDrivers, setAvailableDrivers] = useState([fallbackDriver]);
  const [activeDriver, setActiveDriver] = useState(fallbackDriver);

  useEffect(() => {
    let isMounted = true;
    async function loadDrivers() {
      try {
        const res = await fetch('/api/drivers');
        if (!res.ok) throw new Error('Failed to fetch drivers');
        const dbDrivers = await res.json();
        
        if (!isMounted) return;

        const formattedDrivers = dbDrivers.map((d, index) => ({
           id: d.driver_id,
           name: d.name,
           license: d.license_no,
           role: index === 0 ? 'Senior Paramedic' : 'Emergency Driver',
           vehicle: 'DHA-11-9922'
        }));

        if (formattedDrivers.length > 0) {
           setAvailableDrivers(formattedDrivers);
           const saved = localStorage.getItem('emergency_active_driver');
           if (saved) {
             const d = formattedDrivers.find(x => x.id === parseInt(saved));
             if (d) setActiveDriver(d);
             else setActiveDriver(formattedDrivers[0]);
           } else {
             setActiveDriver(formattedDrivers[0]);
           }
        }
      } catch (err) {
        console.error('Failed to load drivers', err);
      }
    }
    
    loadDrivers();
    const interval = setInterval(loadDrivers, 10000); // 10s is plenty for demo
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const setDriver = (driverId) => {
    const d = availableDrivers.find(x => x.id === parseInt(driverId));
    if (d) {
      setActiveDriver(d);
      localStorage.setItem('emergency_active_driver', d.id.toString());
    }
  };

  return (
    <UserContext.Provider value={{ activeDriver, setDriver, availableDrivers }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
