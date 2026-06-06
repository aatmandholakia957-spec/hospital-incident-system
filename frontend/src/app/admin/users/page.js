'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { DEPARTMENTS, ROLES, ROLE_COLORS } from '@/lib/constants';
import { UserPlus, Edit2, ShieldAlert, X, ShieldCheck } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null); // null for create, object for edit

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/users');
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Failed to fetch user index.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Role guard: Only admin can see this page
    if (currentUser && currentUser.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    fetchUsers();
  }, [currentUser, router, fetchUsers]);

  const handleOpenCreateModal = () => {
    setEditUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('staff');
    setDepartment('Emergency');
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setEditUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setDepartment(user.department || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editUser) {
        // Edit User
        const payload = { name, email, role, department };
        const res = await api.put(`/api/admin/users/${editUser._id}`, payload);
        if (res.success) {
          setToast({ type: 'success', message: `User ${name} updated successfully.` });
          fetchUsers();
          setShowModal(false);
        }
      } else {
        // Create User
        if (!password) {
          setToast({ type: 'error', message: 'Password is required for new accounts.' });
          setSubmitting(false);
          return;
        }
        const payload = { name, email, password, role, department };
        const res = await api.post('/api/admin/users', payload);
        if (res.success) {
          setToast({ type: 'success', message: `Account created for ${name}.` });
          fetchUsers();
          setShowModal(false);
        }
      }
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: err.message || 'Action failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="System Administration" subtitle="Loading user directories...">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-gray-500)' }}>Syncing secure directory services...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="User Management" subtitle="Provision user accounts and allocate clinical security roles">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Control Header Card */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>System Directory</h3>
          <span style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
            Managing {users.length} active system operator accounts
          </span>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={16} />
          Provision Account
        </button>
      </div>

      {/* Directory Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Operator Name</th>
                <th>Clinical Email</th>
                <th>Assigned Role</th>
                <th>Assigned Department</th>
                <th>Clearance Verified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="table-row-hover">
                  <td style={{ fontWeight: '600', color: 'var(--color-gray-900)' }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge" style={{ background: ROLE_COLORS[u.role]?.bg || '#f3f4f6', color: ROLE_COLORS[u.role]?.text || '#374151', textTransform: 'capitalize', fontWeight: '600' }}>
                      {u.role === 'dept_head' ? 'Dept Head' : u.role}
                    </span>
                  </td>
                  <td>{u.department || 'N/A (All Access)'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '13px' }}>
                      <ShieldCheck size={16} /> Verified Active
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={() => handleOpenEditModal(u)}
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Edit User Role"
                      disabled={u._id === currentUser?._id} // Prevent self modifications
                    >
                      <Edit2 size={15} color="var(--color-primary-600)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Operator Modal Overlay */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="card animate-scaleIn" style={{ width: '100%', maxWidth: '500px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-gray-200)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '700' }}>
                {editUser ? `Modify Clearance: ${editUser.name}` : 'Provision System Account'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--color-gray-400)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arthur Dent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input form-input--light"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="dent@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input form-input--light"
                  disabled={submitting}
                />
              </div>

              {!editUser && (
                <div className="form-group">
                  <label className="form-label">Secret Cipher (Password) *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input form-input--light"
                    disabled={submitting}
                  />
                </div>
              )}

              <div className="grid grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Clearance Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="form-select--light"
                    disabled={submitting}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="form-select--light"
                    disabled={submitting || role === 'admin' || role === 'viewer'}
                  >
                    <option value="">Full Range Access</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {role === 'admin' && (
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.12)', padding: '10px', borderRadius: '6px' }}>
                  <ShieldAlert size={18} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '11px', color: 'var(--color-danger-text)', margin: 0, lineHeight: '1.4' }}>
                    <strong>Warning:</strong> Admin clearance grants absolute control. Admins can view/modify all records, configure operators, and erase logs.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? <Spinner size="sm" color="white" /> : editUser ? 'Save Clearance' : 'Create Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
