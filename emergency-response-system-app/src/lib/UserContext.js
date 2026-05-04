'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import mockData from './mockData';


const UserContext = createContext();

export function UserProvider({ children }) {
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [activeDriver, setActiveDriver] = useState(null);
  const [activePatient, setActivePatient] = useState(null);
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
           const formattedDrivers = dbDrivers.map(d => ({
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
           const formattedPatients = dbPatients.map(p => ({
              id: p.patient_id,
              name: p.name,
              blood_type: p.blood_type
           }));
           setAvailablePatients(formattedPatients);
           
           const saved = localStorage.getItem('emergency_active_patient');
           let current;
           if (saved) {
             current = formattedPatients.find(x => x.id === parseInt(saved));
           }
           setActivePatient(current || formattedPatients[0]);
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

  const setPatient = (patientId) => {
    const p = availablePatients.find(x => x.id === parseInt(patientId));
    if (p) {
      setActivePatient(p);
      localStorage.setItem('emergency_active_patient', p.id.toString());
    }
  };

  return (
    <UserContext.Provider value={{ 
      activeDriver, setDriver, availableDrivers, 
      activePatient, setPatient, availablePatients, 
      loading 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
