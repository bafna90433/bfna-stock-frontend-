import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Tags, TrendingUp, Package, LogOut, Truck, FileText, ClipboardCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface AdminSidebarProps { open?: boolean; onClose?: () => void; }

const menuItems = [
  { to: '/admin/dashboard', icon: <LayoutDashboard size={17} />, label: 'Dashboard' },
  { to: '/admin/users', icon: <Users size={17} />, label: 'User Management' },
  { to: '/admin/categories', icon: <Tags size={17} />, label: 'Categories' },
  { to: '/admin/stock', icon: <TrendingUp size={17} />, label: 'Stock Management' },
  { to: '/admin/products', icon: <Package size={17} />, label: 'Products' },
];

const portalItems = [
  { to: '/stock-manager', icon: <TrendingUp size={17} />, label: 'Stock Portal',    dot: '#10B981' },
  { to: '/sale-staff',    icon: <Users size={17} />,       label: 'Staff Portal',    dot: '#EF4444' },
  { to: '/dispatch',      icon: <Truck size={17} />,        label: 'Dispatch Portal', dot: '#06B6D4' },
  { to: '/billing',       icon: <FileText size={17} />,     label: 'Billing Portal',  dot: '#F59E0B' },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ open, onClose }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); toast.success('Logged out successfully'); navigate('/login'); };

  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }} onClick={onClose} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        {/* Admin accent top bar */}
        <div style={{ height: 3, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', flexShrink: 0 }} />
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ overflow: 'hidden', background: 'white', boxShadow: '0 8px 24px -6px rgba(99,102,241,0.6)' }}>
            <img
              src="https://ik.imagekit.io/rishii/bafnatoys/Copy%20of%20Super_Car___05_vrkphh.webp?updatedAt=1775309336739"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              alt="Logo"
            />
          </div>
          <div>
            <div className="sidebar-logo-text">Stock<span>Pro</span></div>
            <div style={{ fontSize: '0.62rem', color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px', opacity: 0.9 }}>Admin Portal</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Admin Controls</div>
          {menuItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
              <span className="nav-icon">{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
            </NavLink>
          ))}

          <div className="sidebar-section-title" style={{ marginTop: '1.5rem' }}>View Portals</div>
          {portalItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
              <span className="nav-icon" style={{ color: item.dot }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.dot, opacity: 0.85, flexShrink: 0 }} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">Administrator</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--sidebar-text)' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
