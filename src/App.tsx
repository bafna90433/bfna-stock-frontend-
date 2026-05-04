import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import PortalThemeInjector from './components/PortalThemeInjector';

// Base Pages
import Login from './pages/Login';
import Products from './pages/Products';
import { useAuthStore } from './store/authStore';

// Admin Portal
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';

// Stock Manager Portal
import StockManagerLayout from './pages/stock-manager/StockManagerLayout';
import StockManagerDashboard from './pages/stock-manager/StockManagerDashboard';
import CategoryManagement from './pages/admin/CategoryManagement';
import StockManagement from './pages/admin/StockManagement';
import AddProduct from './pages/stock-manager/AddProduct';
import StockHistory from './pages/stock-manager/StockHistory';

// Staff Portal
import StaffLayout from './pages/salestaff/StaffLayout';
import StaffDashboard from './pages/salestaff/StaffDashboard';
import DirectOrder from './pages/salestaff/DirectOrder';
import DispatchedOrders from './pages/salestaff/DispatchedOrders';
import PendingOrders from './pages/salestaff/PendingOrders';
import OrderInvoice from './pages/salestaff/OrderInvoice';
import ManageOrders from './pages/salestaff/ManageOrders';

// Dispatch Portal
import DispatchLayout from './pages/dispatch/DispatchLayout';
import DispatchDashboard from './pages/dispatch/DispatchDashboard';
import DispatchList from './pages/dispatch/DispatchList';
import DispatchOrder from './pages/dispatch/DispatchOrder';
import DispatchHistory from './pages/dispatch/DispatchHistory';
import HoldOrders from './pages/dispatch/HoldOrders';
import ReadyToDispatch from './pages/dispatch/ReadyToDispatch';
import DispatchedItems from './pages/dispatch/DispatchedItems';

// Checking Portal
import CheckingLayout from './pages/checking/CheckingLayout';
import CheckingDashboard from './pages/checking/CheckingDashboard';
import CheckingOrder from './pages/checking/CheckingOrder';
import CheckingHistory from './pages/checking/CheckingHistory';

// Billing Portal
import BillingLayout from './pages/billing/BillingLayout';
import BillingDashboard from './pages/billing/BillingDashboard';
import BillCreate from './pages/billing/BillCreate';
import BillView from './pages/billing/BillView';
import ReadyForBill from './pages/billing/ReadyForBill';
import GeneratedBills from './pages/billing/GeneratedBills';
import CustomerFulfillment from './pages/shared/CustomerFulfillment';

const RoleRedirect: React.FC = () => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'stock_manager') return <Navigate to="/stock-manager/dashboard" replace />;
  if (user.role === 'dispatch') return <Navigate to="/dispatch/dashboard" replace />;
  if (user.role === 'billing') return <Navigate to="/billing/dashboard" replace />;
  if (user.role === 'sale_staff') return <Navigate to="/sale-staff/dashboard" replace />;
  if (user.role === 'checking') return <Navigate to="/checking/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <PortalThemeInjector />
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' },
        success: { iconTheme: { primary: 'var(--success)', secondary: 'white' } },
        error: { iconTheme: { primary: 'var(--danger)', secondary: 'white' } },
      }} />
      <Routes>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={
          <div className="empty-state" style={{ minHeight: '100vh' }}>
            <div className="empty-icon">🚫</div>
            <div className="empty-title">Access Denied</div>
            <div className="empty-text">You don't have permission to view this portal</div>
            <button onClick={() => window.location.href = '/'} className="btn btn-primary" style={{ marginTop: '1rem' }}>Return to Portal</button>
          </div>
        } />

        {/* --- PORTALS --- */}

        {/* Admin Portal */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="stock" element={<StockManagement />} />
          <Route path="products" element={<Products />} />
        </Route>

        {/* Stock Manager Portal */}
        <Route path="/stock-manager" element={<StockManagerLayout />}>
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StockManagerDashboard />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="stock" element={<StockManagement />} />
          <Route path="add-product" element={<AddProduct />} />
          <Route path="edit-product/:id" element={<AddProduct />} />
          <Route path="products" element={<Products />} />
          <Route path="history" element={<StockHistory />} />
        </Route>

        {/* Staff Portal */}
        <Route path="/sale-staff" element={<StaffLayout />}>
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="direct-order" element={<DirectOrder />} />
          <Route path="edit-order/:id" element={<DirectOrder />} />
          <Route path="manage-orders" element={<ManageOrders />} />
          <Route path="dispatched-orders" element={<DispatchedOrders />} />
          <Route path="pending-orders" element={<PendingOrders />} />
          <Route path="invoice/:orderId" element={<OrderInvoice />} />
          <Route path="fulfillment" element={<CustomerFulfillment />} />
        </Route>

        {/* Dispatch Portal */}
        <Route path="/dispatch" element={<DispatchLayout />}>
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DispatchDashboard />} />
          <Route path="orders" element={<DispatchList />} />
          <Route path="orders/:orderId" element={<DispatchOrder />} />
          <Route path="hold" element={<HoldOrders />} />
          <Route path="ready" element={<ReadyToDispatch />} />
          <Route path="dispatched" element={<DispatchedItems />} />
          <Route path="history" element={<DispatchHistory />} />
        </Route>

        {/* Billing Portal */}
        <Route path="/billing" element={<BillingLayout />}>
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<BillingDashboard />} />
          <Route path="ready" element={<ReadyForBill />} />
          <Route path="generated" element={<GeneratedBills />} />
          <Route path="fulfillment" element={<CustomerFulfillment />} />
          <Route path="create/:orderId" element={<BillCreate />} />
          <Route path=":billId" element={<BillView />} />
        </Route>

        {/* Checking Portal (Mobile) */}
        <Route path="/checking" element={<CheckingLayout />}>
          <Route path="" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CheckingDashboard />} />
          <Route path="order/:id" element={<CheckingOrder />} />
          <Route path="history" element={<CheckingHistory />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
