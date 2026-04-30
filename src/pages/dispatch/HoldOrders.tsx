import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, Truck, CalendarDays, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const HoldOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/orders?status=waiting,partial&limit=100');
      setOrders(data.orders || []);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const getDaysOnHold = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending & Hold Orders</h1>
          <p className="page-subtitle">Partially dispatched orders and orders on hold</p>
        </div>
        <button onClick={() => fetchOrders(true)} title="Refresh" className="btn btn-secondary btn-icon">
          <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Summary Banner */}
      {!loading && orders.length > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.3)',
          borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <Clock size={20} color="#F59E0B" />
          <span style={{ fontWeight: 700, color: '#F59E0B', fontSize: '0.9rem' }}>
            {orders.filter(o => o.status === 'partial').length} partially dispatched &nbsp;•&nbsp;
            {orders.filter(o => o.status === 'waiting').length} on hold
          </span>
        </div>
      )}

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-title">No orders on hold</div>
          <div className="empty-text">All orders are either dispatched or pending dispatch.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {orders.map(order => {
            const isPartial = order.status === 'partial';
            const daysOnHold = getDaysOnHold(order.createdAt);
            const isUrgent = daysOnHold >= 3;
            const borderColor = isPartial ? 'rgba(99,102,241,0.4)' : isUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.35)';
            const accentColor = isPartial ? '#6366F1' : isUrgent ? '#EF4444' : '#F59E0B';

            return (
              <div key={order._id} style={{
                background: 'var(--card)',
                border: `1.5px solid ${borderColor}`,
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: 12, padding: '1.25rem 1.5rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {/* Left: order info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.95rem' }}>{order.orderNumber}</span>
                      {isPartial ? (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                          background: 'rgba(99,102,241,0.12)', color: '#6366F1',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>½ Partially Dispatched</span>
                      ) : (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                          background: 'rgba(245,158,11,0.12)', color: '#F59E0B',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>⏸ On Hold</span>
                      )}
                      {isUrgent && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                          background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                        }}>
                          <AlertCircle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {daysOnHold} days waiting
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem' }}>{order.customerName}</div>

                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>👤 {order.salesmanName || '—'}</span>
                      <span>📦 {order.items?.length} items</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CalendarDays size={13} />
                        Placed: {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {!isUrgent && daysOnHold > 0 && (
                        <span style={{ color: '#F59E0B', fontWeight: 600 }}>Waiting {daysOnHold} day{daysOnHold > 1 ? 's' : ''}</span>
                      )}
                    </div>

                    {order.estimatedDeliveryDate && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>
                        🗓 Est. Delivery: {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}

                    {order.notes && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        💬 {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Right: dispatch button */}
                  {!order.canDispatch ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/dispatch/orders/${order._id}`)}
                        style={{ background: '#EF4444', gap: '0.4rem' }}
                      >
                        🔒 View &amp; Dispatch
                      </button>
                      <span style={{ fontSize: '0.65rem', color: '#EF4444', fontWeight: 700 }}>Stock needed to dispatch</span>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/dispatch/orders/${order._id}`)}
                      style={{ background: isUrgent ? '#EF4444' : undefined, flexShrink: 0 }}
                    >
                      <Truck size={15} /> Dispatch Now
                    </button>
                  )}
                </div>

                {/* Items row */}
                {order.items?.length > 0 && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {order.items.slice(0, 6).map((item: any, idx: number) => (
                      <div key={idx} style={{
                        background: 'var(--bg3)', padding: '0.25rem 0.65rem',
                        borderRadius: 20, fontSize: '0.75rem',
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        border: '1px solid var(--border)',
                      }}>
                        {item.imageUrl && <img src={item.imageUrl} style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'cover' }} alt="" />}
                        <span style={{ fontWeight: 600 }}>{item.productName}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>×{item.qtyOrdered}</span>
                      </div>
                    ))}
                    {order.items.length > 6 && (
                      <div style={{ background: 'var(--bg3)', padding: '0.25rem 0.65rem', borderRadius: 20, fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        +{order.items.length - 6} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default HoldOrders;
