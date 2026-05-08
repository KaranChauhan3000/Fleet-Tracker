import { useState, useEffect } from 'react';
import { ToastProvider } from './Toast.jsx';
import Login from './Login.jsx';
import Home from './Home.jsx';
import LogFuel from './LogFuel.jsx';
import Profile from './Profile.jsx';
import {
  getStoredUser, saveAuth, clearAuth,
  setAdminSession, getLogoutDestination,
} from './api.js';
import { Fuel, User, Home as HomeIcon, Loader2, FolderOpen } from 'lucide-react';
import Documents from './Documents.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Reads the three auto-login params that the admin app puts in the URL:
 *   _t    = user JWT token
 *   _u    = employeeId
 *   _from = admin app origin (so we know where to send admin on logout)
 */
function getUrlAutoLogin() {
  const p = new URLSearchParams(window.location.search);
  const token = p.get('_t');
  const uid   = p.get('_u');
  const from  = p.get('_from'); // may be null for normal user visits
  return token && uid ? { token, uid, from } : null;
}

/** Remove all auto-login params from the browser URL bar (no page reload) */
function cleanUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('_t');
  url.searchParams.delete('_u');
  url.searchParams.delete('_from');
  window.history.replaceState({}, '', url.toString());
}

function App() {
  const [user,    setUser]    = useState(null);
  const [screen,  setScreen]  = useState('home');
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function boot() {
      const autoLogin = getUrlAutoLogin();

      // ── Path A: admin app redirected here with a token ────────────────────
      if (autoLogin) {
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${autoLogin.token}` },
          });
          if (res.ok) {
            const data = await res.json();
            saveAuth(autoLogin.token, data);

            // Mark this as an admin-initiated session and store the origin the
            // admin app passed via _from. getLogoutDestination() will use this
            // to send the admin back to the correct admin portal on logout.
            setAdminSession(autoLogin.from);

            cleanUrl();
            setUser(data);
            setBooting(false);
            return;
          }
        } catch {}

        // Token was invalid — clean up and fall through to the login screen
        cleanUrl();
        clearAuth();
        setBooting(false);
        return;
      }

      // ── Path B: normal user opening the app directly ──────────────────────
      const stored = getStoredUser();
      if (stored) {
        const token = localStorage.getItem('fp_user_token');
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            saveAuth(token, data);
            setUser(data);
            setBooting(false);
            return;
          }
        } catch {}
        clearAuth();
      }

      setBooting(false);
    }
    boot();
  }, []);

  /**
   * Logout handler — used by Home and Profile screens.
   *
   * getLogoutDestination() returns:
   *   - A URL string → this session came from the admin app, redirect there
   *                    (admin lands back on ADMIN login page with both login options)
   *   - null         → normal user session, stay on the user login page
   */
  function handleLogout() {
    const dest = getLogoutDestination();
    clearAuth();
    if (dest) {
      window.location.href = dest;
    } else {
      setUser(null);
    }
  }

  // ── Loading splash ────────────────────────────────────────────────────────
  if (booting) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 14,
        background: 'var(--bg-base)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg,#1E40AF,#3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(59,130,246,0.28)',
        }}>
          <Fuel size={26} color="#fff" />
        </div>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  // ── Not logged in → show Login screen ────────────────────────────────────
  if (!user) return <Login onLogin={u => { setUser(u); setScreen('home'); }} />;

  // ── Full-screen log fuel (no bottom nav) ──────────────────────────────────
  if (screen === 'log')  return <LogFuel   user={user} onBack={() => setScreen('home')} />;
  if (screen === 'docs') return <Documents user={user} />;

  // ── Main app with bottom nav ──────────────────────────────────────────────
  return (
    <>
      {screen === 'home'    && <Home    user={user} onLogout={handleLogout} onNavigate={setScreen} />}
      {screen === 'profile' && <Profile user={user} onLogout={handleLogout} />}

      <nav className="bottom-nav">
        <button className={`bottom-nav-item ${screen === 'home'    ? 'active' : ''}`} onClick={() => setScreen('home')}>
          <HomeIcon /> Home
        </button>
        <button className={`bottom-nav-item ${screen === 'log'     ? 'active' : ''}`} onClick={() => setScreen('log')}>
          <Fuel /> Log Fuel
        </button>
        <button className={`bottom-nav-item ${screen === 'docs'    ? 'active' : ''}`} onClick={() => setScreen('docs')}>
          <FolderOpen /> Docs
        </button>
        <button className={`bottom-nav-item ${screen === 'profile' ? 'active' : ''}`} onClick={() => setScreen('profile')}>
          <User /> Profile
        </button>
      </nav>
    </>
  );
}

export default function Root() {
  return <ToastProvider><App /></ToastProvider>;
}
