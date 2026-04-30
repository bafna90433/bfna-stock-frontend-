import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Edit2, Trash2, FileText, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import OrderPreviewModal from '../../components/OrderPreviewModal';

const PauseCircle = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="10" y1="15" x2="10" y2="9" />
    <line x1="14" y1="15" x2="14" y2="9" />
  </svg>
);

const statusColors: Record<string, { color: string, bg: string, icon: any }> = {
  pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <Clock size={12} /> },
  waiting: { color: '#6366F1', bg: 'rgba(99,102,241,0.12)', icon: <PauseCircle size={12} /> },
  partial: { color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', icon: <CheckCircle size={12} /> },
  dispatched: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircle size={12} /> },
  billed: { color: '#6366F1', bg: 'rgba(99,102,241,0.12)', icon: <FileText size={12} /> },
  paid: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircle size={12} /> },
  cancelled: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: <XCircle size={12} /> },
};

const ManageOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get(`/orders`, {
        params: { search, status, page, limit }
      });
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/sale-staff/edit-order/${id}`);
  };


  const totalPages = Math.ceil(total / limit);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Sales Orders</h1>
          <p className="page-subtitle">View, edit, and cancel orders with filtering.</p>
        </div>
        <button className="btn btn-secondary btn-icon" onClick={() => fetchOrders(true)}>
          <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-dim)' }} />
            <input 
              className="form-control" 
              placeholder="Search by Order # or Customer Name..." 
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select className="form-control" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="waiting">Waiting (On Hold)</option>
              <option value="partial">Partial Dispatch</option>
              <option value="dispatched">Dispatched</option>
              <option value="billed">Billed</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <div className="empty-title">No orders found</div>
          <div className="empty-text">Try adjusting your search or filters.</div>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const s = statusColors[order.status] || { color: '#666', bg: '#eee', icon: <AlertCircle size={12} /> };
                  const amount = order.items?.reduce((acc: number, i: any) => acc + (i.totalQtyPcs * i.pricePerUnit * (1 + (i.gstRate || 0)/100)), 0) || 0;
                  
                  return (
                    <tr key={order._id} onClick={() => setPreviewOrderId(order._id)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{order.orderNumber}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{order.salesmanName}</div>
                      </td>
                      <td>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          padding: '3px 10px', borderRadius: 99, 
                          background: s.bg, color: s.color, 
                          fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase'
                        }}>
                          {s.icon} {order.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{order.items?.length || 0} Products</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                        ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
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
                              onClick={(e) => handleEdit(e, order._id)}
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Showing <b>{(page - 1) * limit + 1}</b> to <b>{Math.min(page * limit, total)}</b> of <b>{total}</b> orders
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  // Show current page, first, last, and neighbors
                  if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                    return (
                      <button 
                        key={p} 
                        className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    );
                  }
                  if (p === page - 2 || p === page + 2) return <span key={p}>...</span>;
                  return null;
                })}
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <OrderPreviewModal 
        isOpen={!!previewOrderId} 
        onClose={() => setPreviewOrderId(null)} 
        orderId={previewOrderId} 
      />

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn-danger-soft:hover { background: #EF4444 !important; color: #fff !important; }
      `}</style>
    </div>
  );
};

export default ManageOrders;
