import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Edit, Save, Loader, X, Tag } from 'lucide-react';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const Products: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [editModal, setEditModal] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data)).catch(console.error);
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/products?search=${search}&limit=100`);
      setProducts(data.products);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(fetchProducts, 350);
    return () => clearTimeout(t);
  }, [search]);

  const openEdit = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    setEditForm({
      name: p.name,
      category: p.category || '',
      description: p.description || '',
      wholesalerPrice: p.wholesalerPrice ? String(p.wholesalerPrice) : '',
      retailerPrice: p.retailerPrice ? String(p.retailerPrice) : '',
      pcsPerInner: String(p.pcsPerInner || 1),
      innerPerCarton: String(p.innerPerCarton || 1),
    });
    setEditModal(p);
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      await api.put(`/products/${editModal._id}`, {
        name: editForm.name,
        category: editForm.category,
        description: editForm.description,
        wholesalerPrice: Number(editForm.wholesalerPrice) || 0,
        retailerPrice: Number(editForm.retailerPrice) || 0,
        pricePerUnit: Number(editForm.retailerPrice) || 0,
        pcsPerInner: Number(editForm.pcsPerInner) || 1,
        innerPerCarton: Number(editForm.innerPerCarton) || 1,
      });
      toast.success('Product updated!');
      setEditModal(null);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">All products in your inventory</p>
        </div>
        {(isAdmin || user?.role === 'stock_manager') && (
          <a href="/stock-manager/add-product" className="btn btn-primary" id="add-product-btn">
            <Plus size={16} /> Add Product
          </a>
        )}
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

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <div className="empty-title">No products found</div>
          <div className="empty-text">Add products to start managing inventory</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {products.map(p => {
            const wp = Number(p.wholesalerPrice) || 0;
            const rp = Number(p.retailerPrice) || 0;
            const stock = p.stock?.availableQty || 0;
            const stockColor = stock === 0 ? 'var(--danger)' : stock < 5 ? 'var(--warning)' : 'var(--success)';
            return (
              <div key={p._id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Image */}
                <div style={{ position: 'relative' }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: 180, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📦</div>
                  )}
                  {/* Stock badge on image */}
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    background: stock === 0 ? 'rgba(239,68,68,0.92)' : stock < 5 ? 'rgba(245,158,11,0.92)' : 'rgba(16,185,129,0.92)',
                    color: '#fff', borderRadius: 20, padding: '2px 10px',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {stock === 0 ? 'Out of Stock' : `Stock: ${stock}`}
                  </span>
                </div>

                {/* Details */}
                <div style={{ padding: '0.85rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{p.sku}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>{p.name}</div>
                  {p.category && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: <strong>{p.category}</strong></div>
                  )}

                  {/* Packaging */}
                  {(p.pcsPerInner > 1 || p.innerPerCarton > 1) && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {p.innerPerCarton > 1 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'var(--bg3)', borderRadius: 6, padding: '2px 8px' }}>
                          📦 1 Carton = {p.innerPerCarton} Inner
                        </span>
                      )}
                      {p.pcsPerInner > 1 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'var(--bg3)', borderRadius: 6, padding: '2px 8px' }}>
                          📫 1 Inner = {p.pcsPerInner} Pcs
                        </span>
                      )}
                    </div>
                  )}

                  {/* Prices */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <div style={{ flex: 1, background: 'rgba(99,102,241,0.07)', borderRadius: 8, padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontWeight: 600 }}>WHOLESALE</div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: wp > 0 ? 'var(--primary)' : 'var(--text-dim)' }}>
                        {wp > 0 ? `₹${wp.toFixed(2)}` : '—'}
                      </div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(16,185,129,0.07)', borderRadius: 8, padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontWeight: 600 }}>RETAIL</div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: rp > 0 ? 'var(--success)' : 'var(--text-dim)' }}>
                        {rp > 0 ? `₹${rp.toFixed(2)}` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Edit button */}
                  {(isAdmin || user?.role === 'stock_manager') && (
                    <button
                      className="btn btn-sm"
                      style={{
                        marginTop: '0.5rem',
                        background: 'var(--primary-50)',
                        color: 'var(--primary)',
                        fontWeight: 700,
                        width: '100%',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                      onClick={e => openEdit(e, p)}
                    >
                      <Edit size={13} /> Edit Product
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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

            {/* Product strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)' }}>
              {editModal.imageUrl && (
                <img src={editModal.imageUrl} style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover' }} alt="" />
              )}
              <div>
                <div style={{ fontWeight: 700 }}>{editModal.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{editModal.sku}</div>
              </div>
            </div>

            {/* Product Details */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: '0.6rem' }}>Product Details</div>
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
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-control" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </div>

            {/* Packaging */}
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0.75rem 0 0.6rem' }}>📦 Packaging</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Pcs Per Inner</label>
                <input className="form-control" type="number" min="1" value={editForm.pcsPerInner} onChange={e => setEditForm({ ...editForm, pcsPerInner: e.target.value })} style={{ fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-mono)' }} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>1 Inner = ? Pcs</p>
              </div>
              <div className="form-group">
                <label className="form-label">Pcs Per Carton</label>
                <input className="form-control" type="number" min="1" value={editForm.innerPerCarton} onChange={e => setEditForm({ ...editForm, innerPerCarton: e.target.value })} style={{ fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-mono)' }} />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>1 Carton = ? Pcs</p>
              </div>
            </div>

            {/* Pricing — Admin only */}
            {isAdmin && (
              <>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', margin: '0.75rem 0 0.6rem' }}>💰 Pricing</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Wholesaler Price (₹)</label>
                    <input className="form-control" type="number" min="0" step="0.01" value={editForm.wholesalerPrice} onChange={e => setEditForm({ ...editForm, wholesalerPrice: e.target.value })} placeholder="0.00" style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Retailer Price (₹)</label>
                    <input className="form-control" type="number" min="0" step="0.01" value={editForm.retailerPrice} onChange={e => setEditForm({ ...editForm, retailerPrice: e.target.value })} placeholder="0.00" style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }} />
                  </div>
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

export default Products;
