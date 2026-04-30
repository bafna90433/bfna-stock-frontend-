import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { useAuthStore } from '../store/authStore';

interface ProtectedLayoutProps {
  allowedRoles?: string[];
}

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ allowedRoles }) => {
  const { user, token } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || !token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <TopHeader onMenuClick={() => setSidebarOpen((p) => !p)} />
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedLayout;
