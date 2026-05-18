import { useState, useEffect, useRef } from 'react';
import { ToastProvider, useToast } from './Toast.jsx';
import InstallPrompt from './InstallPrompt.jsx';
import Onboarding from './Onboarding.jsx';
import AppClosed from './AppClosed.jsx';
import MembershipGate   from './MembershipGate.jsx';
import MembershipBanner from './MembershipBanner.jsx';
import WelcomeTrialScreen from './WelcomeTrialScreen.jsx';

// ── Auth & API ─────────────────────────────────────────────────────────────────
import {
  BASE,
  getStoredAdmin, isLoggedOut, softLogout, resumeSession, clearAuth,
  softLogoutUser, resumeUserSession, isUserLoggedOut,
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
import MonthlyObligations from './MonthlyObligations.jsx';
import MonthlyKmDetail from './MonthlyKmDetail.jsx';
import MonthlyLitresDetail from './MonthlyLitresDetail.jsx';
import ExpenseBreakdown from './ExpenseBreakdown.jsx';
import InsuranceManager from './InsuranceManager.jsx';
import Notifications   from './Notifications.jsx';
import AdminSettings   from './AdminSettings.jsx';
import UserTimeline    from './UserTimeline.jsx';
import UserOwnTimeline from './UserOwnTimeline.jsx';
import { SwipeableTabView } from './SwipeableTabView.jsx';

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

// Stable constants — defined once at module level so hooks never get new array refs
const ADMIN_TAB_IDS = ADMIN_NAV.map(n => n.id);

// ─── User nav tabs ─────────────────────────────────────────────────────────────
const USER_NAV = [
  { id: 'home',    label: 'Home',     icon: HomeIcon },
  { id: 'log',     label: 'Log Fuel', icon: Fuel },
  { id: 'docs',    label: 'Docs',     icon: FolderOpen },
  { id: 'profile', label: 'Profile',  icon: User },
];

// Tabs that participate in swipeable view (log & timeline are full-screen overlays)
const USER_SWIPE_IDS = ['home', 'docs', 'profile'];

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

  // ── Admin navigation state ────────────────────────────────────────────────────
  const [screenStack, setScreenStack] = useState([{ screen: 'dashboard', meta: {} }]);
  // Mirror of screenStack as a ref so popScreen can read it synchronously
  const screenStackRef = useRef([{ screen: 'dashboard', meta: {} }]);
  const adminScreen = screenStack[screenStack.length - 1]?.screen ?? 'dashboard';
  const adminMeta   = screenStack[screenStack.length - 1]?.meta   ?? {};

  const analyticsVehicleId  = adminMeta.vehicleId  ?? null;
  const analyticsInitialTab = adminMeta.initialTab ?? null;
  const selectedUserId      = adminMeta.userId     ?? null;
  const breakdownParams     = adminMeta.breakdown  ?? null;
  const monthlyFuelParams   = adminMeta.monthlyFuel ?? null;
  const monthlyKmParams     = adminMeta.monthlyKm     ?? null;
  const monthlyLitresParams = adminMeta.monthlyLitres ?? null;

  const [showWelcome, setShowWelcome] = useState(false);

  // ── User navigation state ─────────────────────────────────────────────────────
  const [userScreen, setUserScreen] = useState('home');

  // ── Single source of truth for back-button ────────────────────────────────────
  // navRef holds everything the back handler needs to know, updated synchronously
  // every time navigation changes. No useEffect sync, no stale closure issues.
  const navRef = useRef({
    role: null,           // 'admin' | 'user' | null
    adminTab: 'dashboard', // current base tab (bottom-nav level) for admin
    adminOverlay: null,    // non-null when an overlay is open (detail screens etc.)
    userScreen: 'home',    // current screen for user
    userOverlayReturn: 'home', // which tab to return to after closing log/timeline
    appClosed: false,
  });

  // ── AppClosed state ───────────────────────────────────────────────────────────
  const [showAppClosed, setShowAppClosed] = useState(false);

  // ── Navigation helpers ────────────────────────────────────────────────────────

  function pushScreen(screen, meta = {}) {
    navRef.current.adminOverlay = screen;
    const next = [...screenStackRef.current, { screen, meta }];
    screenStackRef.current = next;
    setScreenStack(next);
  }

  function popScreen() {
    // Read the current stack synchronously via the ref so we can update navRef
    // BEFORE React processes the state update — avoids stale-ref on fast double-press.
    const currentStack = screenStackRef.current;
    const next = currentStack.length > 1 ? currentStack.slice(0, -1) : currentStack;
    const topScreen = next[next.length - 1]?.screen ?? 'dashboard';
    if (ADMIN_TAB_IDS.includes(topScreen)) {
      navRef.current.adminTab = topScreen;
      navRef.current.adminOverlay = null;
    } else {
      navRef.current.adminOverlay = topScreen;
    }
    screenStackRef.current = next;
    setScreenStack(next);
  }

  function setAdminScreen(screen) {
    navRef.current.adminTab = ADMIN_TAB_IDS.includes(screen) ? screen : navRef.current.adminTab;
    navRef.current.adminOverlay = ADMIN_TAB_IDS.includes(screen) ? null : screen;
    const next = [{ screen, meta: {} }];
    screenStackRef.current = next;
    setScreenStack(next);
  }

  function navigateUser(screen) {
    if (screen === 'log' || screen === 'timeline') {
      navRef.current.userOverlayReturn = USER_SWIPE_IDS.includes(navRef.current.userScreen)
        ? navRef.current.userScreen : 'home';
    }
    navRef.current.userScreen = screen;
    setUserScreen(screen);
  }

  // ── Android back button ───────────────────────────────────────────────────────
  // Pure if/else — reads navRef which is always up to date (set synchronously above).
  useEffect(() => {
    window.history.pushState({ fp: true }, '');

    function onPop() {
      const nav = navRef.current;
      if (nav.appClosed) return;

      // Always restore the sentinel so the next back press fires popstate again
      window.history.pushState({ fp: true }, '');

      // ── USER ────────────────────────────────────────────────────────────────
      if (nav.role === 'user') {
        if (nav.userScreen === 'log' || nav.userScreen === 'timeline') {
          // Close overlay → go back to the tab that opened it
          navigateUser(nav.userOverlayReturn);

        } else if (nav.userScreen === 'profile') {
          navigateUser('docs');

        } else if (nav.userScreen === 'docs') {
          navigateUser('home');

        } else {
          // On home — close app
          nav.appClosed = true;
          setShowAppClosed(true);
        }
        return;
      }

      // ── ADMIN ───────────────────────────────────────────────────────────────
      // Back sequence mirrors the bottom-nav order in reverse:
      // dashboard → vehicles → fuellogs → challans → users → services → profile
      // So pressing back goes: profile→services→users→challans→fuellogs→vehicles→dashboard→AppClosed
      if (nav.role === 'admin') {
        if (nav.adminOverlay !== null) {
          // There's a detail/overlay screen open — pop it back to the base tab
          popScreen();

        } else if (nav.adminTab === 'profile') {
          setAdminScreen('services');

        } else if (nav.adminTab === 'services') {
          setAdminScreen('challans');

        } else if (nav.adminTab === 'challans') {
          setAdminScreen('fuellogs');

        } else if (nav.adminTab === 'fuellogs') {
          setAdminScreen('vehicles');

        } else if (nav.adminTab === 'vehicles') {
          setAdminScreen('dashboard');

        } else if (nav.adminTab === 'users') {
          setAdminScreen('challans');

        } else {
          // On dashboard — close app
          nav.appClosed = true;
          setShowAppClosed(true);
        }
      }
    }

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // When AppClosed becomes visible, do all the session cleanup.
  // Running this in its own effect guarantees the screen has already rendered
  // before we clear the session — no race with the login-screen fallback.
  useEffect(() => {
    if (!showAppClosed) return;
    if (session?.role === 'admin') softLogout(); // keep token, flag as closed
    if (session?.role === 'user') softLogoutUser(); // keep token, flag as closed
    setSession(null);                            // stop polling / renders
  }, [showAppClosed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Return from the AppClosed screen → fresh open behaviour.
  function handleReturnFromClosed() {
    navRef.current.appClosed = false;
    setShowAppClosed(false);
    window.history.pushState({ fp: true }, '');
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
      if (!isUserLoggedOut()) {
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
      }

      setBooting(false);
    }
    boot();
  }, []);

  // ── Login callback from Login.jsx ─────────────────────────────────────────────
  function handleLogin(user, isNewRegistration = false) {
    if (user.role === 'admin') {
      resumeSession();
      navRef.current.role = 'admin';
      navRef.current.adminTab = 'dashboard';
      navRef.current.adminOverlay = null;
      navRef.current.appClosed = false;
      setScreenStack([{ screen: 'dashboard', meta: {} }]);
      setSession({ role: 'admin', data: user });
      if (isNewRegistration) setShowWelcome(true);
      import('./api.js').then(({ api }) => {
        prefetchMonths(path => api.get(path), 5);
      });
    } else {
      resumeUserSession();
      navRef.current.role = 'user';
      navRef.current.userScreen = 'home';
      navRef.current.userOverlayReturn = 'home';
      navRef.current.appClosed = false;
      setUserScreen('home');
      setSession({ role: 'user', data: user });
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────────
  function handleAdminLogout() {
    softLogout();
    navRef.current.role = null;
    setSession(null);
  }

  function handleUserLogout() {
    softLogoutUser();
    navRef.current.role = null;
    setSession(null);
  }

  // ── Admin navigation ──────────────────────────────────────────────────────────
  function handleAdminNavigate(dest, id, initialTab) {
    if (dest === 'vehicleAnalytics' && id) {
      pushScreen('vehicleAnalytics', { vehicleId: id, initialTab: initialTab || null });
    } else if (dest === 'userDetail' && id) {
      pushScreen('userDetail', { userId: id });
    } else if (dest === 'expenseBreakdown') {
      pushScreen('expenseBreakdown', { breakdown: initialTab || {} });
    } else if (dest === 'monthlyFuellogs') {
      pushScreen('monthlyFuellogs', { monthlyFuel: initialTab || {} });
    } else if (dest === 'monthlyKmDetail') {
      pushScreen('monthlyKmDetail', { monthlyKm: initialTab || {} });
    } else if (dest === 'monthlyLitresDetail') {
      pushScreen('monthlyLitresDetail', { monthlyLitres: initialTab || {} });
    } else {
      pushScreen(dest, {});
    }
  }

  // ── Render content (wrapped at the end with the close-confirm modal) ─────────
  const content = (() => {

  // ── Soft-close landing screen ─────────────────────────────────────────────────
  if (showAppClosed) {
    return <AppClosed dark={dark} onReturn={handleReturnFromClosed} />;
  }

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
    return (
      <Login
        onLogin={(user) => { setLocked(false); setSavedProfile(null); handleLogin(user); }}
        dark={dark}
        onToggleTheme={toggleTheme}
        initialStep="home"
      />
    );
  }

  // ── Not logged in → unified Login page ───────────────────────────────────────
  if (!session) return <Login onLogin={handleLogin} dark={dark} onToggleTheme={toggleTheme} initialStep={loginInitialStep} />;

  // ── Welcome trial screen — shown once right after new registration ──────────
  if (showWelcome && session?.role === 'admin') {
    return (
      <WelcomeTrialScreen
        admin={session.data}
        onDone={() => setShowWelcome(false)}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  USER ROLE
  // ═══════════════════════════════════════════════════════════════════════════════
  if (session.role === 'user') {
    const user = session.data;

    // Full-screen overlays — no bottom nav
    if (userScreen === 'timeline') {
      return <UserOwnTimeline onBack={() => navigateUser('home')} />;
    }
    if (userScreen === 'log') {
      return <UserLogFuel user={user} onBack={() => navigateUser('home')} />;
    }

    // Clamp to a swipeable id (in case userScreen is something unexpected)
    const swipeTab = USER_SWIPE_IDS.includes(userScreen) ? userScreen : 'home';

    return (
      <div style={{ position: 'relative', height: '100vh' }}>
        <SwipeableTabView
          tabIds={USER_SWIPE_IDS}
          currentTab={swipeTab}
          onTabChange={navigateUser}
        >
          {USER_SWIPE_IDS.map(id => (
            <div
              key={id}
              style={{
                width: '100vw',
                height: '100vh',
                flexShrink: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {id === 'home'    && <UserHome      user={user} onLogout={handleUserLogout} onNavigate={navigateUser} />}
              {id === 'docs'    && <UserDocuments user={user} />}
              {id === 'profile' && <UserProfile   user={user} onLogout={handleUserLogout} onNavigate={navigateUser} />}
            </div>
          ))}
        </SwipeableTabView>

        <nav className="bottom-nav">
          {USER_NAV.map(({ id, label, icon: Icon }) => (
            <button key={id}
              className={`bottom-nav-item ${swipeTab === id || userScreen === id ? 'active' : ''}`}
              onClick={() => navigateUser(id)}
            >
              <Icon /> {label}
              <div className="nav-dot" />
            </button>
          ))}
        </nav>
      </div>
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
        onBack={() => popScreen()}
        users={[]} toast={toast} fromExpiry={true} initialTab={analyticsInitialTab}
        onNavigate={handleAdminNavigate}
      />
    );
  }
  if (adminScreen === 'userDetail' && selectedUserId) {
    return (
      <UserDetail
        userId={selectedUserId}
        onBack={() => popScreen()}
        onNavigate={(screen, id) => {
          if (screen === 'userTimeline') {
            pushScreen('userTimeline', { userId: id });
          }
        }}
      />
    );
  }

  if (adminScreen === 'userTimeline' && selectedUserId) {
    return (
      <UserTimeline
        userId={selectedUserId}
        onBack={() => popScreen()}
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

  if (adminScreen === 'monthlyKmDetail') {
    return (
      <MonthlyKmDetail
        onBack={() => popScreen()}
        initialYear={monthlyKmParams?.year}
        initialMonth={monthlyKmParams?.month}
      />
    );
  }

  if (adminScreen === 'monthlyLitresDetail') {
    return (
      <MonthlyLitresDetail
        onBack={() => popScreen()}
        initialYear={monthlyLitresParams?.year}
        initialMonth={monthlyLitresParams?.month}
      />
    );
  }

  if (adminScreen === 'expenseBreakdown' && breakdownParams) {
    const now2 = new Date();
    return (
      <ExpenseBreakdown
        year={breakdownParams.year ?? now2.getFullYear()}
        month={breakdownParams.month ?? now2.getMonth()}
        onBack={() => popScreen()}
      />
    );
  }

  // ── Secondary screens (not in bottom nav — full screen, no swipe) ───────────
  if (adminScreen === 'notifications') return <Notifications {...props} onBack={() => popScreen()} />;
  if (adminScreen === 'settings')      return <AdminSettings admin={admin} onBack={() => popScreen()} onGetMembership={() => pushScreen('membership')} />;
  if (adminScreen === 'finance')       return <FinanceTracker {...props} onMonthlyObligations={() => pushScreen('monthlyObligations')} />;
  if (adminScreen === 'monthlyObligations') return <MonthlyObligations onBack={() => popScreen()} />;
  if (adminScreen === 'insurance')     return <InsuranceManager {...props} />;
  if (adminScreen === 'team')          return <TeamPage admin={admin} toast={toast} onBack={() => popScreen()} />;
  if (adminScreen === 'reports')       return <Reports {...props} />;
  if (adminScreen === 'membership')    return <MembershipGate admin={admin} onActivated={() => setAdminScreen('dashboard')} onBack={() => popScreen()} />;

  // ── Main tab layout with smooth page-swipe ───────────────────────────────────
  return (
    <div style={{ position: 'relative', height: '100vh' }}>

      <SwipeableTabView
        tabIds={ADMIN_TAB_IDS}
        currentTab={adminScreen}
        onTabChange={setAdminScreen}
      >
        {ADMIN_TAB_IDS.map(id => (
          <div
            key={id}
            style={{
              width:                   '100vw',
              height:                  '100vh',
              flexShrink:              0,
              overflowY:               'auto',
              overflowX:               'hidden',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Membership banner inside dashboard tab */}
            {id === 'dashboard' && (
              <MembershipBanner onGetMembership={() => setAdminScreen('membership')} />
            )}
            {id === 'dashboard' && <Dashboard      {...props} />}
            {id === 'vehicles'  && <VehiclesPage    {...props} />}
            {id === 'fuellogs'  && <FuelLogs        {...props} />}
            {id === 'challans'  && <Challans        {...props} />}
            {id === 'users'     && <UsersPage       {...props} />}
            {id === 'services'  && <Services        {...props} />}
            {id === 'profile'   && <AdminProfile    {...props} onGetMembership={() => setAdminScreen('membership')} />}
          </div>
        ))}
      </SwipeableTabView>

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
    </div>
  );

  })();

  return (
    <>
      {content}
    </>
  );
}

export default function Root() {
  return <ToastProvider><App /></ToastProvider>;
}
