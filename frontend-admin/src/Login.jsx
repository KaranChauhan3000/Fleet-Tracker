/**
 * Login.jsx — Admin frontend login/register
 * ─────────────────────────────────────────
 * Auth flow: Mobile number + last 4 digits of mobile = password.
 * No OTP. Register creates company + admin immediately.
 *
 * Steps (admin):
 *   home → admin-login → (done)
 *   home → register    → (done)
 *
 * Steps (user / sub-admin viewing user panel):
 *   home → user-login → (done)
 */

import { useState } from 'react';
import {
  api, saveAuth, saveUserAuth, getStoredAdmin, clearAuth, clearUserAuth,
} from './api.js';
import { useToast } from './Toast.jsx';
import {
  Fuel, Phone, Building2, Loader2, UserCircle2,
  Hash, ArrowLeft, Shield, Mail, User,
  Briefcase, ChevronRight, Eye, EyeOff, Sun, Moon,
} from 'lucide-react';

// ── Small reusable components ─────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '24px 20px',
      boxShadow: 'var(--shadow)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600,
          color: 'var(--text-muted)', marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {Icon && <Icon size={12} />}
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px',
  fontSize: 15, borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--border)',
  background: 'var(--bg-input)', color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

function Input({ type = 'text', placeholder, value, onChange, disabled, onFocus, onBlur, maxLength, inputMode }) {
  return (
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={onChange} disabled={disabled} maxLength={maxLength}
      inputMode={inputMode}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; onFocus?.(e); }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; onBlur?.(e); }}
      style={inputStyle}
    />
  );
}

function PasswordInput({ value, onChange, disabled, placeholder = 'Last 4 digits of your mobile' }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        inputMode="numeric"
        maxLength={4}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
        style={{ ...inputStyle, paddingRight: 44, letterSpacing: show ? 'normal' : '0.3em' }}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', padding: 0, display: 'flex',
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function Btn({ children, onClick, loading, disabled, variant = 'primary', style: extra }) {
  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', padding: '12px 16px',
        fontSize: 15, fontWeight: 700,
        borderRadius: 'var(--radius-sm)', border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'opacity 0.15s',
        opacity: disabled || loading ? 0.6 : 1,
        background: isPrimary ? 'var(--accent)' : 'var(--bg-elevated)',
        color: isPrimary ? '#fff' : 'var(--text-primary)',
        ...extra,
      }}
    >
      {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : children}
    </button>
  );
}

function BackBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
        gap: 6, fontSize: 13, padding: '0 0 16px 0',
      }}
    >
      <ArrowLeft size={14} /> Back
    </button>
  );
}

function RoleCard({ icon, title, subtitle, onClick, accentColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%',
        padding: '15px 16px', background: 'var(--bg-card)',
        border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        boxSizing: 'border-box', boxShadow: 'var(--shadow)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.boxShadow = `0 4px 16px ${accentColor}22`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'var(--shadow)';
      }}
    >
      <div style={{
        width: 44, height: 44, flexShrink: 0, borderRadius: 12,
        background: accentColor, display: 'flex', alignItems: 'center',
        justifyContent: 'center', boxShadow: `0 4px 12px ${accentColor}40`,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
      </div>
      <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  );
}

function PasswordHint() {
  return (
    <p style={{
      fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
      marginTop: 8, lineHeight: 1.5,
    }}>
      🔒 Password = last 4 digits of your mobile number
    </p>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Main Login Component
// ═════════════════════════════════════════════════════════════════════════════
export default function Login({ onLogin, dark, onToggleTheme, initialStep = 'home', savedProfile = null }) {
  const toast = useToast();
  const storedAdmin = getStoredAdmin();

  // step: 'home' | 'admin-login' | 'user-login' | 'user-company-pick' | 'register'
  const [step,    setStep]    = useState(initialStep);
  const [loading, setLoading] = useState(false);

  // Admin login
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');

  // User login
  const [employeeId,  setEmployeeId]  = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [companyList,  setCompanyList]  = useState([]);

  // Register
  const [regCompany,     setRegCompany]     = useState('');
  const [regName,        setRegName]        = useState('');
  const [regEmail,       setRegEmail]       = useState('');
  const [regPhone,       setRegPhone]       = useState('');
  const [regDesignation, setRegDesignation] = useState('');

  function reset() {
    setPhone(''); setPassword('');
    setEmployeeId(''); setUserPassword(''); setCompanyList([]);
    setRegCompany(''); setRegName(''); setRegEmail('');
    setRegPhone(''); setRegDesignation('');
  }

  function go(s) { reset(); setStep(s); }

  // ── Admin login ─────────────────────────────────────────────────────────────
  async function handleAdminLogin() {
    if (!phone.trim() || !password.trim()) return toast.error('Enter phone and password');
    if (password.length !== 4) return toast.error('Password must be exactly 4 digits');
    setLoading(true);
    try {
      const res = await api.post('/auth/admin/login', { phone: phone.trim(), password: password.trim() });
      saveAuth(res.token, res.user);
      toast.success(`Welcome back, ${res.user.name}!`);
      onLogin(res.user, 'admin');
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  // ── Quick resume (stored admin) ─────────────────────────────────────────────
  async function handleResume() {
    if (!storedAdmin) { clearAuth(); setStep('admin-login'); return; }
    try {
      const data = await api.get('/auth/me');
      saveAuth(localStorage.getItem('fp_admin_token'), data);
      onLogin(data, 'admin');
    } catch (e) {
      clearAuth();
      if (e.message?.includes('401')) toast.error('Session expired. Please log in again.');
      setStep('admin-login');
    }
  }

  // ── User login ──────────────────────────────────────────────────────────────
  async function handleUserLogin(companyId) {
    if (!employeeId.trim() || !userPassword.trim()) return toast.error('Enter Employee ID and password');
    if (userPassword.length !== 4) return toast.error('Password must be exactly 4 digits');
    setLoading(true);
    try {
      const res = await api.post('/auth/user/login', {
        employeeId: employeeId.trim(),
        password:   userPassword.trim(),
        ...(companyId ? { companyId } : {}),
      });
      if (res.requiresCompanySelection) {
        setCompanyList(res.companies);
        setStep('user-company-pick');
        return;
      }
      saveUserAuth(res.token, res.user);
      toast.success(`Welcome, ${res.user.name}!`);
      onLogin(res.user, 'user');
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  // ── Register ────────────────────────────────────────────────────────────────
  async function handleRegister() {
    if (!regCompany.trim() || !regName.trim() || !regEmail.trim() || !regPhone.trim()) {
      return toast.error('All fields except designation are required');
    }
    const digitsOnly = regPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) return toast.error('Enter a valid 10-digit phone number');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        companyName:  regCompany.trim(),
        name:         regName.trim(),
        email:        regEmail.trim(),
        phone:        regPhone.trim(),
        designation:  regDesignation.trim(),
      });
      saveAuth(res.token, res.user);
      toast.success(`Welcome to FleetPro, ${res.user.name}!`);
      onLogin(res.user, 'admin');
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }

  // ── Shared layout ───────────────────────────────────────────────────────────
  const maxWidth = 420;
  const pageStyle = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-base)', padding: '20px 16px', boxSizing: 'border-box',
  };

  function Logo() {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: 'var(--accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
        }}>
          <Fuel size={22} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>FleetPro</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Fleet Management</p>
        </div>
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            style={{
              marginLeft: 'auto', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
            }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </div>
    );
  }

  // ── HOME ────────────────────────────────────────────────────────────────────
  if (step === 'home') {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth }}>
          <Logo />

          {storedAdmin && (
            <Card style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resume session</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCircle2 size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{storedAdmin.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{storedAdmin.companyName}</p>
                </div>
              </div>
              <Btn onClick={handleResume} loading={loading}>Continue as {storedAdmin.name.split(' ')[0]}</Btn>
            </Card>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <RoleCard
              icon={<Shield size={20} color="#fff" />}
              title="Admin Login"
              subtitle="Manage your fleet & team"
              accentColor="var(--accent)"
              onClick={() => go('admin-login')}
            />
            <RoleCard
              icon={<UserCircle2 size={20} color="#fff" />}
              title="Driver / User Login"
              subtitle="Access your vehicle & logs"
              accentColor="#2563EB"
              onClick={() => go('user-login')}
            />
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            New company?{' '}
            <button
              onClick={() => go('register')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: 13, padding: 0 }}
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── ADMIN LOGIN ─────────────────────────────────────────────────────────────
  // ── SAVED PROFILE (locked screen) ─────────────────────────────────────────
  if (savedProfile) {
    const isAdmin = savedProfile.role === 'admin';
    const name = savedProfile.data?.name || (isAdmin ? 'Admin' : 'User');
    const company = savedProfile.data?.companyName || savedProfile.data?.company?.name || '';
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth }}>
          <Logo />
          <Card>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: isAdmin ? 'var(--accent-dim)' : 'rgba(37,99,235,0.10)', border: isAdmin ? '1px solid rgba(249,115,22,0.25)' : '1px solid rgba(37,99,235,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span style={{ fontSize: 26 }}>{name.charAt(0).toUpperCase()}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 4px' }}>Welcome back</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{name}</p>
              {company ? <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{company}</p> : null}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, opacity: 0.6 }}>{isAdmin ? 'Admin' : 'Driver / User'}</p>
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => onLogin({ ...savedProfile.data, role: savedProfile.role })}
            >
              Continue
            </button>
            <button
              style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '10px 0' }}
              onClick={() => { if (isAdmin) { clearAuth(); } else { clearUserAuth(); } window.location.reload(); }}
            >
              Sign in as someone else
            </button>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'admin-login') {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth }}>
          <Logo />
          <BackBtn onClick={() => go('home')} />
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={18} color="#fff" />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>Admin Login</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Enter your mobile & password</p>
              </div>
            </div>

            <Field label="Mobile Number" icon={Phone}>
              <Input
                type="tel" inputMode="numeric"
                placeholder="e.g. 9876543210"
                value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                disabled={loading}
              />
            </Field>

            <Field label="Password" icon={Shield}>
              <PasswordInput
                value={password}
                onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={loading}
              />
            </Field>

            <PasswordHint />

            <Btn onClick={handleAdminLogin} loading={loading} style={{ marginTop: 18 }}>
              Sign In
            </Btn>
          </Card>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            New company?{' '}
            <button
              onClick={() => go('register')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: 13, padding: 0 }}
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── USER LOGIN ──────────────────────────────────────────────────────────────
  if (step === 'user-login') {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth }}>
          <Logo />
          <BackBtn onClick={() => go('home')} />
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCircle2 size={18} color="#fff" />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>Driver / User Login</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Enter your Employee ID & password</p>
              </div>
            </div>

            <Field label="Employee ID" icon={Hash}>
              <Input
                placeholder="e.g. EMP001"
                value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                disabled={loading}
              />
            </Field>

            <Field label="Password" icon={Shield}>
              <PasswordInput
                value={userPassword}
                onChange={e => setUserPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={loading}
              />
            </Field>

            <PasswordHint />

            <Btn onClick={() => handleUserLogin(null)} loading={loading} style={{ marginTop: 18, background: '#2563EB' }}>
              Sign In
            </Btn>
          </Card>
        </div>
      </div>
    );
  }

  // ── USER COMPANY PICK ───────────────────────────────────────────────────────
  if (step === 'user-company-pick') {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth }}>
          <Logo />
          <BackBtn onClick={() => go('user-login')} />
          <Card>
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>Select Your Company</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              Multiple companies found for <strong>{employeeId}</strong>. Pick yours:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {companyList.map(c => (
                <button
                  key={c.id}
                  disabled={loading}
                  onClick={() => handleUserLogin(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    background: 'var(--bg-elevated)', border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    transition: 'border-color 0.15s', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#2563EB'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <Building2 size={18} style={{ color: '#2563EB', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{c.name}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── REGISTER ────────────────────────────────────────────────────────────────
  if (step === 'register') {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth }}>
          <Logo />
          <BackBtn onClick={() => go('home')} />
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} color="#fff" />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', margin: 0 }}>Register Company</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Set up your fleet account</p>
              </div>
            </div>

            <Field label="Company Name" icon={Building2}>
              <Input placeholder="e.g. Sharma Logistics Pvt Ltd" value={regCompany}
                onChange={e => setRegCompany(e.target.value)} disabled={loading} />
            </Field>

            <Field label="Your Name" icon={User}>
              <Input placeholder="Full name" value={regName}
                onChange={e => setRegName(e.target.value)} disabled={loading} />
            </Field>

            <Field label="Email Address" icon={Mail}>
              <Input type="email" placeholder="admin@company.com" value={regEmail}
                onChange={e => setRegEmail(e.target.value)} disabled={loading} />
            </Field>

            <Field label="Mobile Number" icon={Phone}>
              <Input type="tel" inputMode="numeric"
                placeholder="10-digit mobile number"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                disabled={loading} />
            </Field>

            <Field label="Designation (optional)" icon={Briefcase}>
              <Input placeholder="e.g. Fleet Manager" value={regDesignation}
                onChange={e => setRegDesignation(e.target.value)} disabled={loading} />
            </Field>

            {regPhone.replace(/\D/g, '').length >= 4 && (
              <div style={{
                background: 'var(--accent-dim)', border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 6,
              }}>
                <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, margin: 0 }}>
                  🔒 Your password will be: <strong>
                    {regPhone.replace(/\D/g, '').slice(-4)}
                  </strong>
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Last 4 digits of your mobile number — use this to log in.
                </p>
              </div>
            )}

            <Btn onClick={handleRegister} loading={loading} style={{ marginTop: 12 }}>
              Create Account
            </Btn>
          </Card>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            Already registered?{' '}
            <button
              onClick={() => go('admin-login')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 700, fontSize: 13, padding: 0 }}
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
