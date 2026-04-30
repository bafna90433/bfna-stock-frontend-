import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import BillingSidebar from './BillingSidebar';
import TopHeader from '../../components/TopHeader';

const BillingLayout: React.FC = () => {
  const { user, token } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || !token) return <Navigate to="/login" replace />;
  if (user.role !== 'billing' && user.role !== 'admin') return <Navigate to="/unauthorized" replace />;

  return (
    <div className="app-layout">
      <BillingSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <TopHeader onMenuClick={() => setSidebarOpen((p) => !p)} />
        <Outlet />
      </main>
    </div>
  );
};

export default BillingLayout;
