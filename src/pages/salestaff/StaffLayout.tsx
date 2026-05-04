import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import StaffSidebar from './StaffSidebar';
import NotificationBell from '../../components/NotificationBell';

const StaffLayout: React.FC = () => {
  const { user, token } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || !token) return <Navigate to="/login" replace />;
  if (user.role !== 'sale_staff' && user.role !== 'admin') return <Navigate to="/unauthorized" replace />;

  return (
    <div className="app-layout">
      <StaffSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9998 }}>
        <NotificationBell />
      </div>
      <main className="main-content no-header">
        <Outlet />
      </main>
    </div>
  );
};

export default StaffLayout;
