import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart, Search, Plus, Trash2, CheckCircle, Loader, ArrowLeft, Upload, X, Image as ImageIcon, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { debounce } from '../../utils/debounce';
import OrderPreviewModal from '../../components/OrderPreviewModal';

interface BulkTier { minQty: number; unit: 'pcs' | 'inner' | 'carton'; price: number; }

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
  stock: { availableQty: number; stockCartons?: number; stockInners?: number; stockLoose?: number };
  bulkPricingTiers?: BulkTier[];
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
  basePrice: number;            // regular price (wholesaler/retailer)
  isBulkPriced: boolean;        // true when bulk tier is active
  bulkPricingTiers: BulkTier[]; // stored for re-evaluation on qty change
  gstRate: number;
  availableQty: number;
  stockCartons: number;
  stockInners: number;
  stockLoose: number;
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
  const stockRefreshedRef = useRef(false);

  const fetchRecentOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data } = await api.get('/orders?limit=5');
      setRecentOrders(data.orders || []);
    } catch { }
    finally { setLoadingOrders(false); }
  };

  useEffect(() => { fetchRecentOrders(); }, []);

  // Refresh stock breakdown for items loaded from localStorage (stale cache fix)
  useEffect(() => {
    if (isEdit || stockRefreshedRef.current) return;
    stockRefreshedRef.current = true;
    const cached = items;
    if (cached.length === 0) return;
    (async () => {
      const refreshed = await Promise.all(
        cached.map(async (item) => {
          try {
            const { data: p } = await api.get(`/products/${item.productId}`);
            return {
              ...item,
              // Refresh packaging — fix stale || 1 values from old localStorage
              pcsPerInner:   isNaN(Number(p.pcsPerInner))    ? 0 : Number(p.pcsPerInner),
              innerPerCarton: isNaN(Number(p.innerPerCarton)) ? 0 : Number(p.innerPerCarton),
              availableQty:  p.stock?.availableQty ?? item.availableQty,
              stockCartons:  p.stock?.stockCartons  ?? item.stockCartons,
              stockInners:   p.stock?.stockInners   ?? item.stockInners,
              stockLoose:    p.stock?.stockLoose    ?? item.stockLoose,
            };
          } catch { return item; }
        })
      );
      setItems(refreshed);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Order image
  const [orderImage, setOrderImage] = useState<File | null>(null);
  const [orderImagePreview, setOrderImagePreview] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

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

          // Fetch current stock for each item so stock column shows correctly
          const itemsWithStock = await Promise.all(
            (data.items || []).map(async (item: any) => {
              try {
                const { data: p } = await api.get(`/products/${item.productId}`);
                return {
                  ...item,
                  availableQty:  (p.stock?.availableQty ?? 0) + (item.qtyOrdered || 0),
                  stockCartons:  p.stock?.stockCartons  ?? 0,
                  stockInners:   p.stock?.stockInners   ?? 0,
                  stockLoose:    p.stock?.stockLoose    ?? 0,
                  basePrice:     item.pricePerUnit,
                  isBulkPriced:  false,
                  bulkPricingTiers: p.bulkPricingTiers || [],
                };
              } catch {
                return { ...item, availableQty: 0, stockCartons: 0, stockInners: 0, stockLoose: 0, basePrice: item.pricePerUnit, isBulkPriced: false, bulkPricingTiers: [] };
              }
            })
          );
          setItems(itemsWithStock);

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

  // Pick base price based on customer type
  const pickPrice = (p: Product): number => {
    if (customerType === 'wholesaler') {
      return Number(p.wholesalerPrice) || Number(p.pricePerUnit) || 0;
    }
    return Number(p.retailerPrice) || Number(p.pricePerUnit) || 0;
  };

  // Get effective price — checks bulk tiers and returns bulk price if qty qualifies
  const getEffectivePrice = (
    basePrice: number,
    tiers: BulkTier[],
    totalQtyPcs: number,
    pcsPerInner: number,
    innerPerCarton: number
  ): { price: number; isBulk: boolean } => {
    // Bulk pricing only applies to wholesalers
    if (customerType === 'retailer') return { price: basePrice, isBulk: false };
    if (!tiers?.length || totalQtyPcs <= 0) return { price: basePrice, isBulk: false };
    const ppi = pcsPerInner > 0 ? pcsPerInner : 1;
    const ppc = innerPerCarton > 0 ? innerPerCarton : 1;
    // Convert each tier's minQty to pcs and find highest applicable
    const applicable = tiers
      .map(t => ({
        ...t,
        minQtyPcs: t.unit === 'inner' ? t.minQty * ppi
                 : t.unit === 'carton' ? t.minQty * ppc
                 : t.minQty,
      }))
      .filter(t => totalQtyPcs >= t.minQtyPcs)
      .sort((a, b) => b.minQtyPcs - a.minQtyPcs); // highest threshold first
    if (applicable.length > 0) return { price: applicable[0].price, isBulk: true };
    return { price: basePrice, isBulk: false };
  };

  // When customer type changes, re-price all existing items (with bulk re-evaluation)
  useEffect(() => {
    if (items.length === 0) return;
    (async () => {
      const ids = items.map(i => i.productId);
      try {
        const fresh = await Promise.all(ids.map(id => api.get(`/products/${id}`).then(r => r.data)));
        setItems(prev => prev.map(it => {
          const p = fresh.find(f => f._id === it.productId);
          if (!p) return it;
          const base = pickPrice(p);
          const tiers = p.bulkPricingTiers || it.bulkPricingTiers || [];
          const { price, isBulk } = getEffectivePrice(base, tiers, it.totalQtyPcs, it.pcsPerInner, it.innerPerCarton);
          return { ...it, basePrice: base, pricePerUnit: price, isBulkPriced: isBulk, bulkPricingTiers: tiers };
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
      const updated = { ...existing, looseQty: existing.looseQty + 1 };
      updated.totalQtyPcs = calcTotalPcs(updated.cartonQty, updated.innerQty, updated.looseQty, updated.pcsPerInner, updated.innerPerCarton);
      updated.qtyOrdered = updated.totalQtyPcs;
      const { price, isBulk } = getEffectivePrice(updated.basePrice, updated.bulkPricingTiers, updated.totalQtyPcs, updated.pcsPerInner, updated.innerPerCarton);
      updated.pricePerUnit = price;
      updated.isBulkPriced = isBulk;
      setItems(items.map(i => i.productId === p._id ? updated : i));
    } else {
      // Preserve 0 — 0 means "no inner/carton packaging", never coerce to 1
      const ppi = isNaN(Number(p.pcsPerInner))    ? 0 : Number(p.pcsPerInner);
      const ipc = isNaN(Number(p.innerPerCarton)) ? 0 : Number(p.innerPerCarton);
      const base = pickPrice(p);
      const tiers = p.bulkPricingTiers || [];
      const { price, isBulk } = getEffectivePrice(base, tiers, 1, ppi, ipc);
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
        basePrice: base,
        pricePerUnit: price,
        isBulkPriced: isBulk,
        bulkPricingTiers: tiers,
        gstRate: applyGst ? (Number(p.gstRate) || defaultGst) : 0,
        availableQty: p.stock?.availableQty || 0,
        stockCartons: p.stock?.stockCartons ?? 0,
        stockInners: p.stock?.stockInners ?? 0,
        stockLoose: p.stock?.stockLoose ?? 0,
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
      const updated = { ...i, [field]: Math.max(0, isNaN(val) ? 0 : val) };
      // Preserve 0 values — 0 means packaging rate not set (don't coerce to 1)
      updated.pcsPerInner    = isNaN(Number(updated.pcsPerInner))    ? 0 : Number(updated.pcsPerInner);
      updated.innerPerCarton = isNaN(Number(updated.innerPerCarton)) ? 0 : Number(updated.innerPerCarton);
      updated.basePrice      = Number(updated.basePrice)      || Number(updated.pricePerUnit) || 0;
      updated.bulkPricingTiers = updated.bulkPricingTiers || [];
      updated.totalQtyPcs = calcTotalPcs(updated.cartonQty, updated.innerQty, updated.looseQty, updated.pcsPerInner, updated.innerPerCarton);
      updated.qtyOrdered = updated.totalQtyPcs || 1;
      const { price, isBulk } = getEffectivePrice(updated.basePrice, updated.bulkPricingTiers, updated.totalQtyPcs, updated.pcsPerInner, updated.innerPerCarton);
      updated.pricePerUnit = price;
      updated.isBulkPriced = isBulk;
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

  const subtotal = items.reduce((s, i) => s + (i.pricePerUnit || 0) * (i.totalQtyPcs || 0), 0);
  const totalGst = items.reduce((s, i) => s + ((i.pricePerUnit || 0) * (i.totalQtyPcs || 0) * (i.gstRate || 0) / 100), 0);
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
                        {p.bulkPricingTiers && p.bulkPricingTiers.length > 0 && customerType === 'wholesaler' && (
                          <div style={{ fontSize: '0.6rem', color: '#D97706', fontWeight: 700, marginTop: 2 }}>
                            📦 {p.bulkPricingTiers.length} bulk tier{p.bulkPricingTiers.length > 1 ? 's' : ''}
                          </div>
                        )}
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
              {/* ── TABLE HEADER ── */}
              {/* cols: img | name | sku | stock | ctn | inr | pcs | total | price | amount | del */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '38px 1fr 72px 88px 66px 66px 66px 54px 82px 88px 28px',
                gap: '0.5rem',
                alignItems: 'center',
                padding: '0.35rem 0.75rem',
                background: 'var(--bg3)',
                borderRadius: 8,
                fontSize: '0.58rem', fontWeight: 800, color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: '0.07em',
                borderBottom: '2px solid var(--border)',
              }}>
                <span />
                <span>Item Name</span>
                <span style={{ textAlign: 'center' }}>SKU</span>
                <span style={{ textAlign: 'center' }}>Stock</span>
                <span style={{ textAlign: 'center' }}>CTN</span>
                <span style={{ textAlign: 'center' }}>INR</span>
                <span style={{ textAlign: 'center' }}>PCS</span>
                <span style={{ textAlign: 'center' }}>Total</span>
                <span style={{ textAlign: 'center' }}>Price/pc</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
                <span />
              </div>

              {/* ── ITEM ROWS ── */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 540, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {items.map(item => {
                  const safeAvail    = item.availableQty  ?? 0;
                  const safeCartons  = item.stockCartons  ?? 0;
                  const safeInners   = item.stockInners   ?? 0;
                  const safeLoose    = item.stockLoose    ?? 0;
                  const safeTotalPcs = item.totalQtyPcs   ?? 0;
                  const lineTotal  = safeTotalPcs * (item.pricePerUnit || 0) * (1 + (item.gstRate || 0) / 100);
                  const remaining  = safeAvail - safeTotalPcs;
                  const isOut      = safeAvail === 0;
                  const isOver     = remaining < 0;
                  // Per-unit level check
                  const hasBreakdown = safeCartons > 0 || safeInners > 0 || safeLoose > 0;
                  // Greedy fallback for display when no breakdown stored yet
                  const ppi = item.pcsPerInner > 0 ? item.pcsPerInner : 1;
                  const ppc = item.innerPerCarton > 0 ? item.innerPerCarton : 1;
                  const dispCartons = hasBreakdown ? safeCartons : (item.innerPerCarton > 1 ? Math.floor(safeAvail / ppc) : 0);
                  const dispInners  = hasBreakdown ? safeInners  : (item.pcsPerInner > 1   ? Math.floor((safeAvail - dispCartons * ppc) / ppi) : 0);
                  const dispLoose   = hasBreakdown ? safeLoose   : (safeAvail - dispCartons * ppc - dispInners * ppi);
                  const cartonOver = hasBreakdown && item.cartonQty > safeCartons;
                  const innerOver  = hasBreakdown && item.innerQty  > safeInners;
                  const looseOver  = hasBreakdown && item.looseQty  > safeLoose;
                  const unitOver   = cartonOver || innerOver || looseOver;
                  const isLow      = !isOut && !isOver && !unitOver && remaining < 10;
                  const stockColor = isOut || isOver || unitOver ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)';
                  const stockBg    = isOut || isOver || unitOver ? 'rgba(239,68,68,0.10)' : isLow ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)';
                  const stockLabel = isOut ? '⚠ No Stock'
                    : cartonOver ? `⚠ Only ${dispCartons} CTN`
                    : innerOver  ? `⚠ Only ${dispInners} INR`
                    : looseOver  ? `⚠ Only ${dispLoose} PCS`
                    : isOver ? `⚠ Over ${Math.abs(remaining)}`
                    : `${safeAvail} → ${remaining}`;

                  const nextTierHint = (!item.isBulkPriced && item.bulkPricingTiers?.length && item.totalQtyPcs > 0)
                    ? (() => {
                        const ppi = item.pcsPerInner > 0 ? item.pcsPerInner : 1;
                        const ppc = item.innerPerCarton > 0 ? item.innerPerCarton : 1;
                        const next = item.bulkPricingTiers
                          .map(t => ({ ...t, minQtyPcs: t.unit === 'inner' ? t.minQty * ppi : t.unit === 'carton' ? t.minQty * ppc : t.minQty }))
                          .filter(t => t.minQtyPcs > item.totalQtyPcs)
                          .sort((a, b) => a.minQtyPcs - b.minQtyPcs)[0];
                        return next ? { pcs: next.minQtyPcs - item.totalQtyPcs, price: next.price } : null;
                      })()
                    : null;

                  return (
                    <div key={item.productId} style={{
                      display: 'grid',
                      gridTemplateColumns: '38px 1fr 72px 88px 66px 66px 66px 54px 82px 88px 28px',
                      gap: '0.5rem',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${stockColor}`,
                      borderRadius: 7,
                      transition: 'background 0.12s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
                    >
                      {/* Image */}
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.productName}
                            onClick={() => setPreviewImg(item.imageUrl)}
                            style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', border: '1px solid var(--border)', cursor: 'zoom-in' }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 7, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>📦</div>
                      }

                      {/* Item Name + sub info */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.productName}
                        </div>
                        {item.gstRate > 0 && (
                          <div style={{ fontSize: '0.59rem', color: 'var(--primary)', marginTop: 1 }}>GST {item.gstRate}%</div>
                        )}
                      </div>

                      {/* SKU */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 4px', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.sku}
                        </span>
                      </div>

                      {/* Stock */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.63rem', fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: stockBg, color: stockColor, whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {stockLabel}
                        </span>
                      </div>

                      {/* CTN input — always visible */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <input type="number" min="0"
                          value={item.cartonQty}
                          onChange={e => updatePackaging(item.productId, 'cartonQty', parseInt(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.28rem 0.1rem', fontSize: '0.88rem', fontWeight: 700, textAlign: 'center', border: `1.5px solid ${cartonOver ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 6, background: 'var(--bg2)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                        />
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, lineHeight: 1.2, textAlign: 'center',
                          color: (cartonOver || (item.cartonQty > 0 && dispCartons === 0)) ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {(item.cartonQty > 0 && dispCartons === 0) ? '⚠ No CTN stock'
                            : cartonOver ? `⚠ Only ${dispCartons} CTN`
                            : `${dispCartons} → ${Math.max(0, dispCartons - item.cartonQty)} CTN`}
                        </span>
                      </div>

                      {/* INR input — always visible */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <input type="number" min="0"
                          value={item.innerQty}
                          onChange={e => updatePackaging(item.productId, 'innerQty', parseInt(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.28rem 0.1rem', fontSize: '0.88rem', fontWeight: 700, textAlign: 'center', border: `1.5px solid ${innerOver ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 6, background: 'var(--bg2)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                        />
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, lineHeight: 1.2, textAlign: 'center',
                          color: (innerOver || (item.innerQty > 0 && dispInners === 0)) ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {(item.innerQty > 0 && dispInners === 0) ? '⚠ No INR stock'
                            : innerOver ? `⚠ Only ${dispInners} INR`
                            : `${dispInners} → ${Math.max(0, dispInners - item.innerQty)} INR`}
                        </span>
                      </div>

                      {/* PCS input */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <input type="number" min="0" value={item.looseQty}
                          onChange={e => updatePackaging(item.productId, 'looseQty', parseInt(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.28rem 0.1rem', fontSize: '0.88rem', fontWeight: 700, textAlign: 'center', border: `1.5px solid ${looseOver ? 'var(--danger)' : 'var(--border)'}`, borderRadius: 6, background: 'var(--bg2)', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                        />
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, lineHeight: 1.2, textAlign: 'center',
                          color: looseOver ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {(item.looseQty > 0 && dispLoose === 0) ? '⚠ No PCS stock'
                            : looseOver ? `⚠ Only ${dispLoose} PCS`
                            : `${dispLoose} → ${Math.max(0, dispLoose - item.looseQty)} PCS`}
                        </span>
                      </div>

                      {/* Total pcs */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          {item.totalQtyPcs}
                        </span>
                      </div>

                      {/* Price/pc — bulk price highlighted when active, next tier hint below */}
                      <div style={{ textAlign: 'center' }}>
                        {item.isBulkPriced ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#D97706', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                              ₹{(item.pricePerUnit || 0).toFixed(2)}
                            </span>
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#D97706', background: 'rgba(245,158,11,0.13)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 3, padding: '0px 4px', whiteSpace: 'nowrap' }}>
                              📦 Bulk
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                              ₹{(item.pricePerUnit || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Amount */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                          ₹{lineTotal.toFixed(2)}
                        </div>
                      </div>

                      {/* Delete */}
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(item.productId)} style={{ padding: '0.2rem' }}>
                        <Trash2 size={11} />
                      </button>
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
      {/* ── Image Lightbox ── */}
      {previewImg && (
        <div
          onClick={() => setPreviewImg(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={previewImg}
            alt="preview"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '88vw', maxHeight: '88vh',
              borderRadius: 14,
              boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
              border: '3px solid rgba(255,255,255,0.12)',
              objectFit: 'contain',
            }}
          />
          <button
            onClick={() => setPreviewImg(null)}
            style={{
              position: 'fixed', top: 20, right: 24,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', width: 38, height: 38,
              color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >✕</button>
        </div>
      )}

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
