import React, { useState, useEffect } from 'react';
import { Truck, Clock, ChevronRight, Search, RefreshCw, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const CheckingDashboard: React.FC = () => {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchDispatches = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await api.get('/dispatch/unverified');
      setDispatches(data);
    } catch {
      toast.error('Failed to load check queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
    const interval = setInterval(() => fetchDispatches(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredDispatches = dispatches.filter(d => 
    d.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    d.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>Checking Queue</h2>
        <button onClick={() => fetchDispatches(true)} style={{ background: 'none', border: 'none', color: '#64748B' }}>
          <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input
          type="text"
          placeholder="Search Order # or Customer..."
          style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: '0.9rem', outline: 'none' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredDispatches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: 16, border: '1px dashed #CBD5E1' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
          <div style={{ fontWeight: 800, color: '#1E293B' }}>Queue is Empty</div>
          <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: 4 }}>All dispatched orders have been checked.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredDispatches.map((dispatch) => (
            <div 
              key={dispatch._id} 
              onClick={() => navigate(`/checking/order/${dispatch._id}`)}
              style={{ 
                background: '#fff', borderRadius: 16, padding: '1rem', 
                border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer'
              }}
            >
              <div style={{ 
                width: 48, height: 48, borderRadius: 12, 
                background: '#EFF6FF', color: '#3B82F6', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                <Truck size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontWeight: 800, color: '#3B82F6', fontSize: '0.9rem' }}>{dispatch.orderNumber}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: 99 }}>
                    {new Date(dispatch.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dispatch.customerName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 4 }}>
                  <ClipboardCheck size={13} /> {dispatch.items?.length || 0} items to verify
                </div>
              </div>
              <ChevronRight size={18} color="#CBD5E1" />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default CheckingDashboard;
