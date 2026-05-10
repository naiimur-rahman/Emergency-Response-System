'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import mockData from './mockData';


const UserContext = createContext();

export function UserProvider({ children }) {
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [activeDriver, setActiveDriver] = useState(null);
  const [activePatient, setActivePatient] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [drvRes, patRes] = await Promise.all([
        fetch('/api/drivers'),
        fetch('/api/patients')
      ]);
      
      const dbDrivers = await drvRes.json();
      const dbPatients = await patRes.json();
      
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
           current = formattedDrivers.find(x => String(x.id) === String(saved));
         }
         // Only set if no active driver yet, or active driver not in new list
         setActiveDriver(prev => {
            if (!prev || !formattedDrivers.find(x => String(x.id) === String(prev.id))) {
              return current ? { ...current } : formattedDrivers[0];
            } else {
              const updated = formattedDrivers.find(x => String(x.id) === String(prev.id));
              return updated ? { ...updated } : prev;
            }
         });
      }

      if (Array.isArray(dbPatients) && dbPatients.length > 0) {
         const formattedPatients = dbPatients.map(p => ({
            ...p,
            id: p.patient_id
         }));
         setAvailablePatients(formattedPatients);
         
         const saved = localStorage.getItem('emergency_active_patient');
         let current;
         if (saved) {
           current = formattedPatients.find(x => String(x.id) === String(saved));
         }
         // Only set if no active patient yet, or active patient not in new list
         setActivePatient(prev => {
            if (!prev || !formattedPatients.find(x => String(x.id) === String(prev.id))) {
              return current ? { ...current } : formattedPatients[0];
            } else {
              const updated = formattedPatients.find(x => String(x.id) === String(prev.id));
              return updated ? { ...updated } : prev;
            }
         });
      }
    } catch (err) {
      console.error('Failed to load portal data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Poll every 5s for near-real-time updates
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const setDriver = (driverId) => {
    const d = availableDrivers.find(x => String(x.id) === String(driverId));
    if (d) {
      setActiveDriver(d);
      localStorage.setItem('emergency_active_driver', d.id.toString());
    }
  };

  const setPatient = (patientId) => {
    const p = availablePatients.find(x => String(x.id) === String(patientId));
    if (p) {
      setActivePatient(p);
      localStorage.setItem('emergency_active_patient', p.id.toString());
    }
  };

  // Convenience method to add a new patient and auto-select them
  const addPatient = async (patientData) => {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData),
    });
    const newPatient = await res.json();
    await loadData();
    // Auto-select the new patient
    const newId = newPatient.patient_id || newPatient.id;
    if (newId) {
      localStorage.setItem('emergency_active_patient', String(newId));
      setActivePatient({ ...newPatient, id: newId });
    }
    return newPatient;
  };

  // Convenience method to add a new driver and auto-select them
  const addDriver = async (driverData) => {
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driverData),
    });
    const newDriver = await res.json();
    await loadData();
    const newId = newDriver.driver_id || newDriver.id;
    if (newId) {
      localStorage.setItem('emergency_active_driver', String(newId));
      setActiveDriver({ ...newDriver, id: newId, name: newDriver.name, license: newDriver.license_no, status: newDriver.shift_status || 'Off_Duty', role: 'On-Call Driver' });
    }
    return newDriver;
  };

  return (
    <UserContext.Provider value={{ 
      activeDriver, setDriver, availableDrivers, 
      activePatient, setPatient, availablePatients, 
      loading,
      refreshUserContext: loadData,
      addPatient,
      addDriver,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
