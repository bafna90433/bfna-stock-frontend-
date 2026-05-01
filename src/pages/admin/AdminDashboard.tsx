import React, { useEffect, useState, useCallback } from 'react';
import { ShoppingCart, Clock, Truck, Receipt, CheckCircle, Users, BarChart3, ArrowUpRight, ArrowRight } from 'lucide-react';
import DashboardHero from '../../components/DashboardHero';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import OrderPreviewModal from '../../components/OrderPreviewModal';
import UrgentNotifBanner from '../../components/UrgentNotifBanner';

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>({});
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data.stats);
      setRecentActivity(data.recentActivity);
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const statCards = [
    { label: 'Total Orders',  value: stats.total,      icon: <ShoppingCart size={18} />, color: '#6366F1', bg: 'rgba(99,102,241,0.1)'  },
    { label: 'Pending',       value: stats.pending,    icon: <Clock size={18} />,        color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Dispatched',    value: stats.dispatched, icon: <Truck size={18} />,        color: '#06B6D4', bg: 'rgba(6,182,212,0.1)'   },
    { label: 'Billed',        value: stats.billed,     icon: <Receipt size={18} />,      color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)'  },
    { label: 'Paid',          value: stats.paid,       icon: <CheckCircle size={18} />,  color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
  ];

  const quickActions = [
    { label: 'Manage Users',    icon: <Users size={15} />,        to: '/admin/users',           color: '#6366F1' },
    { label: 'Stock Management',icon: <BarChart3 size={15} />,    to: '/admin/stock',           color: '#10B981' },
    { label: 'Make Sales Order',icon: <ShoppingCart size={15} />, to: '/sale-staff/direct-order', color: '#F59E0B' },
    { label: 'Dispatch',        icon: <ShoppingCart size={15} />, to: '/dispatch/orders',       color: '#06B6D4' },
  ];

  const statusColors: Record<string, { bg: string; color: string }> = {
    pending:    { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
    partial:    { bg: 'rgba(6,182,212,0.12)',   color: '#06B6D4' },
    dispatched: { bg: 'rgba(99,102,241,0.12)',  color: '#6366F1' },
    billed:     { bg: 'rgba(139,92,246,0.12)',  color: '#8B5CF6' },
    paid:       { bg: 'rgba(16,185,129,0.12)',  color: '#10B981' },
  };

  return (
    <div style={{ padding: '1.75rem 2rem', width: '100%', boxSizing: 'border-box' }}>
      <UrgentNotifBanner />

      <DashboardHero
        title="Admin Dashboard"
        subtitle="Full system overview — orders, dispatches, billing, stock & users."
        onRefresh={() => fetchData(true)}
        refreshing={refreshing}
        stats={[
          { label: 'Total Orders', value: loading ? '—' : stats.total ?? 0, color: '#6366F1' },
          { label: 'Pending', value: loading ? '—' : stats.pending ?? 0, color: '#F59E0B' },
          { label: 'Dispatched', value: loading ? '—' : stats.dispatched ?? 0, color: '#06B6D4' },
          { label: 'Paid', value: loading ? '—' : stats.paid ?? 0, color: '#10B981' },
        ]}
        actions={[
          { label: 'User Management', icon: <Users size={15} />, to: '/admin/users', variant: 'secondary' },
          { label: 'Stock Management', icon: <BarChart3 size={15} />, to: '/admin/stock', variant: 'primary' },
        ]}
      />
      </div>

      {/* 5 Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {statCards.map((s) => (
          <div key={s.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderLeft: `4px solid ${s.color}`,
            borderRadius: 'var(--radius)', padding: '1.1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.85rem',
            boxShadow: 'var(--shadow-xs)', transition: 'all 0.18s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-xs)'; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 9, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1.2, fontFamily: 'Outfit, sans-serif' }}>
                {loading ? '—' : s.value ?? 0}
              </div>
            </div>
            <ArrowUpRight size={13} style={{ color: s.color, opacity: 0.4, flexShrink: 0 }} />
          </div>
        ))}
      </div>

      {/* Quick Actions bar */}
      <div style={{
        display: 'flex', gap: '0.75rem', marginBottom: '1.25rem',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '0.85rem 1.25rem', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>Quick Actions</span>
        <div style={{ width: 1, height: 24, background: 'var(--border)', marginRight: '0.5rem' }} />
        {quickActions.map((a) => (
          <Link key={a.label} to={a.to} style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            textDecoration: 'none', color: a.color,
            fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = a.color; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLElement).style.color = a.color; }}
          >
            {a.icon} {a.label}
          </Link>
        ))}
      </div>

      {/* Recent System Activity Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Recent System Activity</div>
          <Link to="/dispatch/orders" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
        ) : recentActivity.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', opacity: 0.2 }}>📊</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>No recent activity</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                {['Order #', 'Customer', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '0.45rem 1.25rem', textAlign: 'left', fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((o: any, i: number) => {
                const sc = statusColors[o.status] || { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' };
                return (
                  <tr key={o._id}
                    onClick={() => setPreviewOrderId(o._id)}
                    style={{ borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    <td style={{ padding: '0.5rem 1.25rem', fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem' }}>{o.orderNumber}</td>
                    <td style={{ padding: '0.5rem 1.25rem', fontWeight: 600, fontSize: '0.82rem' }}>{o.customerName}</td>
                    <td style={{ padding: '0.5rem 1.25rem' }}>
                      <span style={{ fontSize: '0.67rem', fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: sc.bg, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 1.25rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <OrderPreviewModal
        isOpen={!!previewOrderId}
        onClose={() => setPreviewOrderId(null)}
        orderId={previewOrderId}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdminDashboard;
