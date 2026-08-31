import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import VersionUpdateDialog from '../version/VersionUpdateDialog';
import OfflineSyncAgent from './OfflineSyncAgent';
import SupportSessionBanner from './SupportSessionBanner';
import AnnouncementBanner from './AnnouncementBanner';
import { isSidebarInline, prefersCollapsedSidebar } from '../../utils/sidebarLayout';

const Layout = () => {
  const location = useLocation();
  const isPosRoute = location.pathname === '/pos';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(prefersCollapsedSidebar);

  // Only act on a crossing, not on every resize, so expanding the rail by hand
  // at a laptop width is not undone by the next pixel of drag.
  useEffect(() => {
    let wasCramped = prefersCollapsedSidebar();
    const onResize = () => {
      const cramped = prefersCollapsedSidebar();
      if (cramped === wasCramped) return;
      wasCramped = cramped;
      setSidebarCollapsed(cramped);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openSidebar = () => {
    if (isSidebarInline()) {
      setSidebarCollapsed(false);
      return;
    }
    setSidebarOpen(true);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-transparent">
      <SupportSessionBanner />
      <AnnouncementBanner />

      <div className="flex min-h-0 flex-1 overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isDesktopCollapsed={sidebarCollapsed}
        setIsDesktopCollapsed={setSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onOpenSidebar={openSidebar} sidebarCollapsed={sidebarCollapsed} />

        <main className={`page-enter custom-scrollbar flex-1 overflow-y-auto ${isPosRoute ? 'p-1 lg:p-2' : 'p-6'}`}>
          <Outlet />
        </main>
      </div>
      </div>
      <VersionUpdateDialog />
      <OfflineSyncAgent />
    </div>
  );
};

export default Layout;
