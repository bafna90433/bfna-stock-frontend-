import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Package, CheckCircle2, AlertCircle, Save, Info } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const CheckingOrder: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dispatch, setDispatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkedItems, setCheckedItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchDispatch = async () => {
      try {
        const { data } = await api.get(`/dispatch/${id}`);
        setDispatch(data);
        // Initialize checked items
        setCheckedItems(data.items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          orderedQty: item.qtyOrdered,
          dispatchedQty: item.qtyDispatched,
          pcsPerInner: item.pcsPerInner || 1,
          innerPerCarton: item.innerPerCarton || 1,
          dispatchedCartons: item.cartonQty || 0,
          dispatchedInners: item.innerQty || 0,
          dispatchedLoose: item.looseQty || 0,
          checkedQtyCarton: 0,
          checkedQtyInner: 0,
          checkedQtyPcs: 0,
          isFull: false
        })));
      } catch {
        toast.error('Failed to load dispatch details');
        navigate('/checking/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDispatch();
  }, [id, navigate]);

  const updateChecked = (index: number, field: string, value: number) => {
    const newItems = [...checkedItems];
    const item = { ...newItems[index] };
    
    if (field === 'carton') item.checkedQtyCarton = value;
    if (field === 'inner')  item.checkedQtyInner = value;
    if (field === 'pcs')    item.checkedQtyPcs = value;
    
    item.isFull = 
      item.checkedQtyCarton >= item.dispatchedCartons &&
      item.checkedQtyInner  >= item.dispatchedInners &&
      item.checkedQtyPcs    >= item.dispatchedLoose;
    
    newItems[index] = item;
    setCheckedItems(newItems);
  };

  const handleSubmit = async () => {
    const incomplete = checkedItems.some(i => !i.isFull);
    if (incomplete && !window.confirm('Some items are not fully checked. Save anyway?')) return;

    setSaving(true);
    try {
      await api.patch(`/dispatch/${id}/verify`, { items: checkedItems });
      toast.success('Verification saved successfully');
      navigate('/checking/dashboard');
    } catch {
      toast.error('Failed to save verification');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>;
  if (!dispatch) return <div>Dispatch not found</div>;

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.4rem', color: '#64748B' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase' }}>Verify Dispatch</div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>{dispatch.orderNumber}</h2>
        </div>
      </div>

      {/* Summary Card */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '1rem', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 4 }}>{dispatch.customerName}</div>
        <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Dispatched At: {new Date(dispatch.dispatchedAt).toLocaleString()}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {checkedItems.map((item, idx) => (
          <div key={idx} style={{ 
            background: '#fff', borderRadius: 16, border: `1.5px solid ${item.isFull ? '#10B981' : '#E2E8F0'}`, 
            padding: '1rem', position: 'relative', overflow: 'hidden' 
          }}>
            {item.isFull && (
              <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.3rem 0.6rem', background: '#10B981', color: '#fff', fontSize: '0.65rem', fontWeight: 800, borderBottomLeftRadius: 8 }}>
                VERIFIED
              </div>
            )}
            
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{item.productName}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '0.85rem' }}>SKU: {item.sku}</div>

            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800 }}>TYPE</span>
                <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800 }}>MUST CHECK</span>
                <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 800 }}>CHECKED</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cartons</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{item.dispatchedCartons}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: item.checkedQtyCarton >= item.dispatchedCartons ? '#10B981' : '#3B82F6' }}>{item.checkedQtyCarton}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Inners</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{item.dispatchedInners}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: item.checkedQtyInner >= item.dispatchedInners ? '#10B981' : '#3B82F6' }}>{item.checkedQtyInner}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Loose Pcs</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{item.dispatchedLoose}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: item.checkedQtyPcs >= item.dispatchedLoose ? '#10B981' : '#3B82F6' }}>{item.checkedQtyPcs}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', marginBottom: 4, display: 'block' }}>CARTONS</label>
                <input 
                  type="number" 
                  value={item.checkedQtyCarton || ''}
                  onChange={(e) => updateChecked(idx, 'carton', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #E2E8F0', outline: 'none', fontWeight: 700, fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', marginBottom: 4, display: 'block' }}>INNERS</label>
                <input 
                  type="number" 
                  value={item.checkedQtyInner || ''}
                  onChange={(e) => updateChecked(idx, 'inner', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #E2E8F0', outline: 'none', fontWeight: 700, fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', marginBottom: 4, display: 'block' }}>LOOSE PCS</label>
                <input 
                  type="number" 
                  value={item.checkedQtyPcs || ''}
                  onChange={(e) => updateChecked(idx, 'pcs', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid #E2E8F0', outline: 'none', fontWeight: 700, fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Submit Button */}
      <div style={{ 
        position: 'fixed', bottom: 80, left: '1rem', right: '1rem', 
        padding: '0.75rem', background: '#fff', border: '1px solid #E2E8F0', 
        borderRadius: 16, boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
        display: 'flex', gap: '0.75rem'
      }}>
        <button 
          onClick={handleSubmit}
          disabled={saving}
          style={{ 
            flex: 1, background: '#3B82F6', color: '#fff', border: 'none', 
            borderRadius: 12, padding: '0.85rem', fontWeight: 800, fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Saving...' : <><Save size={18} /> Complete Verification</>}
        </button>
      </div>
    </div>
  );
};

export default CheckingOrder;
