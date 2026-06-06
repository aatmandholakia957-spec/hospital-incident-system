'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, Lock, Mail, Activity } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
      setSubmitting(false);
    }
  };

  const fillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <p>Loading your workspace...</p>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="login-page">
      <div className="login-card animate-fadeInUp">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Activity color="#fff" size={28} />
          </div>
          <h1>CareTrace</h1>
          <p>Hospital Incident Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-gray-400)' }} />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '40px' }}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-gray-400)' }} />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
                disabled={submitting}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting} style={{ marginTop: '10px' }}>
            {submitting ? <Spinner size="sm" color="white" /> : 'Sign In'}
          </button>
        </form>

        <div className="login-credentials">
          <h4>Demo Credentials (Click to Fill)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => fillCredentials('admin@hospital.com', 'admin123')}
                className="btn btn-ghost btn-sm"
                style={{ justifyContent: 'center', color: '#fff', background: 'rgba(255, 255, 255, 0.05)', padding: '8px 10px' }}
              >
                <strong>Admin</strong>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('staff@hospital.com', 'staff123')}
                className="btn btn-ghost btn-sm"
                style={{ justifyContent: 'center', color: '#fff', background: 'rgba(255, 255, 255, 0.05)', padding: '8px 10px' }}
              >
                <strong>Staff (IPD)</strong>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('viewer@hospital.com', 'viewer123')}
                className="btn btn-ghost btn-sm"
                style={{ justifyContent: 'center', color: '#fff', background: 'rgba(255, 255, 255, 0.05)', padding: '8px 10px', gridColumn: 'span 2' }}
              >
                <strong>Viewer (Management)</strong>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Department Head Logins
              </span>
              <select
                onChange={(e) => {
                  const email = e.target.value;
                  if (email) {
                    fillCredentials(email, 'dept123');
                  }
                }}
                className="form-input"
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                defaultValue=""
              >
                <option value="" disabled style={{ background: '#1e293b', color: '#94a3b8' }}>Select Department Head...</option>
                <option value="hk@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>1. HK (hk@hospital.com)</option>
                <option value="maintenance@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>2. Maintenance (maintenance@hospital.com)</option>
                <option value="canteen@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>3. Canteen (canteen@hospital.com)</option>
                <option value="depthead@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>4. OPD (depthead@hospital.com)</option>
                <option value="reception@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>5. Reception (reception@hospital.com)</option>
                <option value="ot@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>6. OT (ot@hospital.com)</option>
                <option value="priya@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>7. IPD (priya@hospital.com)</option>
                <option value="ipd-ma@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>8. IPD-MA (ipd-ma@hospital.com)</option>
                <option value="hr@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>9. HR (hr@hospital.com)</option>
                <option value="finance@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>10. Finance & Billing (finance@hospital.com)</option>
                <option value="accounting@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>11. Accounting (accounting@hospital.com)</option>
                <option value="telecaller@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>12. Telecaller (telecaller@hospital.com)</option>
                <option value="pharmacy@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>13. Pharmacy (pharmacy@hospital.com)</option>
                <option value="marketing@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>14. Marketing (marketing@hospital.com)</option>
                <option value="quality@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>15. Quality (quality@hospital.com)</option>
                <option value="mrd@hospital.com" style={{ background: '#1e293b', color: '#fff' }}>16. MRD (mrd@hospital.com)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
