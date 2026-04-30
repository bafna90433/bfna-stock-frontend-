import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ClipboardCheck, LogOut, LayoutDashboard, History } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const CheckingLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="portal-container" style={{ background: '#F1F5F9' }}>
      {/* Mobile Top Header */}
      <header style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, height: 60, 
        background: '#1E293B', color: '#fff', display: 'flex', 
        alignItems: 'center', justifyContent: 'space-between', 
        padding: '0 1.25rem', zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#3B82F6', borderRadius: 8, padding: '0.4rem' }}>
            <ClipboardCheck size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>Stock<span style={{ color: '#3B82F6' }}>Pro</span> Check</span>
        </div>
        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '0.4rem', color: '#fff' }}>
          <LogOut size={18} />
        </button>
      </header>

      {/* Main Content */}
      <main style={{ marginTop: 60, minHeight: 'calc(100vh - 60px)', padding: '1rem', boxSizing: 'border-box' }}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav style={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, 
        background: '#fff', borderTop: '1px solid #E2E8F0', 
        display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
        zIndex: 1000, paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        <NavLink to="/checking/dashboard" className={({ isActive }) => `check-nav-item${isActive ? ' active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Queue</span>
        </NavLink>
        <NavLink to="/checking/history" className={({ isActive }) => `check-nav-item${isActive ? ' active' : ''}`}>
          <History size={20} />
          <span>History</span>
        </NavLink>
      </nav>

      <style>{`
        .check-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          color: #64748B;
          font-size: 0.7rem;
          font-weight: 700;
          transition: all 0.2s;
        }
        .check-nav-item.active {
          color: #3B82F6;
        }
        .check-nav-item.active svg {
          stroke-width: 3px;
        }
      `}</style>
    </div>
  );
};

export default CheckingLayout;
