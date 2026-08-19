import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import VersionUpdateDialog from '../version/VersionUpdateDialog';

const Layout = () => {
  const location = useLocation();
  const isPosRoute = location.pathname === '/pos';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const openSidebar = () => {
    if (window.innerWidth >= 1280) {
      setSidebarCollapsed(false);
      return;
    }
    setSidebarOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
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
      <VersionUpdateDialog />
    </div>
  );
};

export default Layout;
