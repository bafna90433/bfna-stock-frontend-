import React, { useState, useEffect, useCallback } from 'react';
import { Truck, RefreshCw, Search, CheckCircle, Trash2, AlertTriangle, X, Clock } from 'lucide-react';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

// ── Custom Confirm Modal ──────────────────────────────────────────────────────
interface ConfirmModalProps {
  orderNumber: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ orderNumber, onConfirm, onCancel, loading }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
    animation: 'fadeIn 0.15s ease',
  }}>
    <div style={{
      background: 'var(--card, #fff)',
      borderRadius: 18,
      width: '100%', maxWidth: 420,
      boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      overflow: 'hidden',
      animation: 'slideUp 0.2s ease',
    }}>
      {/* Red top bar */}
      <div style={{ height: 5, background: 'linear-gradient(90deg,#EF4444,#F87171)' }} />

      {/* Body */}
      <div style={{ padding: '2rem 2rem 1.5rem' }}>
        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={24} color="#EF4444" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text, #0F172A)', marginBottom: 4 }}>
              Delete Dispatch?
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748B)', lineHeight: 1.5 }}>
              You are about to delete dispatch for
              <span style={{ fontWeight: 800, color: '#EF4444' }}> {orderNumber}</span>
            </div>
          </div>
        </div>

        {/* Consequences */}
        <div style={{
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
            This will:
          </div>
          {[
            '🗑️  Delete the dispatch record permanently',
            '📦  Restore stock quantities to inventory',
            '🔄  Reset order status back to pending',
          ].map((line, i) => (
            <div key={i} style={{ fontSize: '0.83rem', color: 'var(--text, #0F172A)', fontWeight: 600, marginBottom: i < 2 ? '0.4rem' : 0 }}>
              {line}
            </div>
          ))}
        </div>

        <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textAlign: 'center', marginBottom: '1.5rem' }}>
          ⚠️ This action <strong>cannot be undone</strong>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem',
              border: '1.5px solid var(--border, #E2E8F0)', background: 'var(--bg2, #F8FAFC)',
              color: 'var(--text-muted, #64748B)', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '0.75rem', borderRadius: 12, fontWeight: 800, fontSize: '0.9rem',
              border: 'none', background: loading ? '#FCA5A5' : '#EF4444',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              transition: 'all 0.15s', boxShadow: loading ? 'none' : '0 4px 15px rgba(239,68,68,0.35)',
            }}
          >
            {loading ? (
              <>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Deleting...
              </>
            ) : (
              <><Trash2 size={16} /> Yes, Delete</>
            )}
          </button>
        </div>
      </div>
    </div>

    <style>{`
      @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      @keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      @keyframes spin    { to { transform: rotate(360deg) } }
    `}</style>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const DispatchedItems: React.FC = () => {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; orderNumber: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const fetchDispatches = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/dispatch');
      setDispatches(data);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchDispatches();
    const interval = setInterval(() => fetchDispatches(true), 30000);
    return () => clearInterval(interval);
  }, [fetchDispatches]);

  const handleDeleteConfirm = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/dispatch/${confirmTarget.id}`);
      toast.success(`Dispatch ${confirmTarget.orderNumber} deleted & stock restored`);
      setDispatches(prev => prev.filter(d => d._id !== confirmTarget.id));
      setConfirmTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete dispatch');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = dispatches.filter(d =>
    d.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    d.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedDispatches = filtered.reduce((acc: any[], current) => {
    const existing = acc.find(item => item.orderNumber === current.orderNumber);
    if (existing) {
      current.items.forEach((newItem: any) => {
        const existingItem = existing.items.find((i: any) => i.productId === newItem.productId);
        if (existingItem) {
          existingItem.qtyDispatched += newItem.qtyDispatched;
          existingItem.cartonQty = (existingItem.cartonQty || 0) + (newItem.cartonQty || 0);
          existingItem.innerQty = (existingItem.innerQty || 0) + (newItem.innerQty || 0);
          existingItem.looseQty = (existingItem.looseQty || 0) + (newItem.looseQty || 0);
        } else {
          existing.items.push({ ...newItem });
        }
      });
      if (new Date(current.dispatchedAt) > new Date(existing.dispatchedAt)) {
        existing.dispatchedAt = current.dispatchedAt;
        existing.status = current.status;
      }
      return acc;
    }
    acc.push({ ...current });
    return acc;
  }, []);

  return (
    <div className="page-container">
      {/* Custom Modal */}
      {confirmTarget && (
        <ConfirmModal
          orderNumber={confirmTarget.orderNumber}
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setConfirmTarget(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Dispatched Orders</h1>
          <p className="page-subtitle">Items that have been dispatched out</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ width: 240 }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search order or customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => fetchDispatches(true)} title="Refresh" className="btn btn-secondary btn-icon">
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚚</div>
          <div className="empty-title">No dispatches yet</div>
          <div className="empty-text">Dispatched orders will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groupedDispatches.map(dispatch => {
            const isComplete = dispatch.status === 'complete';
            return (
              <div key={dispatch._id} style={{
                background: 'var(--card)',
                border: `1.5px solid ${isComplete ? 'rgba(16,185,129,0.35)' : 'rgba(99,102,241,0.35)'}`,
                borderLeft: `4px solid ${isComplete ? '#10B981' : '#6366F1'}`,
                borderRadius: 12, overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isComplete ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                      color: isComplete ? '#10B981' : '#6366F1',
                    }}>
                      {isComplete ? <CheckCircle size={18} /> : <Truck size={18} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)' }}>{dispatch.orderNumber}</span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: isComplete ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                          color: isComplete ? '#10B981' : '#6366F1', textTransform: 'uppercase',
                        }}>
                          {isComplete ? '✅ Full Dispatch' : '½ Partial Dispatch'}
                        </span>
                        {dispatch.isVerified && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                            background: '#DCFCE7', color: '#166534', border: '1px solid #10B981',
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                          }}>
                            <CheckCircle size={10} /> Checked & Verified
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem', padding: '0.6rem', background: 'var(--bg3)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <Clock size={11} />
                          <span>Ordered: {dispatch.orderId?.createdAt ? new Date(dispatch.orderId.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' · ' + new Date(dispatch.orderId.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Unknown'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#10B981', fontWeight: 700 }}>
                          <Truck size={12} />
                          <span>Dispatched: {new Date(dispatch.dispatchedAt || dispatch.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · {new Date(dispatch.dispatchedAt || dispatch.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {dispatch.orderId?.createdAt && (
                          <div style={{ marginLeft: '1.25rem', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Duration: {(() => {
                              const diff = new Date(dispatch.dispatchedAt || dispatch.createdAt).getTime() - new Date(dispatch.orderId.createdAt).getTime();
                              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                              if (days === 0 && hours === 0) return 'less than an hour';
                              return `${days > 0 ? `${days}d ` : ''}${hours}h`;
                            })()}
                          </div>
                        )}
                        {dispatch.isVerified && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#166534', fontWeight: 800, marginTop: '0.2rem', padding: '4px 8px', background: '#DCFCE7', borderRadius: 6 }}>
                            <CheckCircle size={11} />
                            <span>Verified by {dispatch.verifiedByName} at {new Date(dispatch.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: DIS badge + Admin Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg3)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      DIS-{dispatch._id.slice(-6).toUpperCase()}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setConfirmTarget({ id: dispatch._id, orderNumber: dispatch.orderNumber })}
                        title="Delete dispatch (Admin only)"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                          color: '#EF4444', borderRadius: 8, padding: '5px 10px',
                          fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Grid */}
                <div style={{ padding: '0 1.5rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                  {dispatch.items?.filter((item: any) => item.qtyDispatched > 0).map((item: any, idx: number) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                      borderRadius: 10, padding: '0.5rem 0.85rem',
                    }}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} alt={item.productName} />
                        : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📦</div>
                      }
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {item.sku}</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#10B981', marginTop: 1 }}>
                          Dispatched: {[
                            (item.cartonQty > 0) && `${item.cartonQty} CTN`,
                            (item.innerQty > 0) && `${item.innerQty} INR`,
                            (item.looseQty > 0) && `${item.looseQty} PCS`,
                          ].filter(Boolean).join(' + ') || `${item.qtyDispatched} PCS`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DispatchedItems;
