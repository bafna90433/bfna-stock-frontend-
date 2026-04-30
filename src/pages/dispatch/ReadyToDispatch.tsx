import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, RefreshCw, Truck, Zap } from 'lucide-react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const ReadyToDispatch: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/dispatch/ready');
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
          <h1 className="page-title">Ready to Dispatch</h1>
          <p className="page-subtitle">Orders where all items have full stock — dispatch immediately</p>
        </div>
        <button onClick={() => fetchOrders(true)} title="Refresh" className="btn btn-secondary btn-icon">
          <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Summary Banner */}
      {!loading && orders.length > 0 && (
        <div style={{
          background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.35)',
          borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <Zap size={20} color="#10B981" />
          <span style={{ fontWeight: 700, color: '#10B981', fontSize: '0.9rem' }}>
            {orders.length} order{orders.length > 1 ? 's are' : ' is'} fully stocked and ready to dispatch now!
          </span>
        </div>
      )}

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <div className="empty-title">No orders fully ready yet</div>
          <div className="empty-text">Orders will appear here once all their items have sufficient stock.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {orders.map(order => (
            <div key={order._id} style={{
              background: 'var(--card)',
              border: '1.5px solid rgba(16,185,129,0.4)',
              borderLeft: '4px solid #10B981',
              borderRadius: 12, padding: '1.25rem 1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                {/* Left info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.95rem' }}>{order.orderNumber}</span>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                      background: 'rgba(16,185,129,0.12)', color: '#10B981',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>✅ Ready</span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem' }}>{order.customerName}</div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>👤 {order.salesmanName || '—'}</span>
                    <span>📦 {order.items?.length} items</span>
                    <span>📅 {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Dispatch button */}
                <button
                  className="btn btn-lg"
                  onClick={() => navigate(`/dispatch/orders/${order._id}`)}
                  style={{ background: '#10B981', color: '#fff', border: 'none', flexShrink: 0, gap: '0.5rem' }}
                >
                  <Truck size={16} /> Dispatch Now
                </button>
              </div>

              {/* Items */}
              {order.items?.length > 0 && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} style={{
                      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                      padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem',
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                    }}>
                      {item.imageUrl && <img src={item.imageUrl} style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover' }} alt="" />}
                      <span style={{ fontWeight: 600 }}>{item.productName}</span>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>×{item.qtyOrdered}</span>
                      <CheckCircle size={12} color="#10B981" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ReadyToDispatch;
