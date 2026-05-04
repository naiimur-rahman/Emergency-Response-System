'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import mockData from './mockData';


const UserContext = createContext();

export function UserProvider({ children }) {
  const [availableDrivers, setAvailableDrivers] = useState(mockData.drivers.map(d => ({
    id: d.id,
    name: d.name,
    license: d.license,
    status: d.status,
    role: d.status === 'On_Duty' ? 'Active Paramedic' : 'On-Call Driver',
    vehicle: 'DHA-11-9922'
  })));
  const [activeDriver, setActiveDriver] = useState(availableDrivers[0] || null);
  const [activePatient, setActivePatient] = useState(mockData.patients[0] || { id: 1, name: 'Abdur Rahman' });
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [drvRes, patRes] = await Promise.all([
          fetch('/api/drivers'),
          fetch('/api/patients')
        ]);
        
        const dbDrivers = await drvRes.json();
        const dbPatients = await patRes.json();
        
        if (!isMounted) return;

        if (Array.isArray(dbDrivers) && dbDrivers.length > 0) {
           const formattedDrivers = dbDrivers.map((d, index) => ({
              id: d.driver_id,
              name: d.name,
              license: d.license_no,
              status: d.shift_status,
              role: d.shift_status === 'On_Duty' ? 'Active Paramedic' : 'On-Call Driver'
           }));
           setAvailableDrivers(formattedDrivers);
           
           const saved = localStorage.getItem('emergency_active_driver');
           let current;
           if (saved) {
             current = formattedDrivers.find(x => x.id === parseInt(saved));
           }
           setActiveDriver(current || formattedDrivers[0]);
        }

        if (Array.isArray(dbPatients) && dbPatients.length > 0) {
           setActivePatient({ id: dbPatients[0].patient_id, name: dbPatients[0].name });
        }
      } catch (err) {
        console.error('Failed to load portal data', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  const setDriver = (driverId) => {
    const d = availableDrivers.find(x => x.id === parseInt(driverId));
    if (d) {
      setActiveDriver(d);
      localStorage.setItem('emergency_active_driver', d.id.toString());
    }
  };

  return (
    <UserContext.Provider value={{ activeDriver, setDriver, availableDrivers, activePatient, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
