import { useState, useEffect, useRef } from 'react';
import { ToastProvider, useToast } from './Toast.jsx';
import InstallPrompt from './InstallPrompt.jsx';
import Onboarding from './Onboarding.jsx';

// ── Auth & API ─────────────────────────────────────────────────────────────────
import {
  BASE,
  getStoredAdmin, isLoggedOut, softLogout, resumeSession, clearAuth,
  getStoredUser,  getUserToken, saveUserAuth, clearUserAuth, getSavedUserProfile,
  prefetchMonths,
} from './api.js';

// ── Shared Login page (handles admin login, user login, registration) ─────────
import Login from './Login.jsx';

// ── Admin Screens ──────────────────────────────────────────────────────────────
import Dashboard      from './Dashboard.jsx';
import UsersPage      from './Users.jsx';
import VehiclesPage   from './Vehicles.jsx';
import FuelLogs           from './FuelLogs.jsx';
import MonthlyFuelLogs     from './MonthlyFuelLogs.jsx';
import Reports        from './Reports.jsx';
import AdminProfile   from './Profile.jsx';
import TeamPage       from './TeamPage.jsx';
import VehicleAnalyticsPage from './VehicleAnalytics.jsx';
import Challans       from './Challans.jsx';
import Services       from './Services.jsx';
import UserDetail     from './UserDetail.jsx';
import FinanceTracker from './FinanceTracker.jsx';
import ExpenseBreakdown from './ExpenseBreakdown.jsx';
import InsuranceManager from './InsuranceManager.jsx';

// ── User Screens (copied from frontend-user, use userApi) ─────────────────────
import UserHome       from './UserHome.jsx';
import UserLogFuel    from './UserLogFuel.jsx';
import UserProfile    from './UserProfile.jsx';
import UserDocuments  from './UserDocuments.jsx';

// ── Icons ──────────────────────────────────────────────────────────────────────
import {
  LayoutDashboard, Users, Car, Fuel, FileText,
  User, Wrench, Home as HomeIcon, FolderOpen, Loader2,
} from 'lucide-react';

// ─── Theme hook ────────────────────────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('fp_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else      document.documentElement.classList.remove('dark');
    localStorage.setItem('fp_theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, () => setDark(d => !d)];
}

// ─── Admin nav tabs ────────────────────────────────────────────────────────────
const ADMIN_NAV = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
  { id: 'vehicles',  label: 'Vehicles', icon: Car },
  { id: 'fuellogs',  label: 'Fuel',     icon: Fuel },
  { id: 'challans',  label: 'Challans', icon: FileText },
  { id: 'users',     label: 'Users',    icon: Users },
  { id: 'services',  label: 'Services', icon: Wrench },
  { id: 'profile',   label: 'Profile',  icon: User },
];

// ─── User nav tabs ─────────────────────────────────────────────────────────────
const USER_NAV = [
  { id: 'home',    label: 'Home',     icon: HomeIcon },
  { id: 'log',     label: 'Log Fuel', icon: Fuel },
  { id: 'docs',    label: 'Docs',     icon: FolderOpen },
  { id: 'profile', label: 'Profile',  icon: User },
];

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const toast = useToast();
  const [dark, toggleTheme] = useTheme();

  // PWA install gate — true once the user has installed or dismissed
  const [installed, setInstalled] = useState(() => {
    // Already running as installed PWA?
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return true;
    // User already passed the install screen this session
    return sessionStorage.getItem('fp_install_done') === '1';
  });

  function handleInstallDone() {
    sessionStorage.setItem('fp_install_done', '1');
    setInstalled(true);
  }

  // Onboarding — show until a user or admin has logged in at least once
  const [onboarded, setOnboarded] = useState(() => {
    // If any saved login exists, skip onboarding
    const hasAdmin = !!localStorage.getItem('fp_admin_token');
    const hasUser  = !!localStorage.getItem('fp_user_token');
    return hasAdmin || hasUser;
  });

  const [loginInitialStep, setLoginInitialStep] = useState('home');

  function handleOnboardingDone(destination) {
    setLoginInitialStep(destination === 'user-login' ? 'user-login' : 'register');
    setOnboarded(true);
  }

  // Who is logged in right now — { role: 'admin'|'user', data: {...} } | null
  const [session, setSession] = useState(null);

  // locked: true when app reopened with a saved session — show login screen first
  // savedProfile: the saved name/role to show on the locked screen
  const [locked, setLocked] = useState(false);
  const [savedProfile, setSavedProfile] = useState(null);
  const [booting, setBooting] = useState(true);

  // Admin navigation state
  const [adminScreen, setAdminScreen] = useState('dashboard');
  const [analyticsVehicleId,     setAnalyticsVehicleId]     = useState(null);
  const [analyticsReturnScreen,  setAnalyticsReturnScreen]  = useState('dashboard');
  const [analyticsInitialTab,    setAnalyticsInitialTab]    = useState(null);
  const [selectedUserId,         setSelectedUserId]         = useState(null);
  const [breakdownParams,        setBreakdownParams]        = useState(null);
  const [monthlyFuelParams,      setMonthlyFuelParams]      = useState(null);

  // User navigation state
  const [userScreen, setUserScreen] = useState('home');

  // ── Android back-button close confirmation ───────────────────────────────────
  // PWAs on Android expose the hardware back press via popstate when there's
  // a history entry to pop. We push a sentinel entry on mount so the first
  // back press fires popstate (instead of silently exiting the PWA), show a
  // confirm modal, and re-push the sentinel on cancel so the trap keeps
  // working. iOS doesn't fire popstate on the swipe-back gesture, so this is
  // an Android-only safeguard — iOS will continue closing silently.
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    // Sentinel entry — first back press lands here, not on PWA exit.
    window.history.pushState({ fpBack: true }, '');

    const onPop = () => {
      if (closingRef.current) return; // user already confirmed; let exit through
      setShowCloseConfirm(true);
      // Re-push so the next back press is also caught.
      window.history.pushState({ fpBack: true }, '');
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function handleConfirmClose() {
    closingRef.current = true;
    setShowCloseConfirm(false);
    // Pop the sentinel + the original entry → PWA exits on Android.
    window.history.go(-2);
    // Belt-and-braces fallback for browsers that allow it.
    setTimeout(() => { try { window.close(); } catch {} }, 150);
  }

  function handleCancelClose() {
    setShowCloseConfirm(false);
  }

  // ── Boot: restore saved session ──────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      // 1. Try admin session first
      if (!isLoggedOut()) {
        const admin = getStoredAdmin();
        if (admin) {
          const token = localStorage.getItem('fp_admin_token');
          try {
            const res = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
              const data = await res.json();
              // Don't auto-enter — show locked screen with saved profile
              setSavedProfile({ role: 'admin', data });
              setLocked(true);
              setBooting(false);
              return;
            }
          } catch {}
          // Token stale — clear and fall through
          clearAuth();
        }
      }

      // 2. Try user session
      const userToken = getUserToken();
      if (userToken) {
        try {
          const res = await fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${userToken}` } });
          if (res.ok) {
            const data = await res.json();
            saveUserAuth(userToken, data);
            // Don't auto-enter — show locked screen with saved profile
            setSavedProfile({ role: 'user', data });
            setLocked(true);
            setBooting(false);
            return;
          }
        } catch {}
        clearUserAuth();
      }

      setBooting(false);
    }
    boot();
  }, []);

  // ── Login callback from Login.jsx ─────────────────────────────────────────────
  function handleLogin(user) {
    if (user.role === 'admin') {
      resumeSession();
      setAdminScreen('dashboard');
      setSession({ role: 'admin', data: user });
      // Warm cache: prefetch last 5 months of stats in background
      import('./api.js').then(({ api }) => {
        prefetchMonths(path => api.get(path), 5);
      });
    } else {
      setUserScreen('home');
      setSession({ role: 'user', data: user });
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────────
  function handleAdminLogout() {
    softLogout();
    setSession(null);
  }

  function handleUserLogout() {
    clearUserAuth();
    setSession(null);
  }

  // ── Admin navigation ──────────────────────────────────────────────────────────
  function handleAdminNavigate(dest, id, initialTab) {
    if (dest === 'vehicleAnalytics' && id) {
      setAnalyticsReturnScreen(adminScreen);
      setAnalyticsVehicleId(id);
      setAnalyticsInitialTab(initialTab || null);
      setAdminScreen('vehicleAnalytics');
    } else if (dest === 'userDetail' && id) {
      setSelectedUserId(id);
      setAdminScreen('userDetail');
    } else if (dest === 'expenseBreakdown') {
      setBreakdownParams(initialTab || {});
      setAdminScreen('expenseBreakdown');
    } else if (dest === 'monthlyFuellogs') {
      setMonthlyFuelParams(initialTab || {});
      setAdminScreen('monthlyFuellogs');
    } else {
      setAdminScreen(dest);
    }
  }

  // ── Render content (wrapped at the end with the close-confirm modal) ─────────
  const content = (() => {

  // ── Loading splash ────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: 'var(--bg-base)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#C2410C,#F97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(249,115,22,0.32)' }}>
          <Fuel size={26} color="#fff" />
        </div>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  // ── PWA install gate ──────────────────────────────────────────────────────────
  if (!installed) {
    return <InstallPrompt onDone={handleInstallDone} />;
  }

  // ── Onboarding (Welcome → Features → Terms) ───────────────────────────────────
  if (!onboarded) {
    return <Onboarding onDone={handleOnboardingDone} />;
  }

  // ── Locked: app reopened with saved session — land on Login HOME view ────────
  // For admins: home step naturally renders the Resume Session card via
  // getStoredAdmin(), alongside Admin Login / Driver-User Login / Register —
  // the exact layout we want on reopen. No savedProfile prop, so Login.jsx
  // does not redirect into its dedicated welcome-back screen.
  // For users: home step has no user-resume card, so keep the welcome-back screen.
  if (locked && savedProfile) {
    if (savedProfile.role === 'admin') {
      return (
        <Login
          onLogin={(user) => { setLocked(false); setSavedProfile(null); handleLogin(user); }}
          dark={dark}
          onToggleTheme={toggleTheme}
          initialStep="home"
        />
      );
    }
    return (
      <Login
        onLogin={(user) => { setLocked(false); setSavedProfile(null); handleLogin(user); }}
        dark={dark}
        onToggleTheme={toggleTheme}
        initialStep="user-login"
        savedProfile={savedProfile}
      />
    );
  }

  // ── Not logged in → unified Login page ───────────────────────────────────────
  if (!session) return <Login onLogin={handleLogin} dark={dark} onToggleTheme={toggleTheme} initialStep={loginInitialStep} />;

  // ═══════════════════════════════════════════════════════════════════════════════
  //  USER ROLE
  // ═══════════════════════════════════════════════════════════════════════════════
  if (session.role === 'user') {
    const user = session.data;

    // Full-screen log fuel (no bottom nav)
    if (userScreen === 'log') {
      return <UserLogFuel user={user} onBack={() => setUserScreen('home')} />;
    }

    return (
      <>
        {userScreen === 'home'    && <UserHome      user={user} onLogout={handleUserLogout} onNavigate={setUserScreen} />}
        {userScreen === 'docs'    && <UserDocuments user={user} />}
        {userScreen === 'profile' && <UserProfile   user={user} onLogout={handleUserLogout} />}

        <nav className="bottom-nav">
          {USER_NAV.map(({ id, label, icon: Icon }) => (
            <button key={id}
              className={`bottom-nav-item ${userScreen === id ? 'active' : ''}`}
              onClick={() => setUserScreen(id)}
            >
              <Icon /> {label}
              <div className="nav-dot" />
            </button>
          ))}
        </nav>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  ADMIN ROLE
  // ═══════════════════════════════════════════════════════════════════════════════
  const admin = session.data;
  const props = { admin, onLogout: handleAdminLogout, onNavigate: handleAdminNavigate, dark, onToggleTheme: toggleTheme };

  // Full-screen overlays
  if (adminScreen === 'vehicleAnalytics' && analyticsVehicleId) {
    return (
      <VehicleAnalyticsPage
        vehicleId={analyticsVehicleId}
        onBack={() => { setAdminScreen(analyticsReturnScreen); setAnalyticsVehicleId(null); setAnalyticsInitialTab(null); }}
        users={[]} toast={toast} fromExpiry={true} initialTab={analyticsInitialTab}
        onNavigate={handleAdminNavigate}
      />
    );
  }
  if (adminScreen === 'userDetail' && selectedUserId) {
    return (
      <UserDetail
        userId={selectedUserId}
        onBack={() => { setAdminScreen('users'); setSelectedUserId(null); }}
      />
    );
  }

  if (adminScreen === 'monthlyFuellogs') {
    return (
      <MonthlyFuelLogs
        {...props}
        initialMonth={monthlyFuelParams}
      />
    );
  }

  if (adminScreen === 'expenseBreakdown' && breakdownParams) {
    const now2 = new Date();
    return (
      <ExpenseBreakdown
        year={breakdownParams.year ?? now2.getFullYear()}
        month={breakdownParams.month ?? now2.getMonth()}
        onBack={() => { setAdminScreen('dashboard'); setBreakdownParams(null); }}
      />
    );
  }

  // Normal admin tab layout
  return (
    <>
      <div style={{ display: adminScreen === 'dashboard' ? 'block' : 'none' }}><Dashboard      {...props} /></div>
      <div style={{ display: adminScreen === 'users'     ? 'block' : 'none' }}><UsersPage       {...props} /></div>
      <div style={{ display: adminScreen === 'vehicles'  ? 'block' : 'none' }}><VehiclesPage    {...props} /></div>
      <div style={{ display: adminScreen === 'fuellogs'  ? 'block' : 'none' }}><FuelLogs        {...props} /></div>
      <div style={{ display: adminScreen === 'reports'   ? 'block' : 'none' }}><Reports         {...props} /></div>
      <div style={{ display: adminScreen === 'profile'   ? 'block' : 'none' }}><AdminProfile    {...props} /></div>
      <div style={{ display: adminScreen === 'challans'  ? 'block' : 'none' }}><Challans        {...props} /></div>
      <div style={{ display: adminScreen === 'services'  ? 'block' : 'none' }}><Services        {...props} /></div>
      <div style={{ display: adminScreen === 'finance'   ? 'block' : 'none' }}><FinanceTracker  {...props} /></div>
      <div style={{ display: adminScreen === 'insurance' ? 'block' : 'none' }}><InsuranceManager {...props} /></div>
      <div style={{ display: adminScreen === 'team'      ? 'block' : 'none' }}><TeamPage        admin={admin} toast={toast} onBack={() => setAdminScreen('dashboard')} /></div>

      <nav className="bottom-nav">
        {ADMIN_NAV.map(({ id, label, icon: Icon }) => (
          <button key={id}
            className={`bottom-nav-item ${adminScreen === id ? 'active' : ''}`}
            onClick={() => setAdminScreen(id)}
          >
            <Icon /> {label}
            <div className="nav-dot" />
          </button>
        ))}
      </nav>
    </>
  );

  })();

  return (
    <>
      {content}
      {showCloseConfirm && (
        <CloseConfirmModal onConfirm={handleConfirmClose} onCancel={handleCancelClose} />
      )}
    </>
  );
}

// ─── Close-confirm modal (Android back-button) ────────────────────────────────
function CloseConfirmModal({ onConfirm, onCancel }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 340,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '22px 22px 18px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Close FleetPro?
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Do you want to close the app? Your session will stay saved.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: 11, borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            No
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: 11, borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Yes, close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Root() {
  return <ToastProvider><App /></ToastProvider>;
}
