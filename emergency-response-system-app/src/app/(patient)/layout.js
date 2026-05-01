'use client';
import PortalSidebar from '@/components/PortalSidebar';
import { Siren, MapPin, History } from 'lucide-react';

const navItems = [
  { href: '/sos', label: '🚨 Emergency SOS', icon: Siren },
  { href: '/track', label: 'Track Ambulance', icon: MapPin },
  { href: '/history', label: 'My History', icon: History },
];

export default function PatientLayout({ children }) {
  return (
    <div className="app-layout">
      <PortalSidebar
        portalName="Patient Portal"
        portalColor="#ff2d55"
        portalIcon={Siren}
        navItems={navItems}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
