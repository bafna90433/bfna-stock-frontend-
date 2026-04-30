import React, { useEffect, useState } from 'react';
import { X, Clock, User, Info, CheckCircle, Package, Truck, Receipt, DollarSign, XCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Edit2, Trash2 } from 'lucide-react';

interface OrderPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({ isOpen, onClose, orderId }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const isDispatchPortal = window.location.pathname.startsWith('/dispatch');
  const showPrice = !isDispatchPortal && (user?.role === 'admin' || user?.role === 'sale_staff' || user?.role === 'salesman');

  useEffect(() => {
    if (isOpen && orderId) {
      setLoading(true);
      api.get(`/orders/${orderId}`)
        .then(res => {
          setOrder(res.data);
          // Mark as seen
          api.patch(`/orders/${orderId}/mark-seen`).catch(e => console.error(e));
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, orderId]);

  const handleEdit = () => {
    if (!order) return;
    onClose();
    navigate(`/sale-staff/edit-order/${order._id}`);
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!window.confirm('Are you sure you want to cancel this order? Stock will be reverted.')) return;
    setProcessing(true);
    try {
      await api.patch(`/orders/${order._id}/cancel`);
      toast.success('Order cancelled and stock reverted');
      onClose();
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!window.confirm('Are you sure you want to PERMANENTLY DELETE this order? (Stock will NOT be reverted)')) return;
    setProcessing(true);
    try {
      await api.delete(`/orders/${order._id}`);
      toast.success('Order deleted');
      onClose();
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'var(--warning)';
      case 'dispatched': return 'var(--info)';
      case 'billed': return 'var(--primary)';
      case 'paid': return 'var(--success)';
      default: return 'var(--text-muted)';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('Created')) return <Package size={14} />;
    if (action.includes('Dispatched')) return <Truck size={14} />;
    if (action.includes('Generated')) return <Receipt size={14} />;
    if (action.includes('Payment')) return <CheckCircle size={14} />;
    return <Info size={14} />;
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', zIndex: 1000, padding: '2rem' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '100%', height: '100%', maxHeight: '95vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden' }}>
        <div className="modal-header">
          <h2 className="modal-title">Order Preview</h2>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        {loading ? (
          <div className="loading-page" style={{ flex: 1 }}><div className="spinner"></div></div>
        ) : order ? (
          <div className="modal-body" style={{ overflowY: 'auto', padding: '2rem', background: 'var(--bg)', flex: 1 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="card" style={{ padding: '1.5rem', margin: 0 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Customer Details</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.35rem' }}>{order.customerName}</div>
                {order.customerAddress?.city && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    📍 {order.customerAddress.city}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <User size={16} /> Salesman: {order.salesmanName}
                </div>
              </div>
              
              <div className="card" style={{ padding: '1.5rem', margin: 0 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Order Details</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>{order.orderNumber}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: getStatusColor(order.status), color: 'white' }}>
                    {order.status === 'dispatched' ? 'READY TO DISPATCH' : order.status.toUpperCase()}
                  </span>
                  {order.customerType && (
                    <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>{order.customerType}</span>
                  )}
                </div>
                {showPrice && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Amount</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                      ₹{order.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || 'N/A'}
                    </div>
                  </div>
                )}
                
                {/* Actions for Sales Staff / Admin */}
                {(user?.role === 'sale_staff' || user?.role === 'admin') && (
                  <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      {['pending', 'waiting'].includes(order.status) && (
                        <button onClick={handleEdit} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', gap: '0.5rem' }}>
                          <Edit2 size={16} /> Edit Order
                        </button>
                      )}
                      {['pending', 'waiting', 'partial'].includes(order.status) && (
                        <button onClick={handleCancel} disabled={processing} className="btn btn-danger-soft" style={{ flex: 1, justifyContent: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <XCircle size={16} /> {processing ? 'Processing...' : 'Cancel Order'}
                        </button>
                      )}
                    </div>
                    {order.status === 'pending' && (
                      <button onClick={handleDelete} disabled={processing} className="btn btn-danger-soft" style={{ justifyContent: 'center', gap: '0.5rem', background: 'transparent', color: '#666', border: '1px solid #ddd', fontSize: '0.8rem' }}>
                        <Trash2 size={15} /> Delete Order (Permanently)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Order Image */}
            {order.paperOrderImageUrl && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '0.75rem', fontSize: '1.05rem' }}>Order Image</h3>
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#f8f8f8' }}>
                  <img
                    src={order.paperOrderImageUrl}
                    alt="Order"
                    style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
                    onClick={() => window.open(order.paperOrderImageUrl, '_blank')}
                  />
                </div>
              </div>
            )}

            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Order Items</h3>
            <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Packaging (CTN/INR/PCS)</th>
                    <th>Ordered Qty</th>
                    <th>Dispatched Qty</th>
                    <th>Pending Breakdown</th>
                    <th>Current Stock</th>
                    {showPrice && <th>Price</th>}
                    {showPrice && <th>Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.productName} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                        )}
                        <span style={{ fontWeight: 600 }}>{item.productName}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.sku}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {item.cartonQty ? <span style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontSize: '0.75rem', fontWeight: 600 }}>{item.cartonQty} <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>CTN</span></span> : null}
                          {item.innerQty ? <span style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontSize: '0.75rem', fontWeight: 600 }}>{item.innerQty} <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>INR</span></span> : null}
                          {item.looseQty ? <span style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontSize: '0.75rem', fontWeight: 600 }}>{item.looseQty} <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PCS</span></span> : null}
                          {(!item.cartonQty && !item.innerQty && !item.looseQty) && (
                            <span style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontSize: '0.75rem', fontWeight: 600 }}>{item.qtyOrdered} <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>PCS</span></span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{item.qtyOrdered} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PCS</span></td>
                      <td style={{ fontWeight: 700, color: item.qtyDispatched >= item.qtyOrdered ? 'var(--success)' : 'var(--warning)' }}>
                        {item.qtyDispatched || 0} <span style={{ fontSize: '0.7rem' }}>PCS</span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {item.qtyOrdered > (item.qtyDispatched || 0) ? (
                          <div style={{ fontWeight: 600, color: 'var(--warning)' }}>
                            {(() => {
                              const pending = item.qtyOrdered - (item.qtyDispatched || 0);
                              const totalInCarton = (item.innerPerCarton || 1) * (item.pcsPerInner || 1);
                              const ctn = Math.floor(pending / totalInCarton);
                              let rem = pending % totalInCarton;
                              const inr = Math.floor(rem / (item.pcsPerInner || 1));
                              const lse = rem % (item.pcsPerInner || 1);
                              
                              const parts = [];
                              if (ctn > 0) parts.push(`${ctn} CTN`);
                              if (inr > 0) parts.push(`${inr} INR`);
                              if (lse > 0) parts.push(`${lse} PCS`);
                              return parts.join(' + ') || `${pending} PCS`;
                            })()}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--success)', fontWeight: 700 }}>FULLY DISPATCHED</span>
                        )}
                      </td>
                      <td>
                        {item.currentStock > 0 ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                            <CheckCircle size={12} /> {item.currentStock} pcs
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                            <XCircle size={12} /> Out of Stock
                          </div>
                        )}
                      </td>
                      {showPrice && (
                        <td style={{ fontWeight: 600 }}>₹{(item.pricePerUnit || 0).toLocaleString('en-IN')}</td>
                      )}
                      {showPrice && (
                        <td style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>
                          ₹{((item.qtyOrdered || 0) * (item.pricePerUnit || 0)).toLocaleString('en-IN')}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>History Timeline</h3>
            <div className="card" style={{ padding: '1.5rem', margin: 0 }}>
              {order.history && order.history.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {order.history.map((event: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', zIndex: 2 }}>
                          {getActionIcon(event.action)}
                        </div>
                        {i !== order.history.length - 1 && <div style={{ width: '2px', height: '100%', background: 'var(--border)', flex: 1, margin: '4px 0' }}></div>}
                      </div>
                      <div style={{ paddingBottom: i !== order.history.length - 1 ? '1.5rem' : '0' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{event.action}</div>
                        {event.details && (
                          <div style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.75rem', 
                            background: 'var(--bg3)', 
                            borderRadius: '6px', 
                            fontSize: '0.82rem', 
                            color: 'var(--text)', 
                            whiteSpace: 'pre-line',
                            border: '1px solid var(--border)'
                          }}>
                            {event.details}
                          </div>
                        )}
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <Clock size={12} /> {new Date(event.timestamp).toLocaleString('en-IN')} 
                          <span style={{ color: 'var(--border)' }}>•</span> 
                          <User size={12} /> {event.by} ({event.role})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No history available for this order.</div>
              )}
            </div>

          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Could not load order details.</div>
        )}
      </div>
    </div>
  );
};

export default OrderPreviewModal;
