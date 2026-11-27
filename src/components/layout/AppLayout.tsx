import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { FloatingAIBuddy } from '../mentor/FloatingAIBuddy';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  const isFullScreenPage = ['/', '/auth'].includes(location.pathname);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.search]);

  if (isFullScreenPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-text-primary flex flex-col antialiased selection:bg-primary/20 selection:text-text-primary">
      {/* Top persistent navigation */}
      <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

      <div className="flex-1 flex min-w-0 w-full">
        {/* Persistent Collapsible Sidebar for Desktop */}
        <Sidebar />

        {/* Main Content Viewport with smooth route transitions */}
        <main
          ref={mainRef}
          onScroll={(e) => setShowScrollTop(e.currentTarget.scrollTop > 320)}
          className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden scroll-smooth p-4 sm:p-6 lg:p-8 pb-24 lg:pb-10"
        >
          <div key={location.pathname} className="max-w-7xl mx-auto w-full min-w-0 animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Smooth Return-to-Top Floating Glass Pill */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll back to top"
          className="fixed bottom-20 lg:bottom-6 left-5 z-40 p-2.5 rounded-full liquid-glass text-text-secondary hover:text-gold transition-all shadow-glass"
        >
          <ArrowUp size={16} />
        </button>
      )}

      {/* Mobile Navigation Drawer & Bottom Bar */}
      <MobileNav
        isMenuOpen={isMobileMenuOpen}
        onCloseMenu={() => setIsMobileMenuOpen(false)}
      />

      {/* Global Floating MINDMARK AI Buddy Bubble */}
      <FloatingAIBuddy />
    </div>
  );
};
