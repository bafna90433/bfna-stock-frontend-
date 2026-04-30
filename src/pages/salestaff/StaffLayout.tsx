import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import StaffSidebar from './StaffSidebar';
import TopHeader from '../../components/TopHeader';

const StaffLayout: React.FC = () => {
  const { user, token } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || !token) return <Navigate to="/login" replace />;
  if (user.role !== 'sale_staff' && user.role !== 'admin') return <Navigate to="/unauthorized" replace />;

  return (
    <div className="app-layout">
      <StaffSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <TopHeader onMenuClick={() => setSidebarOpen((p) => !p)} />
        <Outlet />
      </main>
    </div>
  );
};

export default StaffLayout;
