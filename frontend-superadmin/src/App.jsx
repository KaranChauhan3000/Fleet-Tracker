import { useState } from 'react';
import { ToastProvider } from './Toast.jsx';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import { Companies, Admins, UsersView, VehiclesView, FuelLogsView } from './Management.jsx';
import { OtpPanel, Reports } from './OtpAndReports.jsx';
import { getAdmin, clearAuth } from './api.js';
import { LayoutDashboard, Building2, Users, Car, Fuel, BarChart2, Bell, LogOut, Shield, ChevronRight } from 'lucide-react';

const NAV_GROUPS = [
  { title: 'Overview', items: [
    { id:'dashboard', label:'Dashboard',  icon: LayoutDashboard },
    { id:'otps',      label:'OTP Requests',icon: Bell, badge: true },
  ]},
  { title: 'Management', items: [
    { id:'companies', label:'Companies',  icon: Building2 },
    { id:'admins',    label:'Admins',     icon: Shield },
    { id:'users',     label:'Users',      icon: Users },
    { id:'vehicles',  label:'Vehicles',   icon: Car },
    { id:'fuellogs',  label:'Fuel Logs',  icon: Fuel },
  ]},
  { title: 'Analytics', items: [
    { id:'reports',   label:'Reports',    icon: BarChart2 },
  ]},
];

function SuperAdminApp() {
  const [admin, setAdmin] = useState(() => getAdmin());
  const [page, setPage] = useState('dashboard');
  const [otpCount, setOtpCount] = useState(0);

  if (!admin) return <Login onLogin={a => { setAdmin(a); setPage('dashboard'); }} />;

  const renderPage = () => {
    switch(page) {
      case 'dashboard':  return <Dashboard admin={admin} onNavigate={setPage} />;
      case 'otps':       return <OtpPanel />;
      case 'companies':  return <Companies onNavigate={setPage} />;
      case 'admins':     return <Admins />;
      case 'users':      return <UsersView />;
      case 'vehicles':   return <VehiclesView />;
      case 'fuellogs':   return <FuelLogsView />;
      case 'reports':    return <Reports admin={admin} />;
      default:           return <Dashboard admin={admin} onNavigate={setPage} />;
    }
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Fuel size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:900, letterSpacing:'-0.02em' }}>Fleet Tracker</p>
            <p style={{ fontSize:10, color:'var(--text-3)', fontWeight:600 }}>Super Admin</p>
          </div>
        </div>

        <nav style={{ flex:1, paddingBottom:12 }}>
          {NAV_GROUPS.map(group => (
            <div key={group.title}>
              <p className="nav-section">{group.title}</p>
              {group.items.map(item => (
                <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
                  <item.icon />
                  {item.label}
                  {item.badge && otpCount > 0 && <span className="nav-badge">{otpCount}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ padding:'12px 10px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'8px', borderRadius:8 }}>
            <div style={{ width:32, height:32, background:'linear-gradient(135deg,#1D4ED8,#2563EB)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:13, fontWeight:800, color:'#fff' }}>SA</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Super Admin</p>
              <p style={{ fontSize:10, color:'var(--text-3)' }}>{admin.username}</p>
            </div>
            <button className="btn-icon" style={{ width:28, height:28 }} onClick={() => { clearAuth(); setAdmin(null); }} title="Logout">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-2)' }}>
              {NAV_GROUPS.flatMap(g=>g.items).find(i=>i.id===page)?.label || 'Dashboard'}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span className="dot-live" />
            <span style={{ fontSize:11, color:'var(--text-3)' }}>Live</span>
          </div>
        </div>

        {/* Page content */}
        {renderPage()}
      </div>
    </div>
  );
}

export default function Root() {
  return <ToastProvider><SuperAdminApp /></ToastProvider>;
}
