import React, { useState, useEffect, useCallback } from 'react';
import { Truck, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const DispatchList: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/orders?status=pending&limit=100');
      setOrders(data.orders || []);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dispatch Orders</h1>
          <p className="page-subtitle">Pending orders ready to be dispatched</p>
        </div>
        <button onClick={() => fetchOrders(true)} title="Refresh" className="btn btn-secondary btn-icon">
          <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {loading ? (
        <div className="loading-page"><div className="spinner"></div></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚚</div>
          <div className="empty-title">No pending orders</div>
          <div className="empty-text">All orders have been dispatched!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {orders.map(order => (
            <div key={order._id} className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--primary-light)', fontWeight: 800 }}>{order.orderNumber}</span>
                    <span className={`badge ${order.status === 'partial' ? 'status-partial' : order.status === 'waiting' ? 'status-waiting' : 'status-pending'}`}>
                      {order.status === 'partial' ? 'Partial' : order.status === 'waiting' ? 'On Hold' : 'Pending'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{order.customerName}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    👤 {order.salesmanName} • 📦 {order.items?.length} items • 📅 {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/dispatch/orders/${order._id}`)}
                  id={`dispatch-btn-${order._id}`}
                >
                  <Truck size={16} /> Ready to Dispatch
                </button>
              </div>

              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {order.items?.slice(0, 5).map((item: any, idx: number) => (
                  <div key={idx} style={{ background: 'var(--bg3)', padding: '0.25rem 0.6rem', borderRadius: 20, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {item.imageUrl && <img src={item.imageUrl} style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover' }} alt="" />}
                    {item.productName} <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>×{item.qtyOrdered}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DispatchList;
