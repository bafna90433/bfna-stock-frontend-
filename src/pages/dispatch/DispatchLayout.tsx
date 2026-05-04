import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import DispatchSidebar from './DispatchSidebar';
import TopHeader from '../../components/TopHeader';

const DispatchLayout: React.FC = () => {
  const { user, token } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || !token) return <Navigate to="/login" replace />;
  if (user.role !== 'dispatch' && user.role !== 'admin') return <Navigate to="/unauthorized" replace />;

  return (
    <div className="app-layout">
      <DispatchSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopHeader onMenuClick={() => setSidebarOpen(true)} />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DispatchLayout;
