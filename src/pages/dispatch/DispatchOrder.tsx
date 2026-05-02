import React, { useState, useEffect } from 'react';
import { Truck, Clock, CheckCircle, AlertCircle, XCircle, Loader, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

interface DispatchItem {
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string;
  unit: string;
  cartonQty?: number;
  innerQty?: number;
  looseQty?: number;
  pcsPerInner?: number;
  innerPerCarton?: number;
  price?: number;
  qtyOrdered: number;
  qtyDispatched: number;
  availableQty: number;
  stockCartons?: number;
  stockInners?: number;
  stockLoose?: number;
  stockStatus: 'available' | 'partial' | 'no_stock';
}

// Show ordered quantities using the stored cartonQty / innerQty / looseQty fields directly
// (avoids divide-by-zero and wrong unit conversion when packaging rate = 0)
const formatOrderLabel = (item: DispatchItem): string => {
  const parts: string[] = [];
  if ((item.cartonQty || 0) > 0) parts.push(`${item.cartonQty} CTN`);
  if ((item.innerQty  || 0) > 0) parts.push(`${item.innerQty} INR`);
  if ((item.looseQty  || 0) > 0) parts.push(`${item.looseQty} PCS`);
  return parts.join(' + ') || `${item.qtyOrdered} PCS`;
};

// For pcs-based quantities (dispatch amounts, available stock etc.)
const formatPcsLabel = (pcs: number, item: DispatchItem): string => {
  const ppi = item.pcsPerInner  || 0;
  const ppc = item.innerPerCarton || 0;
  if (ppc > 0 && (item.cartonQty || 0) > 0) {
    const ctns = Math.floor(pcs / ppc);
    const rem  = pcs % ppc;
    const parts: string[] = [];
    if (ctns > 0) parts.push(`${ctns} CTN`);
    if (rem  > 0) parts.push(`${rem} PCS`);
    return parts.join(' + ') || '0';
  } else if (ppi > 0 && (item.innerQty || 0) > 0) {
    const inners = Math.floor(pcs / ppi);
    const loose  = pcs % ppi;
    const parts: string[] = [];
    if (inners > 0) parts.push(`${inners} INR`);
    if (loose  > 0) parts.push(`${loose} PCS`);
    return parts.join(' + ') || '0';
  }
  return `${pcs} PCS`;
};

const DispatchOrder: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dispatchType, setDispatchType] = useState<'partial' | 'hold'>('partial');
  const [expDeliveryDate, setExpDeliveryDate] = useState('');
  const [updateReason, setUpdateReason] = useState('Stock not available right now');
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/dispatch/order/${orderId}`);
        setOrder(data.order);
        const filteredItems = data.itemsWithStock.filter((i: any) => i.stockStatus !== 'completed');
        setItems(filteredItems.map((item: any) => {
          const pcsPerInner = item.pcsPerInner || 1;
          const pcsPerCarton = item.innerPerCarton || 1; // 1 CTN = innerPerCarton pcs

          let maxDispatch = Math.min(item.availableQty, item.remainingQty);

          // Round down to complete units based on how the item was ordered
          if ((item.cartonQty || 0) > 0) {
            maxDispatch = Math.floor(maxDispatch / pcsPerCarton) * pcsPerCarton;
          } else if ((item.innerQty || 0) > 0) {
            maxDispatch = Math.floor(maxDispatch / pcsPerInner) * pcsPerInner;
          }

          return {
            ...item,
            qtyOrdered: item.remainingQty,
            qtyDispatched: maxDispatch,
          };
        }));
      } catch (e) { toast.error('Failed to load order'); }
      finally { setLoading(false); }
    };
    fetchOrder();
  }, [orderId]);

  const handleDispatch = async () => {
    const finalNote = updateReason === 'Other' ? customNote : updateReason;
    const effectiveType = nothingReady ? 'hold' : dispatchType;

    if (effectiveType === 'hold') {
      if (!expDeliveryDate) return toast.error('Please set an estimated delivery date');
      setSubmitting(true);
      try {
        await api.patch(`/orders/${orderId}/hold`, { estimatedDeliveryDate: expDeliveryDate, notes: finalNote });
        toast.success('Order held — sales staff will be notified.');
        navigate('/dispatch/dashboard');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to hold order');
        setSubmitting(false);
      }
      return;
    }

    const hasAny = items.some(i => i.qtyDispatched > 0);
    if (!hasAny) return toast.error('At least one item must have stock to dispatch');
    setSubmitting(true);
    try {
      await api.post('/dispatch', {
        orderId,
        items: items.map(i => ({
          productId: i.productId, productName: i.productName, sku: i.sku,
          imageUrl: i.imageUrl, unit: i.unit, qtyOrdered: i.qtyOrdered,
          qtyDispatched: i.qtyDispatched, stockStatus: i.stockStatus,
          pcsPerInner: i.pcsPerInner, innerPerCarton: i.innerPerCarton,
          price: i.price,
        })),
        expDeliveryDate,
        notes: finalNote,
      });
      toast.success('Dispatched successfully!');
      navigate('/dispatch/dispatched');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Dispatch failed');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /><p>Loading order...</p></div>;
  if (!order) return <div className="empty-state"><div className="empty-icon">❌</div><div className="empty-title">Order not found</div></div>;

  const readyCount   = items.filter(i => i.stockStatus === 'available').length;
  const partialCount = items.filter(i => i.stockStatus === 'partial').length;
  const noStockCount = items.filter(i => i.stockStatus === 'no_stock').length;
  const allReady     = noStockCount === 0 && partialCount === 0;
  const nothingReady = readyCount === 0;

  const isAlreadyOnHold = (order.status === 'partial' && nothingReady) || (order.status === 'waiting' && !allReady);
  const isHoldMode = nothingReady || dispatchType === 'hold';
  const isHoldDisabled = isHoldMode && (!expDeliveryDate || (updateReason === 'Other' && !customNote.trim()));

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: 860, margin: '0 auto', boxSizing: 'border-box' }}>

      {/* Back + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.45rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Dispatch Order</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {order.orderNumber} &nbsp;•&nbsp; {order.customerName}
          </p>
        </div>
      </div>

      {/* Stock Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981' }}>{readyCount}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', marginTop: 2 }}>✅ Ready to Dispatch</div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B' }}>{partialCount}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B', marginTop: 2 }}>⚠️ Partial Stock</div>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1rem 1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EF4444' }}>{noStockCount}</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EF4444', marginTop: 2 }}>❌ No Stock</div>
        </div>
      </div>

      {/* Dispatch choice — only show if NOT all ready */}
      {!allReady && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          {nothingReady ? (
            isAlreadyOnHold ? (
              /* Already on hold + still no stock — locked state */
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.1rem', background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 10 }}>
                <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🔒</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#EF4444' }}>
                    {order.status === 'partial' ? 'Partial dispatch done — waiting for remaining stock' : 
                     (order.status === 'waiting' && (readyCount > 0 || partialCount > 0)) ? 'Waiting for full order stock' :
                     'Order is on hold — stock not available'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {order.status === 'waiting' && (readyCount > 0 || partialCount > 0) 
                      ? 'Some items are ready, but this order is set to wait for full stock. Update stock or change strategy to proceed.'
                      : 'This order cannot be dispatched until more stock is updated. Please add stock first.'}
                  </div>
                </div>
              </div>
            ) : (
              /* No stock at all — first time, show hold info banner */
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.3)', borderRadius: 10 }}>
                <Clock size={20} color="#F59E0B" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#F59E0B' }}>No stock available to dispatch</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Set a delivery date and reason below, then hold this order — it will be dispatched once stock is available.</div>
                </div>
              </div>
            )
          ) : (
            <>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
                What do you want to do?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Option A — Send available now */}
                <button
                  onClick={() => setDispatchType('partial')}
                  style={{
                    padding: '1rem 1.25rem', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: dispatchType === 'partial' ? '2px solid #10B981' : '2px solid var(--border)',
                    background: dispatchType === 'partial' ? 'rgba(16,185,129,0.07)' : 'var(--bg2)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Truck size={18} color={dispatchType === 'partial' ? '#10B981' : 'var(--text-muted)'} />
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: dispatchType === 'partial' ? '#10B981' : 'var(--text)' }}>
                      Send available stock now
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Jo items ready hain unhe abhi dispatch karo. Baaki items pending rahenge.
                  </div>
                </button>

                {/* Option B — Wait/Hold */}
                <button
                  onClick={() => setDispatchType('hold')}
                  style={{
                    padding: '1rem 1.25rem', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: dispatchType === 'hold' ? '2px solid #F59E0B' : '2px solid var(--border)',
                    background: dispatchType === 'hold' ? 'rgba(245,158,11,0.07)' : 'var(--bg2)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Clock size={18} color={dispatchType === 'hold' ? '#F59E0B' : 'var(--text-muted)'} />
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: dispatchType === 'hold' ? '#F59E0B' : 'var(--text)' }}>
                      Wait — send full order together
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Abhi kuch mat karo. Pura stock aane ka wait karo, phir ek saath bhejo.
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Ready to Dispatch Section */}
      {items.filter(i => i.qtyDispatched > 0).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <CheckCircle size={16} /> Items ready to dispatch
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.filter(i => i.qtyDispatched > 0).map(item => {
              const ppc = item.innerPerCarton || 0;
              const ppi = item.pcsPerInner    || 0;
              const hasCTN = (item.cartonQty || 0) > 0;
              const hasINR = (item.innerQty  || 0) > 0;
              const hasPCS = (item.looseQty  || 0) > 0;

              // Per-unit dispatch calculation
              const stockC = item.stockCartons ?? 0;
              const stockI = item.stockInners  ?? 0;
              const stockL = item.stockLoose   ?? 0;
              const hasBreakdown = stockC > 0 || stockI > 0 || stockL > 0;

              let dispCTN = 0;
              let ctnWarning = false;
              if (hasCTN) {
                if (ppc > 0 && hasBreakdown) {
                  // Breakdown saved → use carton stock directly
                  dispCTN = Math.min(stockC, item.cartonQty || 0);
                  if (dispCTN < (item.cartonQty || 0)) ctnWarning = true;
                } else if (ppc > 0 && !hasBreakdown) {
                  // No breakdown but carton rate known → compute from total available pcs
                  const availCartons = Math.floor((item.availableQty || 0) / ppc);
                  dispCTN = Math.min(availCartons, item.cartonQty || 0);
                  if (dispCTN < (item.cartonQty || 0)) ctnWarning = true;
                } else if (!hasINR && !hasPCS) {
                  // No carton rate, only CTN ordered → treat as full dispatch
                  dispCTN = item.cartonQty || 0;
                } else {
                  // No carton rate, mixed with INR/PCS → CTN part can't be dispatched
                  ctnWarning = true;
                }
              }
              let pcsLeft = item.qtyDispatched - dispCTN * ppc;
              const dispINR = hasINR && ppi > 0 ? Math.min(Math.floor(pcsLeft / ppi), item.innerQty || 0) : 0;
              pcsLeft -= dispINR * ppi;
              const dispPCS = Math.min(pcsLeft, item.looseQty || 0);

              return (
                <div key={item.productId} style={{ background: 'rgba(16,185,129,0.04)', border: `1.5px solid ${ctnWarning ? '#F59E0B' : '#10B981'}`, borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} alt={item.productName} />
                    : <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: '1px solid var(--border)', flexShrink: 0 }}>📦</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.productName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>SKU: {item.sku}</div>
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {ctnWarning
                        ? <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', padding: '2px 10px', borderRadius: 99 }}>⚠ Partial — No CTN Stock</span>
                        : <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10B981', padding: '2px 10px', borderRadius: 99 }}>✅ Stock Available</span>
                      }
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexShrink: 0 }}>
                    {/* ORDERED — per unit, separate */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Ordered</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {hasCTN && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: ctnWarning ? '#F59E0B' : 'var(--text)' }}>{item.cartonQty} CTN</div>}
                        {hasINR && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{item.innerQty} INR</div>}
                        {hasPCS && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{item.looseQty} PCS</div>}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 60, background: 'var(--border)' }} />
                    {/* WILL DISPATCH — per unit, with warnings */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Will Dispatch</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {hasCTN && (ctnWarning
                          ? <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#EF4444' }}>⚠ No CTN Stock</div>
                          : <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: '#10B981' }}>{dispCTN} CTN</div>
                        )}
                        {hasINR && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: '#10B981' }}>{dispINR} INR</div>}
                        {hasPCS && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: '#10B981' }}>{dispPCS} PCS</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEND NOW mode: show no-stock items only when nothingReady (forced hold context) */}
      {!isHoldMode && nothingReady && items.filter(i => i.qtyDispatched === 0).length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> No Stock — Will be pending
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.filter(i => i.qtyDispatched === 0).map(item => (
              <div key={item.productId} style={{ background: 'rgba(239,68,68,0.04)', border: '1.5px solid #EF4444', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} alt={item.productName} />
                  : <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: '1px solid var(--border)', flexShrink: 0 }}>📦</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.productName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>SKU: {item.sku}</div>
                  <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#EF4444', padding: '2px 10px', borderRadius: 99 }}>
                      ❌ No Stock
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Ordered</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{formatOrderLabel(item)}</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>To be Pending</div>
                    <div style={{ fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-mono)', color: '#EF4444' }}>{formatOrderLabel(item)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WAIT/HOLD mode: combined section — ALL items that will be held (no-stock + partial) */}
      {isHoldMode && items.filter(i => i.qtyOrdered > i.qtyDispatched).length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> Items remaining — will be held ({items.filter(i => i.qtyOrdered > i.qtyDispatched).length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.filter(i => i.qtyOrdered > i.qtyDispatched).map(item => {
              const noStock = item.qtyDispatched === 0;
              const borderColor = noStock ? '#EF4444' : '#F59E0B';
              const bgColor = noStock ? 'rgba(239,68,68,0.04)' : 'rgba(245,158,11,0.04)';
              const pendingQty = item.qtyOrdered - item.qtyDispatched;
              return (
                <div key={item.productId} style={{ background: bgColor, border: `1.5px solid ${borderColor}`, borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} alt={item.productName} />
                    : <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', border: '1px solid var(--border)', flexShrink: 0 }}>📦</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.productName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>SKU: {item.sku}</div>
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {noStock ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#EF4444', padding: '2px 10px', borderRadius: 99 }}>
                          ❌ No Stock
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', padding: '2px 10px', borderRadius: 99 }}>
                          ⚠️ Only {formatPcsLabel(item.availableQty, item)} avail
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Ordered</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {(item.cartonQty || 0) > 0 && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{item.cartonQty} CTN</div>}
                        {(item.innerQty  || 0) > 0 && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{item.innerQty} INR</div>}
                        {(item.looseQty  || 0) > 0 && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{item.looseQty} PCS</div>}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 60, background: 'var(--border)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>To be Held</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {(item.cartonQty || 0) > 0 && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: borderColor }}>{item.cartonQty} CTN</div>}
                        {(item.innerQty  || 0) > 0 && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: borderColor }}>{item.innerQty} INR</div>}
                        {(item.looseQty  || 0) > 0 && <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'var(--font-mono)', color: borderColor }}>{item.looseQty} PCS</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Extra Info (reason / date) — only show when there are pending/no-stock items AND not already locked AND mode is HOLD */}
      {!allReady && !isAlreadyOnHold && (nothingReady || dispatchType === 'hold') && <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
          Additional Info
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
              Est. Delivery Date {dispatchType === 'hold' && <span style={{ color: '#EF4444' }}>*</span>}
            </label>
            <input
              type="date"
              className="form-control"
              value={expDeliveryDate}
              onChange={e => setExpDeliveryDate(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Message / Reason</label>
            <select
              className="form-control"
              value={updateReason}
              onChange={e => setUpdateReason(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="Stock not available right now">Stock not available right now</option>
              <option value="Partial stock dispatched">Partial stock dispatched</option>
              <option value="Product packaging damaged / not packed">Product packaging damaged / not packed</option>
              <option value="Expected delay in transit">Expected delay in transit</option>
              <option value="Will dispatch remaining tomorrow">Will dispatch remaining tomorrow</option>
              <option value="Other">Other (Custom Message)</option>
            </select>
          </div>
        </div>
        {updateReason === 'Other' && (
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Custom Note</label>
            <textarea
              className="form-control"
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="Type custom note here..."
              rows={2}
              style={{ fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>
        )}
      </div>}

      {/* Confirm Button */}
      {isAlreadyOnHold ? (
        /* Locked state — order already on hold, no stock yet */
        <div style={{
          background: 'rgba(239,68,68,0.05)', border: '1.5px solid rgba(239,68,68,0.25)',
          borderRadius: 12, padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.75rem' }}>🔒</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#EF4444' }}>Dispatch Locked</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Please update stock first — this order will unlock automatically once stock is available.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>Back</button>
            <button
              className="btn btn-lg"
              disabled
              style={{ background: '#EF4444', color: '#fff', border: 'none', minWidth: 200, opacity: 0.5, cursor: 'not-allowed' }}
            >
              🔒 &nbsp; Please Update Stock
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          {isHoldMode && isHoldDisabled && (
            <div style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239,68,68,0.08)', padding: '0.35rem 0.75rem', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle size={14} />
              Please provide delivery date and reason to hold this order
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button
              className="btn btn-lg"
              onClick={handleDispatch}
              disabled={submitting || (isHoldMode && isHoldDisabled)}
              style={{
                background: (nothingReady || dispatchType === 'hold') ? '#F59E0B' : '#10B981',
                color: '#fff', border: 'none', minWidth: 200,
                opacity: (submitting || (isHoldMode && isHoldDisabled)) ? 0.6 : 1,
                cursor: (submitting || (isHoldMode && isHoldDisabled)) ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting
                ? <><Loader size={17} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />Processing...</>
                : (nothingReady || dispatchType === 'hold')
                  ? <><Clock size={17} style={{ marginRight: 6 }} />Put on Hold</>
                  : allReady
                    ? <><CheckCircle size={17} style={{ marginRight: 6 }} />Dispatch Now (Full Order)</>
                    : <><Truck size={17} style={{ marginRight: 6 }} />Dispatch Now (Available Stock)</>
              }
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DispatchOrder;
