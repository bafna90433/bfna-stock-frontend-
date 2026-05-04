import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, ShoppingCart, Plus, Truck, RefreshCw } from 'lucide-react';
import DashboardHero from '../../components/DashboardHero';
import api from '../../api/axios';
import UrgentNotifBanner from '../../components/UrgentNotifBanner';
import { useAuthStore } from '../../store/authStore';
import { Link, useLocation } from 'react-router-dom';
import OrderPreviewModal from '../../components/OrderPreviewModal';

const StaffDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [stats, setStats] = useState<any>({});
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.get('/orders/stats/summary'),
        api.get('/orders?limit=20'),
      ]);
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data.orders || []);
    } catch { }
    finally { setLoading(false); }
  };

  // Re-fetch every time we navigate to this page (e.g. after creating an order)
  useEffect(() => { fetchData(); }, [location.key]);

  const statCards = [
    { label: 'Total Orders', value: stats.total, icon: <ShoppingCart size={22} />, color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Pending', value: stats.pending, icon: <Clock size={22} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Dispatched', value: stats.dispatched, icon: <Truck size={22} />, color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
    { label: 'Paid', value: stats.paid, icon: <CheckCircle size={22} />, color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  ];

  const statusColor: Record<string, string> = {
    pending: '#F59E0B', processing: '#6366F1',
    dispatched: '#06B6D4', delivered: '#10B981',
    paid: '#10B981', cancelled: '#EF4444',
  };

  return (
    <div className="page-container">
      <UrgentNotifBanner />
      <DashboardHero
        title="Sales Staff Portal"
        subtitle="Create orders, track deliveries, and manage customer requests."
        onRefresh={fetchData}
        stats={[
          { label: 'Total Orders', value: loading ? '—' : stats.total ?? 0, color: '#6366F1' },
          { label: 'Pending', value: loading ? '—' : stats.pending ?? 0, color: '#F59E0B' },
          { label: 'Dispatched', value: loading ? '—' : stats.dispatched ?? 0, color: '#06B6D4' },
          { label: 'Paid', value: loading ? '—' : stats.paid ?? 0, color: '#10B981' },
        ]}
        actions={[
          { label: 'Manage Orders', icon: <ShoppingCart size={15} />, to: '/sale-staff/manage-orders', variant: 'secondary' },
          { label: 'New Sales Order', icon: <Plus size={15} />, to: '/sale-staff/direct-order', variant: 'primary' },
        ]}
        showBell
      />

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map(s => (
          <div key={s.label} className="stat-card" style={{ ['--gradient' as any]: `linear-gradient(135deg, ${s.color}, ${s.color}88)` }}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-value">{loading ? '—' : s.value || 0}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Recent Orders</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click row to preview details</span>
        </div>

        {loading ? (
          <div className="loading-page" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : recentOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <div className="empty-title">No orders yet</div>
            <div className="empty-text">Create a new order to get started.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => {
                  const amount = o.totalAmount
                    ?? o.items?.reduce((s: number, i: any) => s + (i.totalPrice || 0), 0)
                    ?? 0;
                  const color = statusColor[o.status] || '#6366F1';
                  return (
                    <tr key={o._id} onClick={() => setPreviewOrderId(o._id)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{o.orderNumber}</td>
                      <td style={{ fontWeight: 600 }}>{o.customerName}</td>
                      <td>
                        <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                          {o.customerType || 'retailer'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                        {o.items?.length || 0} items
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                        ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                          background: `${color}20`, color, textTransform: 'capitalize',
                        }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

export default StaffDashboard;
