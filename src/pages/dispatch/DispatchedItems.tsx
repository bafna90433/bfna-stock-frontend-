import React, { useState, useEffect, useCallback } from 'react';
import { Truck, RefreshCw, Search, CheckCircle } from 'lucide-react';
import api from '../../api/axios';

const DispatchedItems: React.FC = () => {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

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

  const filtered = dispatches.filter(d =>
    d.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    d.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  // Group filtered dispatches by orderNumber to avoid duplicates in view
  const groupedDispatches = filtered.reduce((acc: any[], current) => {
    const existing = acc.find(item => item.orderNumber === current.orderNumber);
    if (existing) {
      // Merge items
      current.items.forEach((newItem: any) => {
        const existingItem = existing.items.find((i: any) => i.productId === newItem.productId);
        if (existingItem) {
          existingItem.qtyDispatched += newItem.qtyDispatched;
        } else {
          existing.items.push({ ...newItem });
        }
      });
      // Keep latest timestamp
      if (new Date(current.dispatchedAt) > new Date(existing.dispatchedAt)) {
        existing.dispatchedAt = current.dispatchedAt;
        existing.status = current.status; // Update status to latest
      }
      return acc;
    }
    acc.push({ ...current });
    return acc;
  }, []);

  return (
    <div className="page-container">
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)' }}>{dispatch.orderNumber}</span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: isComplete ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                          color: isComplete ? '#10B981' : '#6366F1', textTransform: 'uppercase',
                        }}>
                          {isComplete ? '✅ Full Dispatch' : '½ Partial Dispatch'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        👤 {dispatch.customerName} &nbsp;•&nbsp;
                        📅 {new Date(dispatch.dispatchedAt || dispatch.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg3)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    DIS-{dispatch._id.slice(-6).toUpperCase()}
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
                          Dispatched: {item.qtyDispatched} pcs
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pending items removed as requested to avoid confusion */}
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
