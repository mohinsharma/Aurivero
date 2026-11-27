import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // If on landing or auth full-screen flows, render without sidebar shell
  const isFullScreenPage = ['/', '/auth'].includes(location.pathname);

  if (isFullScreenPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-background text-text-primary flex font-sans antialiased selection:bg-primary/15 selection:text-primary">
      {/* Full-Height Calm Left Sidebar for Desktop */}
      <Sidebar />

      {/* Right Column: Clean Top Bar + Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-background p-6 sm:p-8 lg:p-10 pb-24 lg:pb-12">
          <div className="max-w-[1280px] mx-auto w-full">
            <Outlet />
          </div>
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
