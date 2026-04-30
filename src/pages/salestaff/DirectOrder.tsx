import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Search, Plus, Trash2, CheckCircle, Loader, ArrowLeft, Upload, X, Image as ImageIcon, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { debounce } from '../../utils/debounce';
import OrderPreviewModal from '../../components/OrderPreviewModal';

interface Product {
  _id: string;
  name: string;
  sku: string;
  imageUrl: string;
  unit: string;
  pricePerUnit: number;
  wholesalerPrice?: number;
  retailerPrice?: number;
  gstRate: number;
  pcsPerInner: number;
  innerPerCarton: number;
  stock: { availableQty: number };
}
interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string;
  unit: string;
  pcsPerInner: number;
  innerPerCarton: number;
  cartonQty: number;
  innerQty: number;
  looseQty: number;
  totalQtyPcs: number;
  qtyOrdered: number;
  pricePerUnit: number;
  gstRate: number;
  availableQty: number;
}

const DirectOrder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SALESMAN_OPTIONS = ['OMKAR', 'PARAS', 'MD', 'WHATSAPP'];

  const [customerName, setCustomerName] = useState(() => localStorage.getItem('do_customerName') || '');
  const [customerAddress, setCustomerAddress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('do_customerAddress') || '{}'); } catch { return {}; }
  });
  const [customerType, setCustomerType] = useState<'wholesaler' | 'retailer'>(() => (localStorage.getItem('do_customerType') as any) || 'retailer');
  const [salesmanSelect, setSalesmanSelect] = useState(() => localStorage.getItem('do_salesmanSelect') || '');
  const [salesmanOther, setSalesmanOther] = useState(() => localStorage.getItem('do_salesmanOther') || '');
  const [transportName, setTransportName] = useState(() => localStorage.getItem('do_transportName') || '');
  const [notes, setNotes] = useState(() => localStorage.getItem('do_notes') || '');

  // Resolve final salesman name based on dropdown + other input
  const salesmanName = salesmanSelect === 'other' ? salesmanOther : salesmanSelect;
  const [applyGst, setApplyGst] = useState(false);
  const [defaultGst, setDefaultGst] = useState(18);

  const [items, setItems] = useState<OrderItem[]>(() => {
    try { const s = localStorage.getItem('do_items'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchRecentOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data } = await api.get('/orders?limit=5');
      setRecentOrders(data.orders || []);
    } catch { }
    finally { setLoadingOrders(false); }
  };

  useEffect(() => { fetchRecentOrders(); }, []);

  // Order image
  const [orderImage, setOrderImage] = useState<File | null>(null);
  const [orderImagePreview, setOrderImagePreview] = useState<string | null>(null);

  const searchProducts = useCallback(
    debounce(async (q: string) => {
      if (!q.trim() || q.length < 1) { setSearchResults([]); return; }
      setSearching(true);
      try {
        const { data } = await api.get(`/products?search=${encodeURIComponent(q)}&limit=8`);
        setSearchResults(data.products);
      } catch { }
      finally { setSearching(false); }
    }, 350),
    []
  );

  useEffect(() => { searchProducts(searchQuery); }, [searchQuery]);

  // Load existing order if in edit mode
  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const { data } = await api.get(`/orders/${id}`);
          if (data.status !== 'pending' && data.status !== 'waiting') {
            toast.error('Cannot edit order in current status');
            navigate('/sale-staff/dashboard');
            return;
          }
          setCustomerName(data.customerName);
          setCustomerAddress(data.customerAddress || {});
          setCustomerType(data.customerType || 'retailer');
          setItems(data.items || []);
          
          if (SALESMAN_OPTIONS.includes(data.salesmanName)) {
            setSalesmanSelect(data.salesmanName);
          } else if (data.salesmanName) {
            setSalesmanSelect('other');
            setSalesmanOther(data.salesmanName);
          }
          
          setNotes(data.notes || '');
          if (data.paperOrderImageUrl) setOrderImagePreview(data.paperOrderImageUrl);
          
          const hasGst = data.items.some((i: any) => i.gstRate > 0);
          if (hasGst) {
            setApplyGst(true);
            setDefaultGst(data.items.find((i: any) => i.gstRate > 0)?.gstRate || 18);
          }
        } catch (err) {
          toast.error('Failed to load order');
          navigate('/sale-staff/dashboard');
        }
      })();
    }
  }, [id, isEdit, navigate]);

  // ── Persist to localStorage (only if NOT editing) ──
  useEffect(() => { if (!isEdit) localStorage.setItem('do_items', JSON.stringify(items)); }, [items, isEdit]);
  useEffect(() => { if (!isEdit) localStorage.setItem('do_customerName', customerName); }, [customerName, isEdit]);
  useEffect(() => { if (!isEdit) localStorage.setItem('do_customerAddress', JSON.stringify(customerAddress)); }, [customerAddress, isEdit]);
  useEffect(() => { if (!isEdit) localStorage.setItem('do_customerType', customerType); }, [customerType, isEdit]);
  useEffect(() => { if (!isEdit) localStorage.setItem('do_salesmanSelect', salesmanSelect); }, [salesmanSelect, isEdit]);
  useEffect(() => { if (!isEdit) localStorage.setItem('do_salesmanOther', salesmanOther); }, [salesmanOther, isEdit]);
  useEffect(() => { if (!isEdit) localStorage.setItem('do_transportName', transportName); }, [transportName, isEdit]);
  useEffect(() => { if (!isEdit) localStorage.setItem('do_notes', notes); }, [notes, isEdit]);

  // Pick price based on customer type
  const pickPrice = (p: Product): number => {
    if (customerType === 'wholesaler') {
      return Number(p.wholesalerPrice) || Number(p.pricePerUnit) || 0;
    }
    return Number(p.retailerPrice) || Number(p.pricePerUnit) || 0;
  };

  // When customer type changes, re-price all existing items
  useEffect(() => {
    if (items.length === 0) return;
    (async () => {
      const ids = items.map(i => i.productId);
      try {
        const fresh = await Promise.all(ids.map(id => api.get(`/products/${id}`).then(r => r.data)));
        setItems(prev => prev.map(it => {
          const p = fresh.find(f => f._id === it.productId);
          if (!p) return it;
          return { ...it, pricePerUnit: pickPrice(p) };
        }));
      } catch { }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerType]);

  // Calculate total pcs: carton and inner are independent
  // 1 Carton = innerPerCarton pcs directly
  // 1 Inner  = pcsPerInner pcs directly
  const calcTotalPcs = (carton: number, inner: number, loose: number, pcsPerInner: number, innerPerCarton: number) =>
    (carton * innerPerCarton) + (inner * pcsPerInner) + loose;

  const addItem = (p: Product) => {
    const existing = items.find(i => i.productId === p._id);
    if (existing) {
      // just increment looseQty by 1
      const updated = { ...existing, looseQty: existing.looseQty + 1 };
      updated.totalQtyPcs = calcTotalPcs(updated.cartonQty, updated.innerQty, updated.looseQty, updated.pcsPerInner, updated.innerPerCarton);
      updated.qtyOrdered = updated.totalQtyPcs;
      setItems(items.map(i => i.productId === p._id ? updated : i));
    } else {
      const ppi = Number(p.pcsPerInner) || 1;
      const ipc = Number(p.innerPerCarton) || 1;
      const newItem: OrderItem = {
        productId: p._id,
        productName: p.name,
        sku: p.sku,
        imageUrl: p.imageUrl,
        unit: p.unit,
        pcsPerInner: ppi,
        innerPerCarton: ipc,
        cartonQty: 0,
        innerQty: 0,
        looseQty: 1,
        totalQtyPcs: 1,
        qtyOrdered: 1,
        pricePerUnit: pickPrice(p),
        gstRate: applyGst ? (Number(p.gstRate) || defaultGst) : 0,
        availableQty: p.stock?.availableQty || 0,
      };
      setItems([...items, newItem]);
    }
    setSearchQuery('');
    setSearchResults([]);
    toast.success(`${p.name} added`);
  };

  const removeItem = (id: string) => setItems(items.filter(i => i.productId !== id));

  // Update carton/inner/loose qty for an item and recalculate totalQtyPcs
  const updatePackaging = (id: string, field: 'cartonQty' | 'innerQty' | 'looseQty', val: number) => {
    setItems(prev => prev.map(i => {
      if (i.productId !== id) return i;
      const updated = { ...i, [field]: Math.max(0, val) };
      updated.totalQtyPcs = calcTotalPcs(updated.cartonQty, updated.innerQty, updated.looseQty, updated.pcsPerInner, updated.innerPerCarton);
      updated.qtyOrdered = updated.totalQtyPcs || 1;
      return updated;
    }));
  };

  // Toggle GST: when switched, set rate on all items
  const toggleGst = (on: boolean) => {
    setApplyGst(on);
    setItems(prev => prev.map(i => ({ ...i, gstRate: on ? defaultGst : 0 })));
  };

  const handleImagePick = (f: File) => {
    if (f.size > 10 * 1024 * 1024) return toast.error('Image must be under 10MB');
    setOrderImage(f);
    const r = new FileReader();
    r.onload = e => setOrderImagePreview(e.target?.result as string);
    r.readAsDataURL(f);
  };

  const subtotal = items.reduce((s, i) => s + i.pricePerUnit * i.totalQtyPcs, 0);
  const totalGst = items.reduce((s, i) => s + (i.pricePerUnit * i.totalQtyPcs * (i.gstRate || 0) / 100), 0);
  const total = subtotal + totalGst;

  const handleSubmit = async () => {
    if (!customerName.trim()) return toast.error('Customer name required');
    if (items.length === 0) return toast.error('Add at least one product');
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/orders/${id}`, {
          customerName,
          customerAddress,
          customerType,
          salesmanName,
          notes: `${notes}${transportName ? ` | Transport: ${transportName}` : ''}`.trim(),
          items,
          whatsappText: '', // Placeholder if needed
        });
        toast.success(`Order updated!`);
        navigate(`/sale-staff/dashboard`);
      } else {
        const fd = new FormData();
        fd.append('customerName', customerName);
        fd.append('customerAddress', JSON.stringify(customerAddress));
        fd.append('customerType', customerType);
        if (salesmanName.trim()) fd.append('salesmanName', salesmanName.trim());
        fd.append('notes', `${notes}${transportName ? ` | Transport: ${transportName}` : ''}`.trim());
        fd.append('items', JSON.stringify(items));
        if (orderImage) fd.append('orderImage', orderImage);

        const { data: orderData } = await api.post('/orders', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success(`Order ${orderData.orderNumber} created!`);
        navigate(`/sale-staff/invoice/${orderData._id}`);
        // Clear draft from localStorage
        ['do_items', 'do_customerName', 'do_customerAddress', 'do_customerType', 'do_salesmanSelect', 'do_salesmanOther', 'do_transportName', 'do_notes'].forEach(k => localStorage.removeItem(k));
      }

      // Clear form states
      setItems([]);
      setCustomerName('');
      setCustomerAddress({});
      setCustomerType('retailer');
      setSalesmanSelect('');
      setSalesmanOther('');
      setTransportName('');
      setNotes('');
      setOrderImage(null);
      setOrderImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process order');
    } finally {
      setSubmitting(false);
    }
  };

  const generateInvoice = () => {
    if (items.length === 0) return toast.error('Add items first');
    setShowInvoice(true);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title">{isEdit ? 'Update Sales Order' : 'Make Sales Order'}</h1>
            <p className="page-subtitle">{isEdit ? `Editing Order #${id?.slice(-5).toUpperCase()}` : 'Create order with auto-pricing & order image'}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* LEFT — Compact Customer Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.85rem' }}>Customer Info</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
              {(['retailer', 'wholesaler'] as const).map(t => (
                <button key={t} type="button" onClick={() => setCustomerType(t)} style={{ flex: 1, padding: '0.45rem', borderRadius: 8, border: '1.5px solid', borderColor: customerType === t ? 'var(--primary)' : 'var(--border)', background: customerType === t ? 'var(--primary)' : 'transparent', color: customerType === t ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input className="form-control" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer Name *" autoFocus style={{ fontSize: '0.85rem' }} />
              {/* City field only */}
              <input className="form-control" value={customerAddress.city || ''} onChange={e => setCustomerAddress((a: any) => ({ ...a, city: e.target.value }))} placeholder="City *" style={{ fontSize: '0.85rem' }} />
              <select className="form-control" value={salesmanSelect} onChange={e => { setSalesmanSelect(e.target.value); if (e.target.value !== 'other') setSalesmanOther(''); }} style={{ fontSize: '0.85rem' }}>
                <option value="">— Select Salesman —</option>
                {SALESMAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="other">Other...</option>
              </select>
              {salesmanSelect === 'other' && <input className="form-control" value={salesmanOther} onChange={e => setSalesmanOther(e.target.value)} placeholder="Salesman name" style={{ fontSize: '0.85rem' }} autoFocus />}
              <input className="form-control" value={transportName} onChange={e => setTransportName(e.target.value)} placeholder="Transport (optional)" style={{ fontSize: '0.85rem' }} />
              <input className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ fontSize: '0.85rem' }} />
            </div>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>📷 Order Image (optional)</div>
            {orderImagePreview ? (
              <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <img src={orderImagePreview} alt="Order" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', display: 'block', background: '#f8f8f8' }} />
                <button type="button" onClick={() => { setOrderImage(null); setOrderImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="btn btn-danger btn-icon" style={{ position: 'absolute', top: 6, right: 6 }}><X size={13} /></button>
              </div>
            ) : (
              <div className="image-upload-zone" onClick={() => fileInputRef.current?.click()} style={{ padding: '1.25rem' }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImagePick(e.target.files[0])} />
                <Upload size={24} style={{ opacity: 0.35, marginBottom: '0.4rem' }} />
                <p style={{ fontWeight: 600, fontSize: '0.82rem' }}>Upload Order Image</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Paper slip / WhatsApp screenshot</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Order Items */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 600, position: 'sticky', top: '1rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title"><ShoppingCart size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Order Items ({items.length})</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600 }}>
              <input type="checkbox" checked={applyGst} onChange={e => toggleGst(e.target.checked)} style={{ width: 16, height: 16 }} />
              Apply GST
              {applyGst && (
                <select
                  value={defaultGst}
                  onChange={e => { const v = Number(e.target.value); setDefaultGst(v); setItems(prev => prev.map(i => ({ ...i, gstRate: v }))); }}
                  className="form-control"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', width: 75 }}
                >
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              )}
            </label>
          </div>

          {/* Add Product dropdown search */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-dim)', pointerEvents: 'none', zIndex: 2 }} />
            <input
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search & add product by name or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && searchProducts(searchQuery)}
            />
            {searching && <Loader size={16} style={{ position: 'absolute', right: 12, top: 13, color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />}

            {/* Dropdown results overlay */}
            {searchResults.length > 0 && searchQuery.length >= 1 && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 10,
                maxHeight: 320,
                overflowY: 'auto',
              }}>
                {searchResults.map(p => {
                  const price = pickPrice(p);
                  return (
                    <div key={p._id} onClick={() => addItem(p)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.85rem',
                      cursor: 'pointer', borderBottom: '1px solid var(--border-soft)',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} alt={p.name} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.sku} • {p.unit}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          1 Carton={p.innerPerCarton || 1} pcs • 1 Inner={p.pcsPerInner || 1} pcs
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {price > 0 ? `₹${price.toFixed(2)}` : <span style={{ color: 'var(--danger)', fontSize: '0.7rem' }}>No price</span>}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: p.stock?.availableQty > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {p.stock?.availableQty > 0 ? `${p.stock.availableQty} stock` : 'No stock'}
                        </div>
                      </div>
                      <Plus size={16} color="var(--primary)" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <div className="empty-icon">🛒</div>
              <div className="empty-title">No items yet</div>
              <div className="empty-text">Search for products and add them.</div>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 90px 185px 110px 30px', gap: '0.5rem', padding: '0.5rem 0.85rem', fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '2px solid var(--border)', background: 'var(--bg3)' }}>
                <span>Image</span>
                <span>Item Name</span>
                <span>SKU</span>
                <span style={{ textAlign: 'center' }}>Carton / Inner / Pcs</span>
                <span style={{ textAlign: 'right' }}>Total</span>
                <span></span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 480 }}>
                {items.map(item => {
                  const lineTotal = item.totalQtyPcs * item.pricePerUnit * (1 + (item.gstRate || 0) / 100);
                  return (
                    <div key={item.productId} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 90px 185px 110px 30px', gap: '0.5rem', alignItems: 'center', padding: '0.6rem 0.85rem', borderBottom: '1px solid var(--border-soft)', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      {/* Product Image */}
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.productName} onClick={() => window.open(item.imageUrl, '_blank')} style={{ width: 44, height: 44, borderRadius: 9, objectFit: 'cover', border: '1px solid var(--border)', cursor: 'zoom-in', display: 'block' }} />
                        : <div style={{ width: 44, height: 44, borderRadius: 9, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                      }

                      {/* Item Name */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.63rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          1Ctn={item.innerPerCarton}pcs • 1Inr={item.pcsPerInner}pcs
                        </div>
                        <div style={{ marginTop: 3 }}>
                          {(() => {
                            const remaining = item.availableQty - item.totalQtyPcs;
                            const isOver = remaining < 0;
                            const isOut = item.availableQty === 0;
                            const isLow = remaining >= 0 && remaining < 10;
                            return (
                              <span style={{
                                fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                                background: isOver ? 'rgba(239,68,68,0.15)' : isOut ? 'rgba(239,68,68,0.12)' : isLow ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                                color: isOver || isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)',
                              }}>
                                {isOut
                                  ? '⚠ Out of Stock'
                                  : isOver
                                    ? `⚠ Exceeds stock by ${Math.abs(remaining)}`
                                    : `Stock: ${item.availableQty} → Remaining: ${remaining}`}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* SKU */}
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.sku}
                        {item.gstRate > 0 && <div style={{ fontSize: '0.62rem', color: 'var(--primary)', marginTop: 2 }}>GST {item.gstRate}%</div>}
                      </div>

                      {/* Carton / Inner / Pcs inputs */}
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        {(['cartonQty', 'innerQty', 'looseQty'] as const).map((field, idx) => (
                          <div key={field} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <span style={{ fontSize: '0.57rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 }}>{['Ctn', 'Inr', 'Pcs'][idx]}</span>
                            <input type="number" min="0"
                              value={field === 'cartonQty' ? item.cartonQty : field === 'innerQty' ? item.innerQty : item.looseQty}
                              onChange={e => updatePackaging(item.productId, field, parseInt(e.target.value) || 0)}
                              style={{ padding: '0.28rem 0.1rem', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', width: '100%', border: '1.5px solid var(--border)', borderRadius: 7, background: 'var(--bg2)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                            />
                          </div>
                        ))}
                        {/* total pcs badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: '0.3rem', borderLeft: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.57rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 3 }}>Total</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{item.totalQtyPcs}</span>
                        </div>
                      </div>

                      {/* Total (price × qty) */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>₹{lineTotal.toFixed(2)}</div>
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>₹{item.pricePerUnit > 0 ? item.pricePerUnit.toFixed(2) : '—'}/pcs</div>
                      </div>

                      {/* Delete */}
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(item.productId)} style={{ padding: '0.22rem' }}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 'auto', padding: '1rem 0.6rem 0', borderTop: '2px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  <span>Subtotal</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>₹{subtotal.toFixed(2)}</span>
                </div>
                {applyGst && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    <span>GST</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>₹{totalGst.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>Total</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                    ₹{total.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.65rem' }}>
                  <button
                    onClick={generateInvoice}
                    disabled={items.length === 0}
                    className="btn btn-secondary btn-lg"
                    style={{ flex: 1, justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <FileText size={17} /> Generate Invoice
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || items.length === 0}
                    className="btn btn-primary btn-lg"
                    style={{ flex: 1, justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {submitting ? <><Loader size={17} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : <><CheckCircle size={17} /> {isEdit ? 'Update Order' : 'Create Order'}</>}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Invoice Modal */}
      {showInvoice && (() => {
        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const getUnit = (item: any) => { if (item.cartonQty > 0) return 'CARTON'; if (item.innerQty > 0) return 'INNER'; return 'PCS'; };
        const getQty = (item: any) => { if (item.cartonQty > 0) return item.cartonQty; if (item.innerQty > 0) return item.innerQty; return item.looseQty; };
        const printInvoice = () => {
          const el = document.getElementById('invoice-print-area');
          if (!el) return;
          const win = window.open('', '_blank');
          if (win) {
            win.document.write(`<html><head><title>Invoice</title><style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:6px 8px}th{background:#f0f0f0;font-weight:bold;text-align:left}.ht td{border:1px solid #000;padding:5px 10px}.lb{font-weight:bold;background:#f0f0f0}</style></head><body>${el.innerHTML}</body></html>`);
            win.document.close(); win.print();
          }
        };
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowInvoice(false)}>
            <div style={{ background: '#fff', borderRadius: 12, width: '90vw', maxWidth: 900, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111' }}>📄 Order Invoice Preview</div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button onClick={printInvoice} style={{ padding: '0.45rem 1.1rem', background: '#6366F1', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>🖨️ Print</button>
                  <button onClick={() => setShowInvoice(false)} style={{ padding: '0.45rem 0.75rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>✕ Close</button>
                </div>
              </div>
              {/* Invoice content */}
              <div id="invoice-print-area" style={{ padding: '1.5rem', fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#000' }}>
                <table style={{ marginBottom: 16, width: '60%', borderCollapse: 'collapse' }} className="ht">
                  <tbody>
                    <tr><td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 'bold', background: '#f0f0f0', width: 120 }}>ORDER DATE</td><td style={{ border: '1px solid #000', padding: '5px 10px' }}>{dateStr}</td></tr>
                    <tr><td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 'bold', background: '#f0f0f0' }}>ORDER DETAILS</td><td style={{ border: '1px solid #000', padding: '5px 10px' }}>{customerName.toUpperCase()}{transportName ? ` — ${transportName}` : ''}</td></tr>
                    {salesmanName && <tr><td style={{ border: '1px solid #000', padding: '5px 10px', fontWeight: 'bold', background: '#f0f0f0' }}>SALESMAN</td><td style={{ border: '1px solid #000', padding: '5px 10px' }}>{salesmanName.toUpperCase()}</td></tr>}
                  </tbody>
                </table>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      {['STICKERS', 'CUSTOMER NAME', 'ITEM CODE', 'ITEM NAME', 'QTY', 'UNIT', 'TRANSPORT'].map(h => (
                        <th key={h} style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left', fontWeight: 'bold' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.productId}>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{customerName.toUpperCase()}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px', fontFamily: 'monospace' }}>{item.sku}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{item.productName.toUpperCase()}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>{getQty(item)}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>{getUnit(item)}</td>
                        <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{transportName || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DirectOrder;
