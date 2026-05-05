import React, { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, CalendarDays, MessageSquare, Package, TrendingUp, AlertTriangle, CheckCircle2, FileText, Edit2, XCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import OrderPreviewModal from '../../components/OrderPreviewModal';
import toast from 'react-hot-toast';

// calcTotalPcs: (carton * innerPerCarton) + (inner * pcsPerInner) + loose
// 1 CTN = innerPerCarton pcs, 1 INR = pcsPerInner pcs (independent multipliers)
const formatRemainingQty = (item: any): string => {
  const parts: string[] = [];
  const remCTN = (item.cartonQty || 0) - (item.dispatchedCartons || 0);
  const remINR = (item.innerQty || 0) - (item.dispatchedInners || 0);
  const remPCS = (item.looseQty || 0) - (item.dispatchedLoose || 0);
  
  if (remCTN > 0) parts.push(`${remCTN} CTN`);
  if (remINR > 0) parts.push(`${remINR} INR`);
  if (remPCS > 0) parts.push(`${remPCS} PCS`);
  
  return parts.join(' + ') || '0';
};
const formatQty = (item: any): string => {
  const parts: string[] = [];
  if ((item.dispatchedCartons || 0) > 0) parts.push(`${item.dispatchedCartons} CTN`);
  if ((item.dispatchedInners || 0) > 0)  parts.push(`${item.dispatchedInners} INR`);
  if ((item.dispatchedLoose || 0) > 0)   parts.push(`${item.dispatchedLoose} PCS`);
  return parts.join(' + ') || '0';
};

const formatOrderedQty = (item: any): string => {
  const parts: string[] = [];
  if (item.cartonQty > 0) parts.push(`${item.cartonQty} CTN`);
  if (item.innerQty > 0) parts.push(`${item.innerQty} INR`);
  if (item.looseQty > 0) parts.push(`${item.looseQty} PCS`);
  return parts.join(' + ') || `${item.qtyOrdered} PCS`;
};

const PendingOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/orders?status=pending,waiting,partial&limit=100');
      setOrders(data.orders || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const handleCancel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this order? Stock will be reverted.')) return;
    try {
      await api.patch(`/orders/${id}/cancel`);
      toast.success('Order cancelled and stock reverted');
      fetchOrders(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to PERMANENTLY DELETE this order? (Stock will NOT be reverted)')) return;
    try {
      await api.delete(`/orders/${id}`);
      toast.success('Order deleted');
      fetchOrders(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete order');
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const getDaysSince = (date: string) =>
    Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

  const getDelayInfo = (order: any) => {
    const daysWaiting = getDaysSince(order.createdAt);
    if (order.estimatedDeliveryDate) {
      const estDate = new Date(order.estimatedDeliveryDate);
      const today = new Date(); today.setHours(0,0,0,0); estDate.setHours(0,0,0,0);
      const diffMs = today.getTime() - estDate.getTime();
      const overdueDays = Math.floor(diffMs / 86400000);
      if (overdueDays > 0) return { type: 'overdue', days: overdueDays, label: 'Overdue', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
      if (overdueDays === 0) return { type: 'today', days: 0, label: 'Due Today', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
      const daysLeft = Math.abs(overdueDays);
      if (daysLeft <= 2) return { type: 'soon', days: daysLeft, label: 'Due Soon', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
      return { type: 'scheduled', days: daysLeft, label: 'Days Left', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' };
    }
    return { type: 'waiting', days: daysWaiting, label: 'Days Waiting', color: daysWaiting >= 5 ? '#EF4444' : daysWaiting >= 3 ? '#F59E0B' : '#6366F1', bg: daysWaiting >= 5 ? 'rgba(239,68,68,0.1)' : daysWaiting >= 3 ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)', border: daysWaiting >= 5 ? 'rgba(239,68,68,0.3)' : daysWaiting >= 3 ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)' };
  };

  const totalDelayed = orders.filter(o => {
    const d = getDelayInfo(o); return d.type === 'overdue';
  }).length;
  const maxWait = orders.reduce((max, o) => Math.max(max, getDaysSince(o.createdAt)), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending Orders</h1>
          <p className="page-subtitle">Delay tracking — estimated delivery dates & reasons from dispatch</p>
        </div>
        <button onClick={() => fetchOrders(true)} title="Refresh" className="btn btn-secondary btn-icon">
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && orders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', flexShrink: 0 }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1 }}>{orders.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Total Pending</div>
            </div>
          </div>
          <div style={{ background: 'var(--card)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', flexShrink: 0 }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1, color: totalDelayed > 0 ? '#EF4444' : 'var(--text)' }}>{totalDelayed}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Overdue</div>
            </div>
          </div>
          <div style={{ background: 'var(--card)', border: '1.5px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', flexShrink: 0 }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1 }}>{maxWait}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Max Days Wait</div>
            </div>
          </div>
          <div style={{ background: 'var(--card)', border: '1.5px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', flexShrink: 0 }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, lineHeight: 1, color: '#6366F1' }}>{orders.filter(o => o.status === 'partial').length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Partial Dispatch</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <div className="empty-title">All caught up!</div>
          <div className="empty-text">No pending or delayed orders at the moment.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {orders.map(order => {
            const isPartial = order.status === 'partial';
            const delay = getDelayInfo(order);
            const daysWaiting = getDaysSince(order.createdAt);

            const pendingItems = order.items?.filter((i: any) =>
              isPartial ? (i.qtyOrdered - (i.qtyDispatched || 0)) > 0 : true
            ) || [];
            const dispatchedItems = order.items?.filter((i: any) => (i.qtyDispatched || 0) > 0) || [];

            const leftBorderColor = delay.type === 'overdue' ? '#EF4444' : delay.type === 'today' || delay.type === 'soon' ? '#F59E0B' : isPartial ? '#6366F1' : '#10B981';
            const cardBorder = delay.type === 'overdue' ? 'rgba(239,68,68,0.25)' : delay.type === 'today' || delay.type === 'soon' ? 'rgba(245,158,11,0.25)' : 'var(--border)';

            return (
              <div key={order._id} style={{
                background: 'var(--card)',
                border: `1.5px solid ${cardBorder}`,
                borderLeft: `4px solid ${leftBorderColor}`,
                borderRadius: 12, overflow: 'hidden',
                cursor: 'pointer'
              }} onClick={() => setPreviewOrderId(order._id)}>
                {/* Main Row */}
                <div style={{ padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>

                  {/* Left: Order Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--primary)' }}>{order.orderNumber}</span>
                      <button 
                        onClick={() => navigate(`/sale-staff/invoice/${order._id}`)}
                        style={{ border: 'none', background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', padding: '4px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Print Invoice"
                      >
                        <FileText size={13} />
                      </button>
                      {isPartial ? (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', color: '#6366F1', textTransform: 'uppercase' }}>
                          ½ Partial
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', textTransform: 'uppercase' }}>
                          ⏸ On Hold
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.3rem' }}>{order.customerName}</div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      👤 {order.salesmanName || '—'} &nbsp;·&nbsp;
                      Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      &nbsp;·&nbsp; {daysWaiting === 0 ? 'today' : `${daysWaiting}d ago`}
                    </div>
                  </div>

                  {/* Center: Dispatch team update */}
                  <div style={{ flex: 2, minWidth: 220 }}>
                    {(order.estimatedDeliveryDate || order.notes) ? (
                      <div style={{
                        background: `${delay.bg}`,
                        border: `1px solid ${delay.border}`,
                        borderRadius: 10, padding: '0.7rem 1rem',
                      }}>
                        <div style={{ fontSize: '0.63rem', fontWeight: 800, color: delay.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.45rem' }}>
                          Dispatch Update
                        </div>
                        {order.estimatedDeliveryDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', marginBottom: order.notes ? '0.35rem' : 0 }}>
                            <CalendarDays size={13} color={delay.color} />
                            <span style={{ color: 'var(--text-muted)' }}>Est. Delivery:</span>
                            <span style={{ fontWeight: 700, color: delay.type === 'scheduled' ? '#10B981' : delay.color }}>
                              {new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                        {order.notes && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.8rem' }}>
                            <MessageSquare size={13} color={delay.color} style={{ marginTop: 2, flexShrink: 0 }} />
                            <span style={{ color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.45 }}>{order.notes}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        background: 'var(--bg3)', border: '1px dashed var(--border)',
                        borderRadius: 10, padding: '0.7rem 1rem',
                        fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic',
                      }}>
                        No update from dispatch team yet
                      </div>
                    )}
                  </div>

                  {/* Right: Delay Counter */}
                  <div style={{
                    flexShrink: 0, minWidth: 100,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: delay.bg, border: `1.5px solid ${delay.border}`,
                    borderRadius: 12, padding: '0.75rem 1rem', textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: delay.type === 'today' ? '1.1rem' : '2rem',
                      fontWeight: 900, lineHeight: 1,
                      color: delay.color,
                    }}>
                      {delay.type === 'today' ? 'TODAY' : delay.days}
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: delay.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.3rem', opacity: 0.85 }}>
                      {delay.type === 'overdue' ? '🔴 Overdue' : delay.type === 'today' ? '🟡 Due Today' : delay.type === 'soon' ? `🟡 ${delay.label}` : delay.type === 'scheduled' ? `🟢 ${delay.label}` : `⏳ ${delay.label}`}
                    </div>
                    {delay.type === 'overdue' && (
                      <div style={{ fontSize: '0.6rem', color: delay.color, marginTop: '0.25rem', fontWeight: 600 }}>
                        day{delay.days !== 1 ? 's' : ''} late
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <button 
                      className="btn btn-secondary btn-icon btn-sm" 
                      onClick={(e) => { e.stopPropagation(); navigate(`/sale-staff/invoice/${order._id}`); }}
                      title="Print Invoice"
                    >
                      <FileText size={14} />
                    </button>
                    {['pending', 'waiting'].includes(order.status) && (
                      <button 
                        className="btn btn-secondary btn-icon btn-sm" 
                        onClick={(e) => { e.stopPropagation(); navigate(`/sale-staff/edit-order/${order._id}`); }}
                        title="Edit Order"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {['pending', 'waiting', 'partial'].includes(order.status) && (
                      <button 
                        className="btn btn-danger-soft btn-icon btn-sm" 
                        onClick={(e) => handleCancel(e, order._id)}
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                        title="Cancel Order (Reverts Stock)"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                    {order.status === 'pending' && (
                      <button 
                        className="btn btn-danger-soft btn-icon btn-sm" 
                        onClick={(e) => handleDelete(e, order._id)}
                        style={{ background: 'rgba(239,68,68,0.05)', color: '#666', border: '1px solid #ddd' }}
                        title="Delete Order (No Stock Reversion)"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Row */}
                {(pendingItems.length > 0 || (isPartial && dispatchedItems.length > 0)) && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '0.65rem 1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {isPartial && dispatchedItems.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                          ✅ Dispatched
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {dispatchedItems.map((item: any, idx: number) => (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', gap: '0.35rem',
                              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                              borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.73rem',
                            }}>
                              {item.imageUrl && <img src={item.imageUrl} style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }} alt="" />}
                              <span style={{ fontWeight: 600 }}>{item.productName}</span>
                              <span style={{ color: '#10B981', fontWeight: 800 }}>×{formatQty(item)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingItems.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: leftBorderColor, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Package size={11} /> {isPartial ? 'Still Pending' : 'Items Ordered'} ({pendingItems.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {pendingItems.map((item: any, idx: number) => {
                            const remainingPcs = isPartial ? item.qtyOrdered - (item.qtyDispatched || 0) : item.qtyOrdered;
                            const qtyLabel = isPartial ? formatRemainingQty(item) : formatOrderedQty(item);
                            return (
                              <div key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                background: 'var(--bg3)', border: '1px solid var(--border)',
                                borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.73rem',
                              }}>
                                {item.imageUrl && <img src={item.imageUrl} style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }} alt="" />}
                                <span style={{ fontWeight: 600 }}>{item.productName}</span>
                                <span style={{ color: leftBorderColor, fontWeight: 800 }}>×{qtyLabel}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <OrderPreviewModal 
        isOpen={!!previewOrderId} 
        onClose={() => setPreviewOrderId(null)} 
        orderId={previewOrderId} 
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PendingOrders;
