import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import VersionUpdateDialog from '../version/VersionUpdateDialog';

const Layout = () => {
  const location = useLocation();
  const isPosRoute = location.pathname === '/pos';

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className={`page-enter custom-scrollbar flex-1 overflow-y-auto ${isPosRoute ? 'p-1 lg:p-2' : 'p-6'}`}>
          <Outlet />
        </main>
      </div>
      <VersionUpdateDialog />
    </div>
  );
};

export default Layout;
