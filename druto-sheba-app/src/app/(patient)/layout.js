'use client';
import PortalSidebar from '@/components/PortalSidebar';
import { Siren, MapPin, History, User, Receipt, Calendar } from 'lucide-react';

const navItems = [
  { href: '/sos', label: '🚨 Emergency SOS', icon: Siren },
  { href: '/profile', label: 'Medical Profile', icon: User },
  { href: '/track', label: 'Track Ambulance', icon: MapPin },
  { href: '/book-doctor', label: 'Book Doctor', icon: User },
  { href: '/appointments', label: 'My Appointments', icon: Calendar },
  { href: '/history', label: 'Trip History', icon: History },
  { href: '/my-bills', label: 'Billing', icon: Receipt },
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
