import { useState, useEffect, useRef } from 'react';
import DocManager from './DocManager.jsx';
import { api, fmtRs, fmt, fmtDate, fmtDT } from './api.js';
import { pcGet } from './persistCache.js';
import {
  ArrowLeft, Car, Fuel, TrendingUp, TrendingDown, Gauge, MapPin,
  BarChart2, Activity, DollarSign, CheckCircle, Wrench, XCircle,
  AlertTriangle, Plus, User, Calendar, ChevronLeft, ChevronRight,
  List, Edit2, Trash2, Navigation, IndianRupee, Clock, ShieldAlert, FileText, CreditCard
} from 'lucide-react';

// ─── Expiry Animation Styles ─────────────────────────────────────────────────
const analyticsExpiryStyles = `
@keyframes va_slideDown {
  0%{transform:translateY(-8px);opacity:0} 100%{transform:translateY(0);opacity:1}
}
@keyframes va_urgentBlink {
  0%,100%{opacity:1} 50%{opacity:0.45}
}
@keyframes va_pulseRed {
  0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.35)} 50%{box-shadow:0 0 0 5px rgba(239,68,68,0.07)}
}
@keyframes va_pulseYellow {
  0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.28)} 50%{box-shadow:0 0 0 4px rgba(245,158,11,0.06)}
}
`;

// ─── 10-Square Full-Width Bar ─────────────────────────────────────────────────
function VATenBar({ daysLeft, isExpired }) {
  const getColor = (i) => {
    const days = isExpired ? 0 : Math.max(0, Math.min(daysLeft, 10));
    const activeStart = 10 - days;
    if (i < activeStart) return '#ef4444';
    const posFromRight = 9 - i;
    if (posFromRight <= 1) return '#22c55e';
    if (posFromRight <= 4) return '#f59e0b';
    return '#ef4444';
  };
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 9, borderRadius: 3,
          background: getColor(i),
          transition: 'background 0.3s',
          animation: (isExpired || daysLeft <= 2) && getColor(i) === '#ef4444' ? 'va_urgentBlink 1.2s ease-in-out infinite' : 'none',
        }} />
      ))}
    </div>
  );
}

function ExpiryBanner({ vehicle }) {
  if (!vehicle?.pollutionExpiry) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(vehicle.pollutionExpiry); exp.setHours(0,0,0,0);
  const daysLeft = Math.round((exp - today) / 86400000);
  if (daysLeft > 10) return null;
  const isExpired  = daysLeft < 0;
  const isCritical = !isExpired && daysLeft <= 3;
  const isWarning  = !isExpired && !isCritical && daysLeft <= 7;
  const daysAbs    = Math.abs(daysLeft);
  const color = isExpired || isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';
  const bg    = isExpired ? 'rgba(239,68,68,0.07)' : isCritical ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)';
  const anim  = isExpired
    ? 'va_pulseRed 1.5s ease-in-out infinite, va_slideDown 0.35s ease'
    : isCritical
    ? 'va_pulseRed 2s ease-in-out infinite, va_slideDown 0.35s ease'
    : 'va_pulseYellow 2.5s ease-in-out infinite, va_slideDown 0.35s ease';

  return (
    <div style={{ margin: '0 16px', borderRadius: 12, border: `1px solid ${color}38`, background: bg, animation: anim, overflow: 'hidden' }}>
      <style>{analyticsExpiryStyles}</style>
      <div style={{ padding: '10px 14px 9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 12, color, flex: 1 }}>PUC Certificate</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {isExpired ? `Expired ${daysAbs}d ago` : daysLeft === 0 ? 'Expires TODAY' : `Expires in ${daysLeft}d`}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5,
            background: `${color}20`, color, border: `1px solid ${color}40`,
            letterSpacing: '0.05em',
            animation: isExpired ? 'va_urgentBlink 1.2s ease-in-out infinite' : 'none',
          }}>
            {isExpired ? 'EXPIRED' : isCritical ? 'CRITICAL' : 'EXPIRING'}
          </span>
        </div>
        <VATenBar daysLeft={daysLeft} isExpired={isExpired} />
      </div>
    </div>
  );
}

function InsuranceBanner({ vehicle, onNavigate }) {
  if (!vehicle?.insuranceExpiry) {
    // Show a soft nudge to add a policy
    return (
      <div style={{ margin: '0 16px', borderRadius: 12, border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.05)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldAlert size={16} color="#a78bfa" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>No Insurance Policy Linked</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Add a policy via Quick Actions → Insurance to track expiry & premium</p>
        </div>
      </div>
    );
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(vehicle.insuranceExpiry); exp.setHours(0,0,0,0);
  const daysLeft = Math.round((exp - today) / 86400000);
  if (daysLeft > 10) return null;
  const isExpired  = daysLeft < 0;
  const isCritical = !isExpired && daysLeft <= 3;
  const isWarning  = !isExpired && !isCritical && daysLeft <= 7;
  const daysAbs    = Math.abs(daysLeft);
  const color = isExpired || isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';
  const bg    = isExpired ? 'rgba(239,68,68,0.07)' : isCritical ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)';
  const anim  = isExpired
    ? 'va_pulseRed 1.5s ease-in-out infinite, va_slideDown 0.35s ease'
    : isCritical
    ? 'va_pulseRed 2s ease-in-out infinite, va_slideDown 0.35s ease'
    : 'va_pulseYellow 2.5s ease-in-out infinite, va_slideDown 0.35s ease';

  return (
    <div style={{ margin: '0 16px', borderRadius: 12, border: `1px solid ${color}38`, background: bg, animation: anim, overflow: 'hidden' }}>
      <style>{analyticsExpiryStyles}</style>
      <div style={{ padding: '10px 14px 9px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 12, color, flex: 1 }}>Insurance</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {isExpired ? `Expired ${daysAbs}d ago` : daysLeft === 0 ? 'Expires TODAY' : `Expires in ${daysLeft}d`}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 5,
            background: `${color}20`, color, border: `1px solid ${color}40`,
            letterSpacing: '0.05em',
            animation: isExpired ? 'va_urgentBlink 1.2s ease-in-out infinite' : 'none',
          }}>
            {isExpired ? 'EXPIRED' : isCritical ? 'CRITICAL' : 'EXPIRING'}
          </span>
        </div>
        <VATenBar daysLeft={daysLeft} isExpired={isExpired} />
      </div>
    </div>
  );
}

// Continue with rest of the component...
// [Rest of your component code from line 141 to 532]

export default function VehicleAnalyticsPage({ vehicleId, onBack, users, toast, fromExpiry, onNavigate }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [logSheet, setLogSheet] = useState(false);
  const [tab, setTab]         = useState('analytics');
  const [allUsers, setAllUsers] = useState(users || []);

  useEffect(() => {
    load();
    if (!users || users.length === 0) {
      api.get('/admin/users?page=1&limit=200').then(r => setAllUsers(r.data || [])).catch(() => {});
    }
  }, [vehicleId]);

  async function load() {
    const path = `/admin/vehicles/${vehicleId}/analytics`;
    
    // CRITICAL FIX #1: Clear any previous error state before loading
    setError(null);
    
    const cached = pcGet(path);
    if (cached && cached.data) {
      // CRITICAL FIX #2: Validate cached data structure before using it
      if (isValidVehicleData(cached.data)) {
        setData(cached.data);
        setLoading(false);
        // Use api.fresh to bypass in-memory cache so background revalidation
        // always hits the server, not a stale in-memory entry
        if (cached.stale) {
          api.fresh(path).then(res => { 
            if (res && isValidVehicleData(res)) {
              setData(res); 
            }
          }).catch(() => {});
        }
        return;
      } else {
        // Cached data is corrupt/invalid - clear it and fetch fresh
        console.warn('Invalid cached vehicle data, fetching fresh');
      }
    }
    
    setLoading(true);
    try {
      const res = await api.get(path);
      
      // CRITICAL FIX #3: Validate response before setting data
      if (!res || !isValidVehicleData(res)) {
        throw new Error('Invalid vehicle data received from server');
      }
      
      setData(res);
      setError(null);
    } catch (err) {
      console.error('Error loading vehicle analytics:', err);
      setError(err.message || 'Failed to load vehicle data');
      toast(err.message || 'Failed to load vehicle data', 'error');
    } finally {
      setLoading(false);
    }
  }

  // CRITICAL FIX #4: Add data validation function
  function isValidVehicleData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.vehicle || typeof data.vehicle !== 'object') return false;
    if (!data.summary || typeof data.summary !== 'object') return false;
    if (!Array.isArray(data.monthly)) return false;
    if (!Array.isArray(data.perFill)) return false;
    return true;
  }

  // CRITICAL FIX #5: Show error state instead of blank screen
  if (error) {
    return (
      <div className="page-wrapper page-enter" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <button onClick={onBack} className="btn-icon"><ArrowLeft size={16} /></button>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Vehicle Analytics</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 16 }}>
          <AlertTriangle size={48} color="var(--danger)" />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
            Failed to Load Vehicle Data
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300 }}>
            {error}
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setError(null);
              load();
            }}
            style={{ marginTop: 8 }}
          >
            Try Again
          </button>
          <button 
            className="btn btn-ghost" 
            onClick={onBack}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="page-wrapper page-enter" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="page-header">
        <button onClick={onBack} className="btn-icon"><ArrowLeft size={16} /></button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Vehicle Analytics</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    </div>
  );

  // CRITICAL FIX #6: Better data validation with fallbacks
  if (!data) {
    return (
      <div className="page-wrapper page-enter" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <button onClick={onBack} className="btn-icon"><ArrowLeft size={16} /></button>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Vehicle Analytics</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-muted)' }}>No data available</p>
        </div>
      </div>
    );
  }

  // CRITICAL FIX #7: Safe destructuring with fallbacks
  const { vehicle: v, summary: s, monthly = [], perFill = [], finance: fin } = data || {};
  
  // Additional safety check - if core data is missing, show error
  if (!v || !s) {
    return (
      <div className="page-wrapper page-enter" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <button onClick={onBack} className="btn-icon"><ArrowLeft size={16} /></button>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Vehicle Analytics</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 16 }}>
          <AlertTriangle size={48} color="var(--warning)" />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
            Incomplete Vehicle Data
          </p>
          <button className="btn btn-primary" onClick={() => load()}>Reload</button>
          <button className="btn btn-ghost" onClick={onBack}>Go Back</button>
        </div>
      </div>
    );
  }

  // CRITICAL FIX #8: Safe array operations with fallbacks
  const monthLabels = (monthly || []).map(m => m?.label || '');
  const effData  = (monthly || []).map(m => m?.avgEfficiency || 0);
  const costData = (monthly || []).map(m => m?.totalCost || 0);
  const kmData   = (monthly || []).map(m => m?.totalKm || 0);
  const cpkData  = (monthly || []).map(m => m?.avgCostPerKm || 0);
  const effTarget = s?.avgEfficiency ? parseFloat((s.avgEfficiency * 1.1).toFixed(1)) : 15;

  const statusIcon = v.status === 'active'
    ? <CheckCircle size={11} color="var(--success)" />
    : v.status === 'maintenance'
    ? <Wrench size={11} color="var(--warning)" />
    : <XCircle size={11} color="var(--danger)" />;

  const trendColor = s.efficiencyTrend == null ? 'var(--text-muted)'
    : s.efficiencyTrend >= 0 ? 'var(--success)' : 'var(--danger)';
  const TrendIcon = s.efficiencyTrend == null ? null
    : s.efficiencyTrend >= 0 ? TrendingUp : TrendingDown;

  const assignedUser = v.assignedUserId
    ? allUsers.find(u => u._id === v.assignedUserId?.toString() || u._id === v.assignedUserId)
    : null;

  // Rest of your render code continues here...
  return (
    <div className="page-wrapper page-enter">
      {/* Your existing JSX continues from here */}
    </div>
  );
}
