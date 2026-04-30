import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Plus, Truck, CheckCircle, Clock, ShoppingBag, Users, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import api from '../../api/axios';

interface StaffSidebarProps { open?: boolean; onClose?: () => void; }

const StaffSidebar: React.FC<StaffSidebarProps> = ({ open, onClose }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/dashboard/stats');
        setUnseenCount(data.stats.unseenDeliveries || 0);
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); toast.success('Logged out successfully'); navigate('/login'); };

  const menuItems: Array<{ to: string; icon: React.ReactNode; label: string; badge?: number | null; color?: string }> = [
    { to: '/sale-staff/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/sale-staff/manage-orders', icon: <ShoppingBag size={17} />, label: 'Manage Orders' },
    { to: '/sale-staff/direct-order', icon: <Plus size={17} />, label: 'Make Sales Order' },
    { 
      to: '/sale-staff/dispatched-orders', 
      icon: <CheckCircle size={17} />, 
      label: 'Dispatched Orders',
      color: '#10B981' // Green
    },
    {
      to: '/sale-staff/pending-orders',
      icon: <Clock size={17} />,
      label: 'Pending Orders',
      color: '#EF4444', // Red
      badge: unseenCount > 0 ? unseenCount : null,
    },
    { to: '/sale-staff/fulfillment', icon: <Users size={17} />, label: 'Customer Fulfillment' },
  ];

  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }} onClick={onClose} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ overflow: 'hidden', background: 'white' }}>
            <img 
              src="https://ik.imagekit.io/rishii/bafnatoys/Copy%20of%20Super_Car___05_vrkphh.webp?updatedAt=1775309336739" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              alt="Logo" 
            />
          </div>
          <div>
            <div className="sidebar-logo-text">Stock<span>Pro</span></div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px' }}>Staff Portal</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Order Processing</div>
          {menuItems.map((item) => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} 
              onClick={onClose}
              style={({ isActive }) => ({
                color: isActive ? '#fff' : (item.color || 'var(--sidebar-text)'),
                background: isActive ? (item.color || 'var(--primary)') : 'transparent',
                borderColor: isActive ? (item.color || 'var(--primary)') : 'transparent'
              })}
            >
              <span className="nav-icon" style={{ color: 'inherit' }}>{item.icon}</span>
              <span style={{ flex: 1, fontWeight: item.color ? 700 : 500 }}>{item.label}</span>
              {item.badge && (
                <span className="sidebar-badge blinking">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'admin' ? 'Administrator' : 'Sales Staff'}</div>
            </div>
          </div>
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin/dashboard')} className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', fontSize: '0.82rem', marginBottom: '0.5rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}>
              <ArrowLeft size={15} /> Back to Admin
            </button>
          )}
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--sidebar-text)' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      <style>{`
        .sidebar-badge {
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.15rem 0.45rem;
          border-radius: 20px;
          min-width: 18px;
          text-align: center;
        }
        .blinking {
          animation: blink-animation 1s steps(5, start) infinite;
          -webkit-animation: blink-animation 1s steps(5, start) infinite;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        @keyframes blink-animation {
          to { visibility: hidden; }
        }
        @-webkit-keyframes blink-animation {
          to { visibility: hidden; }
        }
      `}</style>
    </>
  );
};

export default StaffSidebar;
