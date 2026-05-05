import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, AlertTriangle, CheckCircle, XCircle, Filter, RefreshCw, BarChart } from 'lucide-react';
import api from '../../api/axios';
import { getPortalConfig } from '../../utils/portalConfig';

const LOW_STOCK_THRESHOLD = 20;

const DispatchStock: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchParams] = useSearchParams();
  const portal = getPortalConfig();

  useEffect(() => {
    const f = searchParams.get('filter');
    if (f && ['ok', 'low', 'out'].includes(f)) {
      setActiveFilter(f);
    }
  }, [searchParams]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products?limit=500');
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching stock:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const getStockStatus = (qty: number) => {
    if (qty <= 0) return { label: 'Out of Stock', color: '#EF4444', bg: '#FEE2E2', icon: <XCircle size={14} /> };
    if (qty <= LOW_STOCK_THRESHOLD) return { label: 'Low Stock', color: '#F59E0B', bg: '#FEF3C7', icon: <AlertTriangle size={14} /> };
    return { label: 'In Stock', color: '#10B981', bg: '#DCFCE7', icon: <CheckCircle size={14} /> };
  };

  const filteredProducts = products.filter(p => {
    const productName = p.productName || '';
    const sku = p.sku || '';
    const matchesSearch = productName.toLowerCase().includes(search.toLowerCase()) || sku.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeFilter === 'all') return true;
    const qty = p.stock?.availableQty || 0;
    if (activeFilter === 'low') return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
    if (activeFilter === 'out') return qty <= 0;
    if (activeFilter === 'ok') return qty > LOW_STOCK_THRESHOLD;
    return true;
  });

  const formatBinLabel = (p: any) => {
    const stock = p.stock || {};
    const parts = [];
    if (stock.stockCartons > 0) parts.push(`${stock.stockCartons} CTN`);
    if (stock.stockInners > 0)  parts.push(`${stock.stockInners} INR`);
    if (stock.stockLoose > 0)   parts.push(`${stock.stockLoose} PCS`);
    return parts.join(' + ') || '0 PCS';
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Inventory Stock</h1>
          <p className="page-subtitle">Real-time warehouse stock levels</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStock} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(99,102,241,0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--primary)' }}>
            <BarChart size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{products.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Products</div>
          </div>
        </div>
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: '#EF4444' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444' }}>{products.filter(p => (p.stock?.availableQty || 0) <= 0).length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Out of Stock</div>
          </div>
        </div>
        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(245,158,11,0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: '#F59E0B' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E0B' }}>{products.filter(p => { const q = p.stock?.availableQty || 0; return q > 0 && q <= LOW_STOCK_THRESHOLD; }).length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Low Stock</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ background: 'white', padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            className="form-control"
            style={{ paddingLeft: '2.75rem' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'ok', 'low', 'out'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: '1px solid var(--border)',
                background: activeFilter === f ? 'var(--primary)' : 'white',
                color: activeFilter === f ? 'white' : 'var(--text)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--bg-muted)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SKU</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bin Stock</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Pcs</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, idx) => {
                const qty = p.stock?.availableQty || 0;
                const status = getStockStatus(qty);
                return (
                  <tr key={p._id} style={{ borderBottom: idx === filteredProducts.length - 1 ? 'none' : '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                          <img src={p.imageUrl || 'https://via.placeholder.com/40'} alt={p.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.productName}</div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.sku}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.4rem', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '20px', 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        background: status.bg, 
                        color: status.color 
                      }}>
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                      {formatBinLabel(p)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem' }}>
                      {qty}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontWeight: 600 }}>No products found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DispatchStock;
