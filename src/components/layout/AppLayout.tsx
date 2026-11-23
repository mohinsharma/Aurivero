import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { DisclaimerBanner } from '../common/DisclaimerBanner';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // If on landing, auth, or onboarding full-screen flows, render without sidebar shell
  const isFullScreenPage = ['/', '/auth'].includes(location.pathname);

  if (isFullScreenPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* Top persistent navigation */}
      <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Collapsible Sidebar for Desktop */}
        <Sidebar />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation Drawer & Bottom Bar */}
      <MobileNav
        isMenuOpen={isMobileMenuOpen}
        onCloseMenu={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
};
