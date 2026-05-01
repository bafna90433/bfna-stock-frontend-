import React, { useState, useRef, useEffect } from 'react';
import { Package, X, Save, Loader, ImageIcon, CheckCircle, Lock } from 'lucide-react';
import SmartStockInput from '../../components/SmartStockInput';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

const AddProduct: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/categories').then(res => {
      setCategories(res.data);
      if (res.data.length > 0) setForm(f => ({ ...f, category: res.data[0].name }));
    }).catch(console.error);
  }, []);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    unit: 'pcs',
    wholesalerPrice: '',
    retailerPrice: '',
    category: '',
    description: '',
    initialQty: '0',
    pcsPerInner: '1',
    innerPerCarton: '1',
  });

  const handleFileChange = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku) return toast.error('Product name and SKU are required');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('sku', form.sku);
      fd.append('unit', form.unit);
      fd.append('category', form.category);
      fd.append('description', form.description);
      fd.append('initialQty', form.initialQty);
      fd.append('pcsPerInner', form.pcsPerInner || '1');
      fd.append('innerPerCarton', form.innerPerCarton || '1');
      // GST removed (always 0)
      fd.append('gstRate', '0');
      // Prices only sent if admin
      if (isAdmin) {
        fd.append('wholesalerPrice', form.wholesalerPrice || '0');
        fd.append('retailerPrice', form.retailerPrice || '0');
        fd.append('pricePerUnit', form.retailerPrice || '0'); // legacy fallback
      }
      if (file) fd.append('image', file);
      await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(true);
      toast.success('Product added successfully!');
      setTimeout(() => {
        setSuccess(false);
        setForm({ name: '', sku: '', unit: 'pcs', wholesalerPrice: '', retailerPrice: '', category: categories[0]?.name || '', description: '', initialQty: '0', pcsPerInner: '1', innerPerCarton: '1' });
        setPreview(null);
        setFile(null);
      }, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add product');
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'pulse 1s ease-in-out infinite' }}>
            <CheckCircle size={80} color="var(--success)" strokeWidth={1.5} />
          </div>
          <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Product Added!</h2>
          <p style={{ color: 'var(--text-muted)' }}>Product saved to database successfully</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Product</h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Add new product with wholesaler & retailer prices'
              : 'Add new product to inventory — pricing will be set by Admin'}
          </p>
        </div>
        <a href="/stock-manager/products" className="btn btn-secondary">
          <Package size={16} /> View Products
        </a>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
          <div>
            {/* Product Details */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3 className="card-title">Product Details</h3>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Honda Clutch Wire" required />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU *</label>
                  <input className="form-control" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="e.g. HCW-001" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                  <option value="" disabled>Select Category</option>
                  {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              {/* Packaging Hierarchy */}
              <div style={{ padding: '0.85rem 1rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.65rem' }}>📦 Packaging Hierarchy (Carton / Inner / Pcs)</div>
                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Pcs Per Inner</label>
                    <input
                      className="form-control"
                      type="number" min="1"
                      value={form.pcsPerInner}
                      onChange={e => setForm({ ...form, pcsPerInner: e.target.value })}
                      placeholder="e.g. 12"
                    />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 3 }}>1 Inner = ? Pcs</p>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Pcs Per Carton</label>
                    <input
                      className="form-control"
                      type="number" min="1"
                      value={form.innerPerCarton}
                      onChange={e => setForm({ ...form, innerPerCarton: e.target.value })}
                      placeholder="e.g. 20"
                    />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 3 }}>1 Carton = ? Pcs</p>
                  </div>
                </div>
                {(Number(form.pcsPerInner) > 1 || Number(form.innerPerCarton) > 1) && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>
                    <span>✓ 1 Carton = {form.innerPerCarton} pcs</span>
                    <span>✓ 1 Inner = {form.pcsPerInner} pcs</span>
                  </div>
                )}
              </div>
              <SmartStockInput
                pcsPerInner={Number(form.pcsPerInner) || 1}
                pcsPerCarton={Number(form.innerPerCarton) || 1}
                value={Number(form.initialQty) || 0}
                onChange={total => setForm(f => ({ ...f, initialQty: String(total) }))}
                label="Initial Stock Qty"
              />
            </div>

            {/* Pricing Card — Admin only, locked for stock manager */}
            <div className="card" style={{ marginBottom: '1.5rem', position: 'relative', opacity: isAdmin ? 1 : 0.65 }}>
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Pricing
                  {!isAdmin && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', padding: '0.2rem 0.6rem', background: 'rgba(245,158,11,0.12)', color: '#B45309', borderRadius: '999px', fontWeight: 700 }}>
                      <Lock size={11} /> Admin Only
                    </span>
                  )}
                </h3>
              </div>
              {!isAdmin && (
                <div style={{ padding: '0.85rem 1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: '#92400E', marginBottom: '1rem' }}>
                  💡 Stock Manager can add the product without pricing. Admin will set the wholesaler & retailer prices later.
                </div>
              )}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Wholesaler Price (₹)</label>
                  <input
                    className="form-control"
                    type="number" min="0" step="0.01"
                    value={form.wholesalerPrice}
                    onChange={e => setForm({ ...form, wholesalerPrice: e.target.value })}
                    placeholder="0.00"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Retailer Price (₹)</label>
                  <input
                    className="form-control"
                    type="number" min="0" step="0.01"
                    value={form.retailerPrice}
                    onChange={e => setForm({ ...form, retailerPrice: e.target.value })}
                    placeholder="0.00"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</> : <><Save size={18} /> Save Product</>}
            </button>
          </div>

          {/* Image Upload */}
          <div>
            <div className="card" style={{ position: 'sticky', top: '1rem' }}>
              <div className="card-header">
                <h3 className="card-title"><ImageIcon size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Product Image</h3>
              </div>
              <div
                className={`image-upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
                {preview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={preview} className="upload-preview" alt="Preview" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); setFile(null); }}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'var(--danger)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">📷</div>
                    <p style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text)' }}>Drop image here</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>or click to browse • Max 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AddProduct;
