import React, { useState, useEffect } from 'react';
import { Truck, Search, Eye, CheckCircle, SearchX, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import OrderPreviewModal from '../../components/OrderPreviewModal';

const DispatchedOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDispatchedOrders = async () => {
      try {
        const { data } = await api.get('/orders?status=dispatched&limit=50');
        setOrders(data.orders);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDispatchedOrders();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) || 
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Dispatched Orders</h1>
          <p className="page-subtitle">View all orders successfully dispatched by the dispatch team.</p>
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
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <SearchX size={48} className="empty-icon" />
            <h3 className="empty-title">No dispatched orders found</h3>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const estTotal = order.items?.reduce(
                    (sum: number, i: any) => sum + (i.qtyOrdered * (i.pricePerUnit || 0)),
                    0
                  ) || 0;
                  return (
                  <tr key={order._id} className="hover-row">
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{order.orderNumber}</td>
                    <td style={{ fontWeight: 600 }}>{order.customerName}</td>
                    <td>{order.items.length} items</td>
                    <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                      ₹{estTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => setPreviewId(order._id)}
                        title="View Order Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => navigate(`/sale-staff/invoice/${order._id}`)}
                        title="Generate Invoice"
                      >
                        <FileText size={14} />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OrderPreviewModal
        isOpen={!!previewId}
        orderId={previewId}
        onClose={() => setPreviewId(null)}
      />
    </div>
  );
};

export default DispatchedOrders;
