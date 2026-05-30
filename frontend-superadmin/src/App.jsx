import { useState } from 'react';
import { ToastProvider } from './Toast.jsx';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import Analytics from './Analytics.jsx';
import { Companies, Admins } from './CompanyAdmin.jsx';
import { UsersView, VehiclesView } from './UserVehicle.jsx';
import { FuelLogsView, Reports } from './FuelReports.jsx';
import Memberships from './Memberships.jsx';
import ActivityLog from './ActivityLog.jsx';
import { getAdmin, clearAuth } from './api.js';
import {
  LayoutGrid, TrendingUp, Building2, Shield, Users, Truck,
  Fuel, BarChart3, CreditCard, Activity, LogOut, ChevronRight,
} from 'lucide-react';

const NAV = [
  { group: 'Overview', items: [
    { id: 'dashboard',   label: 'Dashboard',   icon: LayoutGrid },
    { id: 'analytics',   label: 'Analytics',   icon: TrendingUp },
    { id: 'activity',    label: 'Activity Log', icon: Activity },
  ]},
  { group: 'Management', items: [
    { id: 'companies',   label: 'Companies',   icon: Building2 },
    { id: 'admins',      label: 'Admins',      icon: Shield },
    { id: 'users',       label: 'Drivers',     icon: Users },
    { id: 'vehicles',    label: 'Vehicles',    icon: Truck },
    { id: 'fuellogs',    label: 'Fuel Logs',   icon: Fuel },
    { id: 'memberships', label: 'Memberships', icon: CreditCard },
  ]},
  { group: 'Reports', items: [
    { id: 'reports',     label: 'Reports',     icon: BarChart3 },
  ]},
];

function Shell() {
  const [admin, setAdmin] = useState(() => getAdmin());
  const [page,  setPage]  = useState('dashboard');

  if (!admin) return <Login onLogin={a => { setAdmin(a); setPage('dashboard'); }} />;

  const allItems = NAV.flatMap(g => g.items);
  const current  = allItems.find(i => i.id === page) || allItems[0];

  const renderPage = () => {
    switch (page) {
      case 'dashboard':   return <Dashboard onNavigate={setPage} />;
      case 'analytics':   return <Analytics />;
      case 'activity':    return <ActivityLog />;
      case 'companies':   return <Companies onNavigate={setPage} />;
      case 'admins':      return <Admins />;
      case 'users':       return <UsersView />;
      case 'vehicles':    return <VehiclesView />;
      case 'fuellogs':    return <FuelLogsView />;
      case 'memberships': return <Memberships />;
      case 'reports':     return <Reports />;
      default:            return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <Fuel size={14} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:700, letterSpacing:'-0.01em' }}>FleetPro</p>
            <p style={{ fontSize:10, color:'var(--text-4)', marginTop:1 }}>Super Admin</p>
          </div>
        </div>

        <nav style={{ flex:1, paddingBottom:8 }}>
          {NAV.map(group => (
            <div key={group.group}>
              <p className="nav-section">{group.group}</p>
              {group.items.map(item => (
                <button key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
                  <item.icon strokeWidth={1.6} />
                  <span>{item.label}</span>
                  {page === item.id && <span className="nav-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding:'10px 8px', borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 8px', borderRadius:6, background:'var(--bg-2)' }}>
            <div style={{ width:27, height:27, background:'var(--blue)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#fff' }}>SA</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Super Admin</p>
              <p style={{ fontSize:10, color:'var(--text-4)' }}>{admin.username}</p>
            </div>
            <button className="icon-btn" onClick={() => { clearAuth(); setAdmin(null); }} title="Sign out" style={{ borderColor:'transparent' }}>
              <LogOut size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'center', gap:7, flex:1 }}>
            <span style={{ fontSize:12, color:'var(--text-4)' }}>FleetPro</span>
            <ChevronRight size={11} strokeWidth={1.5} color="var(--text-4)" />
            <span style={{ fontSize:12, fontWeight:500, color:'var(--text-2)' }}>{current.label}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span className="dot dot-blue" />
            <span style={{ fontSize:11, color:'var(--text-3)' }}>Live</span>
          </div>
        </div>
        {renderPage()}
      </div>
    </div>
  );
}

export default function Root() {
  return <ToastProvider><Shell /></ToastProvider>;
}
