import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, Search, RefreshCw, Calendar } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const CheckingHistory: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchHistory = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      // Get verified dispatches
      const { data } = await api.get('/dispatch?status=complete'); // or a specific history endpoint if exists
      setHistory(data.filter((d: any) => d.isVerified));
    } catch {
      toast.error('Failed to load check history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(d => 
    d.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    d.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><div className="spinner" /></div>;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>Check History</h2>
        <button onClick={() => fetchHistory(true)} style={{ background: 'none', border: 'none', color: '#64748B' }}>
          <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
        <input
          type="text"
          placeholder="Search history..."
          style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: '0.9rem', outline: 'none' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: 16, border: '1px dashed #CBD5E1' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📜</div>
          <div style={{ fontWeight: 800, color: '#1E293B' }}>No history yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredHistory.map((dispatch) => (
            <div 
              key={dispatch._id} 
              style={{ 
                background: '#fff', borderRadius: 16, padding: '1rem', 
                border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                display: 'flex', alignItems: 'center', gap: '1rem'
              }}
            >
              <div style={{ 
                width: 48, height: 48, borderRadius: 12, 
                background: '#F0FDF4', color: '#22C55E', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                <CheckCircle2 size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontWeight: 800, color: '#10B981', fontSize: '0.9rem' }}>{dispatch.orderNumber}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: 99 }}>
                    {new Date(dispatch.verifiedAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {dispatch.customerName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 4 }}>
                  <Calendar size={13} /> Checked by: {dispatch.verifiedByName || 'Unknown'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CheckingHistory;
