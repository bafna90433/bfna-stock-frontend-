import React, { useState, useEffect } from 'react';
import { CheckCircle, Truck, Package, Search } from 'lucide-react';
import api from '../../api/axios';
import OrderPreviewModal from '../../components/OrderPreviewModal';

const DispatchHistory: React.FC = () => {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/dispatch'); // Get all dispatches
        setDispatches(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredDispatches = dispatches.filter(d => 
    d.orderNumber.toLowerCase().includes(search.toLowerCase()) || 
    d.customerName.toLowerCase().includes(search.toLowerCase()) ||
    d._id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Dispatch History</h1>
          <p className="page-subtitle">View all completed and partial dispatches.</p>
        </div>
        <div className="search-bar" style={{ width: 300 }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by order # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-page" style={{ minHeight: '300px' }}><div className="spinner"></div></div>
        ) : filteredDispatches.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} className="empty-icon" style={{ color: 'var(--success)' }} />
            <h3 className="empty-title">No dispatch history found</h3>
            <p className="empty-text">Completed dispatches will appear here.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Dispatch ID</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Dispatched Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDispatches.map(d => (
                  <tr key={d._id} className="hover-row">
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      DIS-{d._id.slice(-6).toUpperCase()}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{d.orderNumber}</td>
                    <td style={{ fontWeight: 600 }}>{d.customerName}</td>
                    <td>
                      <span className={`badge`} style={{ background: d.status === 'complete' ? 'var(--success)' : 'var(--warning)', color: 'white' }}>
                        {d.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(d.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => setPreviewOrderId(d.orderId)}
                      >
                        <Package size={14} /> View Order
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OrderPreviewModal
        isOpen={!!previewOrderId}
        orderId={previewOrderId}
        onClose={() => setPreviewOrderId(null)}
      />
    </div>
  );
};

export default DispatchHistory;
