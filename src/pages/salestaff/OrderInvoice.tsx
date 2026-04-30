import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Loader, Edit2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const OrderInvoice: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        setOrder(data);
      } catch (err) {
        toast.error('Failed to load order');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, navigate]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="loading-page"><Loader className="spinner" /></div>;
  if (!order) return <div className="empty-state">Order not found</div>;

  const getUnit = (item: any) => {
    if (item.cartonQty > 0) return 'CARTON';
    if (item.innerQty > 0) return 'INNER';
    return 'PCS';
  };

  const getQty = (item: any) => {
    if (item.cartonQty > 0) return item.cartonQty;
    if (item.innerQty > 0) return item.innerQty;
    return item.looseQty;
  };

  const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // Extract transport from notes if it follows the pattern "| Transport: ..."
  const transportMatch = order.notes?.match(/Transport:\s*(.*)/i);
  const transportName = transportMatch ? transportMatch[1] : '';

  return (
    <div className="page-container no-padding-print">
      <div className="page-header hide-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Order Invoice</h1>
            <p className="page-subtitle">Preview and print the sales order invoice.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button className="btn btn-secondary hide-print" onClick={() => navigate(`/sale-staff/edit-order/${orderId}`)}>
            <Edit2 size={18} style={{ marginRight: 8 }} /> Edit Order
          </button>
          <button className="btn btn-primary hide-print" onClick={handlePrint}>
            <Printer size={18} style={{ marginRight: 8 }} /> Print Invoice
          </button>
        </div>
      </div>

      <div className="card invoice-card">
        <div id="invoice-content" style={{ padding: '2rem', background: '#fff', color: '#000', minHeight: '29.7cm' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '2px solid #000', paddingBottom: '1rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#000' }}>SALES ORDER</h1>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#666' }}>{order.orderNumber}</p>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <img 
                src="https://ik.imagekit.io/rishii/bafnatoys/Copy%20of%20Super_Car___05_vrkphh.webp?updatedAt=1775309336739" 
                style={{ height: 60, width: 'auto', marginBottom: 5 }} 
                alt="Logo" 
              />
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>StockPro</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Professional Inventory Management</div>
            </div>
          </div>

          {/* Info Tables */}
          <div style={{ marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px 12px', fontWeight: 'bold', background: '#f5f5f5', width: '180px' }}>ORDER DATE</td>
                  <td style={{ border: '1px solid #000', padding: '8px 12px' }}>{dateStr}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px 12px', fontWeight: 'bold', background: '#f5f5f5' }}>ORDER DETAILS</td>
                  <td style={{ border: '1px solid #000', padding: '8px 12px' }}>{order.customerName.toUpperCase()}</td>
                </tr>
                {order.salesmanName && (
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '8px 12px', fontWeight: 'bold', background: '#f5f5f5' }}>SALESMAN</td>
                    <td style={{ border: '1px solid #000', padding: '8px 12px' }}>{order.salesmanName.toUpperCase()}</td>
                  </tr>
                )}
                {transportName && (
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '8px 12px', fontWeight: 'bold', background: '#f5f5f5' }}>TRANSPORT</td>
                    <td style={{ border: '1px solid #000', padding: '8px 12px' }}>{transportName.toUpperCase()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold' }}>STICKERS</th>
                <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>CUSTOMER NAME</th>
                <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>ITEM CODE</th>
                <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>ITEM NAME</th>
                <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold' }}>QTY</th>
                <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'center', fontWeight: 'bold' }}>UNIT</th>
                <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>TRANSPORT</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}></td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>{order.customerName.toUpperCase()}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', fontFamily: 'monospace' }}>{item.sku}</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>{item.productName.toUpperCase()}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{getQty(item)}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{getUnit(item)}</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>{transportName.toUpperCase() || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.75rem', color: '#999' }}>
              Generated on {new Date().toLocaleString('en-IN')}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
              Authorized Signature
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; background: #fff !important; }
          #invoice-content, #invoice-content * { visibility: visible; }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          .hide-print { display: none !important; }
          .no-padding-print { padding: 0 !important; }
          .invoice-card { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default OrderInvoice;
