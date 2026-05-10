'use client';
import PortalSidebar from '@/components/PortalSidebar';
import { LayoutDashboard, AlertTriangle, Truck, Clock, Radio } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requests', label: 'Emergencies', icon: AlertTriangle },
  { href: '/fleet', label: 'Fleet', icon: Truck },
  { href: '/trips', label: 'Trip Logs', icon: Clock },
];

export default function DispatcherLayout({ children }) {
  return (
    <div className="app-layout">
      <PortalSidebar
        portalName="Dispatcher Portal"
        portalColor="#0a84ff"
        portalIcon={Radio}
        navItems={navItems}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
