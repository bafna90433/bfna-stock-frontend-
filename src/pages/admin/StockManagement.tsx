import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Plus, Edit, Loader, X, Save,
  ArrowUp, TrendingDown, Tag, Lock,
} from 'lucide-react';
import SmartStockInput from '../../components/SmartStockInput';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { debounce } from '../../utils/debounce';
import { useAuthStore } from '../../store/authStore';

const StockManagement: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const isStockMgr = user?.role === 'stock_manager';

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockModal, setStockModal] = useState<any>(null);
  const [editModal, setEditModal] = useState<any>(null);
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    name: '',
    category: '',
    unit: '',
    description: '',
    wholesalerPrice: '',
    retailerPrice: '',
    pcsPerInner: '1',
    innerPerCarton: '1',
    stock: '',
  });
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(console.error);
  }, []);

  const fetchProducts = useCallback(
    debounce(async (q: string) => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products?search=${encodeURIComponent(q)}&limit=100`);
        setProducts(data.products);
      } catch {}
      finally { setLoading(false); }
    }, 350),
    []
  );

  useEffect(() => { fetchProducts(search); }, [search]);

  const handleStockAdd = async () => {
    if (!qty || Number(qty) <= 0) return toast.error('Enter valid quantity');
    setSubmitting(true);
    try {
      await api.patch(`/products/${stockModal.product._id}/stock`, {
        qty: Number(qty),
        operation: 'add',
      });
      toast.success('Stock added successfully');
      setStockModal(null);
      setQty('');
      fetchProducts(search);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Stock update failed');
    } finally { setSubmitting(false); }
  };

  const openEdit = (p: any) => {
    setEditForm({
      name: p.name,
      category: p.category || '',
      unit: p.unit,
      description: p.description || '',
      wholesalerPrice: p.wholesalerPrice ? String(p.wholesalerPrice) : '',
      retailerPrice: p.retailerPrice ? String(p.retailerPrice) : '',
      pcsPerInner: String(p.pcsPerInner || 1),
      innerPerCarton: String(p.innerPerCarton || 1),
      stock: String(p.stock?.availableQty || 0),
    });
    setEditModal(p);
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      await api.put(`/products/${editModal._id}`, {
        name: editForm.name,
        category: editForm.category,
        unit: editForm.unit,
        description: editForm.description,
        wholesalerPrice: Number(editForm.wholesalerPrice) || 0,
        retailerPrice: Number(editForm.retailerPrice) || 0,
        pricePerUnit: Number(editForm.retailerPrice) || 0,
        pcsPerInner: Number(editForm.pcsPerInner) || 1,
        innerPerCarton: Number(editForm.innerPerCarton) || 1,
      });
      // If stock value changed, update it separately
      const newStock = Number(editForm.stock) || 0;
      const currentStock = editModal.stock?.availableQty || 0;
      if (newStock !== currentStock) {
        const diff = newStock - currentStock;
        await api.patch(`/products/${editModal._id}/stock`, {
          qty: Math.abs(diff),
          operation: diff >= 0 ? 'add' : 'remove',
        });
      }
      toast.success('Product updated!');
      setEditModal(null);
      fetchProducts(search);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSubmitting(false); }
  };

  const lowStock = products.filter(p => (p.stock?.availableQty || 0) > 0 && (p.stock?.availableQty || 0) < 5).length;
  const outOfStock = products.filter(p => (p.stock?.availableQty || 0) === 0).length;
  const noPriceCount = products.filter(p => !p.wholesalerPrice && !p.retailerPrice).length;

  const addProductLink = isStockMgr ? '/stock-manager/add-product' : '/admin/products';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Management</h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Manage stock levels and set wholesaler / retailer pricing'
              : 'View stock levels — pricing is set by Admin'}
          </p>
        </div>
        {(isAdmin || isStockMgr) && (
          <a href={addProductLink} className="btn btn-primary">
            <Package size={16} /> Add Product
          </a>
        )}
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card" style={{ ['--gradient' as any]: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--primary)' }}>
            <Package size={22} />
          </div>
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="stat-card" style={{ ['--gradient' as any]: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--warning)' }}>
            <TrendingDown size={22} />
          </div>
          <div className="stat-value">{lowStock}</div>
          <div className="stat-label">Low Stock (&lt;5)</div>
        </div>
        <div className="stat-card" style={{ ['--gradient' as any]: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)' }}>
            <TrendingDown size={22} />
          </div>
          <div className="stat-value">{outOfStock}</div>
          <div className="stat-label">Out of Stock</div>
        </div>
        <div className="stat-card" style={{ ['--gradient' as any]: 'linear-gradient(135deg, #06B6D4, #0E7490)' }}>
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--secondary)' }}>
            <Tag size={22} />
          </div>
          <div className="stat-value">{noPriceCount}</div>
          <div className="stat-label">Pricing Pending</div>
        </div>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div className="search-bar" style={{ maxWidth: '100%' }}>
          <Search size={16} className="search-icon" />
          <input
            className="form-control"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <div className="empty-title">No products found</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Wholesaler ₹</th>
                  <th>Retailer ₹</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const wp = Number(p.wholesalerPrice) || 0;
                  const rp = Number(p.retailerPrice) || 0;
                  const noPrice = wp === 0 && rp === 0;
                  return (
                    <tr key={p._id}>
                      <td>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} alt={p.name} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.sku}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.category || '—'}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>
                        {p.unit}
                        {(p.pcsPerInner > 1 || p.innerPerCarton > 1) && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>
                            1ctn={p.innerPerCarton}×{p.pcsPerInner}pcs
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {wp > 0
                          ? <span style={{ color: 'var(--primary)' }}>₹{wp.toFixed(2)}</span>
                          : <span style={{ color: 'var(--text-dim)', fontWeight: 500, fontSize: '0.78rem' }}>Not set</span>}
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {rp > 0
                          ? <span style={{ color: 'var(--primary)' }}>₹{rp.toFixed(2)}</span>
                          : <span style={{ color: 'var(--text-dim)', fontWeight: 500, fontSize: '0.78rem' }}>Not set</span>}
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: (p.stock?.availableQty || 0) === 0 ? 'var(--danger)' :
                            (p.stock?.availableQty || 0) < 5 ? 'var(--warning)' : 'var(--success)',
                        }}>
                          {p.stock?.availableQty || 0}
                        </span>
                        {(p.stock?.availableQty || 0) === 0 && (
                          <span className="badge status-pending" style={{ marginLeft: 6, fontSize: '0.62rem' }}>Out</span>
                        )}
                        {(p.stock?.availableQty || 0) > 0 && (p.stock?.availableQty || 0) < 5 && (
                          <span className="badge status-partial" style={{ marginLeft: 6, fontSize: '0.62rem' }}>Low</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {/* Single Edit button — opens combined modal */}
                          {isAdmin ? (
                            <button
                              className="btn btn-sm"
                              title="Edit Product"
                              onClick={() => openEdit(p)}
                              style={{
                                background: noPrice
                                  ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                                  : 'var(--primary-50)',
                                color: noPrice ? 'white' : 'var(--primary)',
                                padding: '0.4rem 0.75rem',
                                fontWeight: 700,
                                gap: '0.3rem',
                                boxShadow: noPrice ? '0 4px 12px -4px rgba(245,158,11,0.5)' : 'none',
                              }}
                            >
                              <Edit size={13} />
                              {noPrice ? 'Set Price' : 'Edit'}
                            </button>
                          ) : (
                            <>
                              <button
                                className="btn btn-secondary btn-icon btn-sm"
                                title="Edit Product"
                                onClick={() => openEdit(p)}
                              >
                                <Edit size={14} />
                              </button>
                              <span
                                title="Only Admin can set price"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                  padding: '0.35rem 0.6rem', borderRadius: 8,
                                  background: 'rgba(245,158,11,0.1)', color: '#B45309',
                                  fontSize: '0.72rem', fontWeight: 700,
                                }}
                              >
                                <Lock size={12} /> Price: Admin
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {stockModal && (
        <div className="modal-overlay" onClick={() => setStockModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <ArrowUp size={18} color="var(--success)" /> Add Stock
              </h3>
              <button className="modal-close" onClick={() => setStockModal(null)}><X size={16} /></button>
            </div>
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--bg3)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {stockModal.product.imageUrl && (
                  <img src={stockModal.product.imageUrl} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} alt="" />
                )}
                <div>
                  <div style={{ fontWeight: 700 }}>{stockModal.product.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stockModal.product.sku}</div>
                  <div style={{ fontSize: '0.8rem', marginTop: 2 }}>
                    Current Stock: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{stockModal.product.stock?.availableQty || 0} {stockModal.product.unit}</span>
                  </div>
                </div>
              </div>
            </div>
            <SmartStockInput
              pcsPerInner={Number(stockModal.product.pcsPerInner) || 1}
              pcsPerCarton={Number(stockModal.product.innerPerCarton) || 1}
              value={Number(qty) || 0}
              onChange={total => setQty(String(total))}
              label="Quantity to Add"
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setStockModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleStockAdd} disabled={submitting}>
                {submitting
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                  : <><Save size={16} /> Add Stock</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Combined Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title"><Edit size={18} /> Edit Product</h3>
              <button className="modal-close" onClick={() => setEditModal(null)}><X size={16} /></button>
            </div>

            {/* Product info strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)' }}>
              {editModal.imageUrl && (
                <img src={editModal.imageUrl} style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover' }} alt="" />
              )}
              <div>
                <div style={{ fontWeight: 700 }}>{editModal.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{editModal.sku}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Stock:</span>
                  <input
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={e => setEditForm({ ...editForm, stock: e.target.value })}
                    style={{
                      width: 80, padding: '2px 8px', borderRadius: 6, border: '1.5px solid var(--border)',
                      fontWeight: 800, fontSize: '0.88rem', textAlign: 'center',
                      background: 'var(--bg)', color: Number(editForm.stock) === 0 ? 'var(--danger)'
                        : Number(editForm.stock) < 5 ? 'var(--warning)' : 'var(--success)',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{editModal.unit}</span>
                </div>
              </div>
            </div>

            {/* — Product Details — */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: '0.6rem' }}>
              Product Details
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                  <option value="" disabled>Select Category</option>
                  {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* — Packaging — */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0.75rem 0 0.6rem' }}>
              📦 Packaging
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Pcs Per Inner</label>
                <input
                  className="form-control"
                  type="number" min="1"
                  value={editForm.pcsPerInner}
                  onChange={e => setEditForm({ ...editForm, pcsPerInner: e.target.value })}
                  placeholder="e.g. 10"
                  style={{ fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>1 Inner = ? Pcs</p>
              </div>
              <div className="form-group">
                <label className="form-label">Pcs Per Carton</label>
                <input
                  className="form-control"
                  type="number" min="1"
                  value={editForm.innerPerCarton}
                  onChange={e => setEditForm({ ...editForm, innerPerCarton: e.target.value })}
                  placeholder="e.g. 20"
                  style={{ fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>1 Carton = ? Pcs</p>
              </div>
            </div>

            {/* — Pricing (Admin only) — */}
            {isAdmin && (
              <>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0.75rem 0 0.6rem' }}>
                  💰 Pricing
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Wholesaler Price (₹)</label>
                    <input
                      className="form-control"
                      type="number" min="0" step="0.01"
                      value={editForm.wholesalerPrice}
                      onChange={e => setEditForm({ ...editForm, wholesalerPrice: e.target.value })}
                      placeholder="0.00"
                      style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Retailer Price (₹)</label>
                    <input
                      className="form-control"
                      type="number" min="0" step="0.01"
                      value={editForm.retailerPrice}
                      onChange={e => setEditForm({ ...editForm, retailerPrice: e.target.value })}
                      placeholder="0.00"
                      style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
                <div style={{ padding: '0.65rem 1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#047857', marginBottom: '1rem' }}>
                  💡 Prices auto-apply when Sale Staff selects customer type while creating an order.
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEdit} disabled={submitting}>
                {submitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default StockManagement;
