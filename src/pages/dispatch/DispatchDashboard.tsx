import React, { useEffect, useState, useCallback } from 'react';
import { Truck, Clock, CheckCircle, ArrowUpRight, ArrowRight } from 'lucide-react';
import api from '../../api/axios';
import UrgentNotifBanner from '../../components/UrgentNotifBanner';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import OrderPreviewModal from '../../components/OrderPreviewModal';
import DashboardHero from '../../components/DashboardHero';

const DispatchDashboard: React.FC = () => {
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
    { label: 'Pending Dispatch', value: stats.pendingDispatch ?? 0, icon: <Clock size={20} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', to: '/dispatch/orders' },
    { label: 'Dispatched Today', value: stats.dispatchedToday ?? 0, icon: <Truck size={20} />, color: '#10B981', bg: 'rgba(16,185,129,0.1)', to: '/dispatch/orders' },
    { label: 'Total Dispatches', value: stats.totalDispatches ?? 0, icon: <CheckCircle size={20} />, color: '#6366F1', bg: 'rgba(99,102,241,0.1)', to: '/dispatch/orders' },
  ];

  return (
    <div style={{ padding: '1.75rem 2rem', width: '100%', boxSizing: 'border-box' }}>
      <UrgentNotifBanner />

      <DashboardHero
        title="Dispatch Dashboard"
        subtitle="Track and manage outgoing orders. Mark dispatches and update delivery status."
        onRefresh={() => fetchData(true)}
        refreshing={refreshing}
        stats={[
          { label: 'Pending', value: stats.pendingDispatch ?? '—', color: '#F59E0B' },
          { label: 'Today', value: stats.dispatchedToday ?? '—', color: '#10B981' },
          { label: 'Total', value: stats.totalDispatches ?? '—', color: '#06B6D4' },
        ]}
        actions={[
          { label: 'Ready to Dispatch', icon: <Truck size={15} />, to: '/dispatch/ready', variant: 'secondary' },
          { label: 'View All Orders', icon: <Truck size={15} />, to: '/dispatch/orders', variant: 'primary' },
        ]}
      />

      {/* Stat Cards — 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        {statCards.map((s) => (
          <Link key={s.label} to={s.to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderLeft: `4px solid ${s.color}`,
              borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: 'var(--shadow-xs)', transition: 'all 0.18s', cursor: 'pointer',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-xs)'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, lineHeight: 1.2, fontFamily: 'Outfit, sans-serif' }}>
                  {loading ? '—' : s.value}
                </div>
              </div>
              <ArrowUpRight size={14} style={{ color: s.color, opacity: 0.5, flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Action bar */}
      <div style={{
        display: 'flex', gap: '0.75rem', marginBottom: '1.25rem',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '0.85rem 1.25rem', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.5rem', whiteSpace: 'nowrap' }}>Quick Actions</span>
        <div style={{ width: 1, height: 24, background: 'var(--border)', marginRight: '0.5rem' }} />
        <Link to="/dispatch/orders" style={{
          display: 'flex', alignItems: 'center', gap: '0.45rem',
          padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          textDecoration: 'none', color: '#F59E0B',
          fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F59E0B'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLElement).style.color = '#F59E0B'; }}
        >
          <Truck size={15} /> Pending Dispatches
        </Link>
      </div>

      {/* Recent Dispatches Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Recent Dispatches</div>
          <Link to="/dispatch/orders" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
        ) : recentActivity.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem', gap: '0.5rem' }}>
            <span style={{ fontSize: '2rem', opacity: 0.2 }}>📦</span>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>No recent dispatches</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                {['Dispatch #', 'Order #', 'Customer', 'Date'].map(h => (
                  <th key={h} style={{ padding: '0.45rem 1.25rem', textAlign: 'left', fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((d: any, i: number) => (
                <tr key={d._id}
                  onClick={() => setPreviewOrderId(d.orderId)}
                  style={{ borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <td style={{ padding: '0.5rem 1.25rem', fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem' }}>
                    DIS-{d._id.slice(-6).toUpperCase()}
                  </td>
                  <td style={{ padding: '0.5rem 1.25rem', fontWeight: 600, fontSize: '0.82rem' }}>{d.orderNumber}</td>
                  <td style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem' }}>{d.customerName}</td>
                  <td style={{ padding: '0.5rem 1.25rem', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {new Date(d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <OrderPreviewModal
        isOpen={!!previewOrderId}
        onClose={() => setPreviewOrderId(null)}
        orderId={previewOrderId}
      />
    </div>
  );
};

export default DispatchDashboard;
