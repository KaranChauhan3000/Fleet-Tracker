/**
 * Login.jsx — User (Driver) frontend login
 * ─────────────────────────────────────────
 * Auth flow: Employee ID + last 4 digits of registered mobile = password.
 * No OTP, no SMS.
 *
 * Steps:
 *   home → enter-id → company-pick (if multiple) → done
 */

import { useState } from 'react';
import { api, saveAuth, getCompanySlug, getSavedProfile } from './api.js';
import { useToast } from './Toast.jsx';
import {
  Fuel, Hash, Building2, Loader2, UserCircle2,
  Shield, Eye, EyeOff, ChevronRight, ArrowLeft,
} from 'lucide-react';

// ── Reusable UI pieces ────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '11px 14px',
  fontSize: 15, borderRadius: 10,
  border: '1.5px solid var(--border)',
  background: 'var(--bg-card)', color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

function Input({ type = 'text', placeholder, value, onChange, disabled, inputMode, maxLength }) {
  return (
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={onChange} disabled={disabled}
      inputMode={inputMode} maxLength={maxLength}
      onFocus={e => { e.target.style.borderColor = '#3B82F6'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
      style={inputStyle}
    />
  );
}

function PasswordInput({ value, onChange, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        inputMode="numeric"
        maxLength={4}
        placeholder="Last 4 digits of your mobile"
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={e => { e.target.style.borderColor = '#3B82F6'; }}
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

function Btn({ children, onClick, loading, disabled, color = '#3B82F6' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', padding: '12px 16px',
        fontSize: 15, fontWeight: 700,
        borderRadius: 10, border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: disabled || loading ? 0.6 : 1,
        background: color, color: '#fff',
        transition: 'opacity 0.15s',
      }}
    >
      {loading
        ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        : children}
    </button>
  );
}

function Card({ children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1.5px solid var(--border)',
      borderRadius: 14, padding: '24px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <p style={{
      fontSize: 12, fontWeight: 600,
      color: 'var(--text-muted)', marginBottom: 6,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {children}
    </p>
  );
}

function PasswordHint() {
  return (
    <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
      🔒 Password = last 4 digits of your registered mobile
    </p>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  Main Login Component
// ═════════════════════════════════════════════════════════════════════════════
export default function Login({ onLogin }) {
  const toast       = useToast();
  const slug        = getCompanySlug();
  const savedProfile = getSavedProfile();

  // step: 'enter-id' | 'company-pick'
  const [step,         setStep]       = useState('enter-id');
  const [loading,      setLoading]    = useState(false);
  const [employeeId,   setEmployeeId] = useState('');
  const [password,     setPassword]   = useState('');
  const [companyList,  setCompanyList]= useState([]);

  const companyName = savedProfile?.companyName || '';

  async function handleLogin(companyId) {
    if (!employeeId.trim() || !password.trim()) {
      return toast.error('Enter your Employee ID and password');
    }
    if (password.length !== 4) {
      return toast.error('Password must be exactly 4 digits');
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/user/login', {
        employeeId: employeeId.trim(),
        password:   password.trim(),
        ...(companyId ? { companyId } : {}),
      });

      if (res.requiresCompanySelection) {
        setCompanyList(res.companies);
        setStep('company-pick');
        return;
      }

      saveAuth(res.token, res.user);
      toast.success(`Welcome, ${res.user.name}!`);
      onLogin(res.user);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const pageStyle = {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-base)', padding: '24px 16px', boxSizing: 'border-box',
  };

  function Logo() {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
        }}>
          <Fuel size={22} color="#fff" />
        </div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            {companyName || 'FleetPro'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
            {companyName ? 'Fleet Management' : 'Driver Portal'}
          </p>
        </div>
      </div>
    );
  }

  // ── ENTER ID + PASSWORD ─────────────────────────────────────────────────────
  if (step === 'enter-id') {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Logo />

          {savedProfile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
            }}>
              <UserCircle2 size={18} style={{ color: '#3B82F6', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{savedProfile.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                  ID: {savedProfile.employeeId} · {savedProfile.companyName}
                </p>
              </div>
            </div>
          )}

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: '#3B82F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <UserCircle2 size={18} color="#fff" />
              </div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', margin: 0 }}>Driver Login</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Enter your ID and password</p>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <Label><Hash size={10} style={{ display: 'inline', marginRight: 4 }} />Employee ID</Label>
              <Input
                placeholder="e.g. EMP001"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: 6 }}>
              <Label><Shield size={10} style={{ display: 'inline', marginRight: 4 }} />Password</Label>
              <PasswordInput
                value={password}
                onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={loading}
              />
            </div>

            <PasswordHint />

            <Btn onClick={() => handleLogin(null)} loading={loading} style={{ marginTop: 18 }}>
              Sign In
            </Btn>
          </Card>
        </div>
      </div>
    );
  }

  // ── COMPANY PICK ─────────────────────────────────────────────────────────────
  if (step === 'company-pick') {
    return (
      <div style={pageStyle}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Logo />
          <button
            onClick={() => setStep('enter-id')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              gap: 6, fontSize: 13, padding: '0 0 16px 0',
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <Card>
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>Select Your Company</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              Multiple companies found for <strong>{employeeId}</strong>:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {companyList.map(c => (
                <button
                  key={c.id}
                  disabled={loading}
                  onClick={() => handleLogin(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', background: 'var(--bg-elevated)',
                    border: '1.5px solid var(--border)', borderRadius: 10,
                    cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#3B82F6'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <Building2 size={18} style={{ color: '#3B82F6', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>{c.name}</span>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
