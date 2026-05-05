import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Truck, LayoutDashboard, LogOut, CheckCircle, Clock, Zap, PackageCheck, ArrowLeft, Package } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { getPortalConfig } from '../../utils/portalConfig';

interface DispatchSidebarProps { open?: boolean; onClose?: () => void; }



const DispatchSidebar: React.FC<DispatchSidebarProps> = ({ open, onClose }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [unseenCount, setUnseenCount] = React.useState(0);
  const portal = getPortalConfig();
  const accentGradient = `linear-gradient(135deg, ${portal.gradientFrom}, ${portal.gradientTo})`;

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/dashboard/stats');
        setUnseenCount(data.stats.unseenOrders || 0);
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); toast.success('Logged out successfully'); navigate('/login'); };

  const menuItems = [
    { to: '/dispatch/dashboard',  icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
    { to: '/dispatch/ready',      icon: <Zap size={17} />,             label: 'Ready to Dispatch' },
    { 
      to: '/dispatch/hold',       
      icon: <Clock size={17} />,           
      label: 'Pending & Hold',
      color: '#EF4444', // Red
      badge: unseenCount > 0 ? unseenCount : null
    },
    { to: '/dispatch/dispatched', icon: <PackageCheck size={17} />, label: 'Dispatched Items', color: '#10B981' },
    { to: '/dispatch/history',    icon: <CheckCircle size={17} />,   label: 'Dispatch History' },
    { to: '/dispatch/stock',      icon: <Package size={17} />,       label: 'Inventory Stock' },
  ];

  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }} onClick={onClose} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        {/* Portal accent top bar */}
        <div style={{ height: 3, background: accentGradient, flexShrink: 0 }} />
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ overflow: 'hidden', background: 'white', boxShadow: `0 8px 24px -6px ${portal.accentColor}60` }}>
            <img
              src="https://ik.imagekit.io/rishii/bafnatoys/Copy%20of%20Super_Car___05_vrkphh.webp?updatedAt=1775309336739"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              alt="Logo"
            />
          </div>
          <div>
            <div className="sidebar-logo-text">Stock<span>Pro</span></div>
            <div style={{ fontSize: '0.62rem', color: portal.accentColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px', opacity: 0.9 }}>Dispatch Portal</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Operations</div>
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
              <div className="user-role">{user?.role === 'admin' ? 'Administrator' : 'Dispatch Team'}</div>
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
          to { opacity: 0.5; }
        }
        @-webkit-keyframes blink-animation {
          to { opacity: 0.5; }
        }
      `}</style>
    </>
  );
};

export default DispatchSidebar;
