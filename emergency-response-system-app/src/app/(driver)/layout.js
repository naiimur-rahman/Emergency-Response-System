'use client';
import PortalSidebar from '@/components/PortalSidebar';
import { Navigation, CalendarClock, UserCog, History } from 'lucide-react';

const navItems = [
  { href: '/duty', label: 'Active Duty', icon: Navigation },
  { href: '/schedule', label: 'Shift Schedule', icon: CalendarClock },
  { href: '/driver-history', label: 'Trip History', icon: History },
  { href: '/settings', label: 'Profile', icon: UserCog },
];

export default function DriverLayout({ children }) {
  return (
    <div className="app-layout">
      <PortalSidebar
        portalName="Driver Portal"
        portalColor="#ff9f0a"
        portalIcon={Navigation}
        navItems={navItems}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
