import React, { useState, useEffect } from 'react';
import { Calendar, User, Package, CheckCircle, ExternalLink } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import OrderPreviewModal from '../../components/OrderPreviewModal';

const DeliveryUpdates: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders?limit=100'); // Get recent orders
      // Filter for those with delivery dates
      const deliveryOrders = data.orders.filter((o: any) => o.estimatedDeliveryDate);
      setOrders(deliveryOrders);
    } catch (err) {
      toast.error('Failed to load delivery updates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const markAsSeen = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/mark-delivery-seen`);
      setOrders(orders.map(o => o._id === orderId ? { ...o, deliverySeenByStaff: true } : o));
      toast.success('Marked as seen');
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div><p>Loading updates...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery Updates <span style={{ color: 'var(--primary-light)' }}>🚚</span></h1>
          <p className="page-subtitle">Track estimated delivery dates sent by the dispatch team.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No delivery updates yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Updates from the dispatch team will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {orders.map(order => (
            <div
              key={order._id}
              className={`card ${!order.deliverySeenByStaff ? 'blinking-card' : ''}`}
              style={{
                borderLeft: !order.deliverySeenByStaff ? '4px solid #ef4444' : '4px solid var(--border)',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-light)', textTransform: 'uppercase' }}>
                    {order.orderNumber}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>{order.customerName}</h3>
                </div>
                {!order.deliverySeenByStaff && (
                  <span className="badge badge-danger blinking-text">NEW UPDATE</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-dim)' }}>
                  <Calendar size={16} />
                  <span>Estimated Delivery: <strong>{new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-dim)' }}>
                  <User size={16} />
                  <span>Salesman: {order.salesmanName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-dim)' }}>
                  <Package size={16} />
                  <span>Items: {order.items.length} product(s)</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {!order.deliverySeenByStaff ? (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => markAsSeen(order._id)}
                  >
                    <CheckCircle size={16} /> Mark as Seen
                  </button>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                    <CheckCircle size={16} /> Already Seen
                  </div>
                )}
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem' }}
                  title="View Order Details"
                  onClick={() => setPreviewId(order._id)}
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <OrderPreviewModal
        isOpen={!!previewId}
        orderId={previewId}
        onClose={() => setPreviewId(null)}
      />

      <style>{`
        .blinking-card {
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.15);
        }
        .blinking-text {
          animation: text-blink 1.5s infinite;
        }
        @keyframes text-blink {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default DeliveryUpdates;
