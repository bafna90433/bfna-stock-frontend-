import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, CheckCircle, XCircle, X, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

interface User {
  _id: string;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#6C5CE7', sale_staff: '#FF6B6B', dispatch: '#00CEC9', billing: '#FDCB6E', stock_manager: '#A29BFE', viewer: '#74B9FF',
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'sale_staff', isActive: true });

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (e) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: '', username: '', password: '', role: 'sale_staff', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, username: u.username, password: '', role: u.role, isActive: u.isActive });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.username) return toast.error('Name and username required');
    if (!editUser && !form.password) return toast.error('Password required for new user');
    setSaving(true);
    try {
      if (editUser) {
        const payload: any = { name: form.name, role: form.role, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        await api.put(`/admin/users/${editUser._id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/admin/users', form);
        toast.success('User created');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error saving user');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.put(`/admin/users/${u._id}`, { isActive: !u.isActive });
      toast.success(`User ${!u.isActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create and manage staff accounts</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="create-user-btn">
          <Plus size={16} /> Create User
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {['admin', 'sale_staff', 'dispatch', 'billing', 'stock_manager', 'viewer'].map(role => (
          <div key={role} className="stat-card">
            <div className="stat-icon" style={{ background: `${ROLE_COLORS[role]}22`, color: ROLE_COLORS[role] }}>
              <Shield size={20} />
            </div>
            <div className="stat-value">{users.filter(u => u.role === role).length}</div>
            <div className="stat-label" style={{ textTransform: 'capitalize' }}>{role}s</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><Users size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Staff Members ({users.length})</h3>
        </div>
        {loading ? (
          <div className="loading-page"><div className="spinner"></div></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: `${ROLE_COLORS[u.role]}33`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: ROLE_COLORS[u.role], fontWeight: 700, fontSize: '0.85rem'
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.username}</td>
                    <td>
                      <span className="badge" style={{
                        background: `${ROLE_COLORS[u.role]}22`, color: ROLE_COLORS[u.role],
                        textTransform: 'capitalize'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(u)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {u.isActive
                          ? <><CheckCircle size={16} color="var(--success)" /><span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>Active</span></>
                          : <><XCircle size={16} color="var(--danger)" /><span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>Inactive</span></>
                        }
                      </button>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(u)} title="Edit">
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(u._id, u.name)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editUser ? 'Edit User' : 'Create New User'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" id="user-name" />
              </div>
              <div className="form-group">
                <label className="form-label">Email ID *</label>
                <input className="form-control" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="admin@example.com" disabled={!!editUser} id="user-username" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input className="form-control" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" id="user-password" />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} id="user-role">
                  <option value="sale_staff">Sale Staff</option>
                  <option value="dispatch">Dispatch Staff</option>
                  <option value="billing">Billing Staff</option>
                  <option value="stock_manager">Stock Manager</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {editUser && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.isActive ? 'active' : 'inactive'} onChange={e => setForm({ ...form, isActive: e.target.value === 'active' })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="user-save-btn">
                {saving ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> {editUser ? 'Update User' : 'Create User'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
