import { useState, useEffect } from 'react';
import { api, fmtRs, fmt, fmtDate, clearAuth } from './api.js';
import { pcGet } from './persistCache.js';
import { useToast } from './Toast.jsx';
import {
  Car, Plus, Search, Wrench, CheckCircle, XCircle,
  Edit2, Trash2, ChevronDown, ChevronUp, Fuel, TrendingUp,
  Gauge, MapPin, BarChart2, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { Pagination } from './Users.jsx';

const LIMIT = 10;
const FUEL_TYPES = ['Diesel', 'Petrol', 'CNG', 'Electric', 'Other'];
const STATUSES = ['active', 'inactive', 'maintenance'];

export default function VehiclesPage({ admin, onLogout, onNavigate }) {
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(1, search); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { load(page, search); }, [page]);

  async function load(p = page, q = search) {
    const path = `/admin/vehicles?page=${p}&limit=${LIMIT}&search=${encodeURIComponent(q)}`;
    const cached = pcGet(path);
    if (cached && cached.data) {
      setVehicles(cached.data?.data || []); setTotal(cached.data?.total || 0);
      setLoading(false);
      if (cached.stale) {
        api.fresh(path).then(res => { setVehicles(res.data || []); setTotal(res.total || 0); }).catch(() => {});
      }
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(path);
      setVehicles(res.data || []); setTotal(res.total || 0);
    } catch (err) {
      if (err.message.includes('401')) { clearAuth(); onLogout(); }
      toast(err.message, 'error');
    } finally { setLoading(false); }
  }

  async function loadUsers() {
    try { const r = await api.get('/admin/users?page=1&limit=200'); setUsers(r.data || []); } catch {}
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--purple-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={16} color="#A78BFA" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>Vehicles</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{total} total</p>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => setSheet('create')}>
          <Plus size={14} /> Add Vehicle
        </button>
      </div>

      <div className="page-content">
        <div className="search-wrap">
          <Search size={15} />
          <input className="search-bar" placeholder="Search plate, make or model..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading
          ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
          : vehicles.length === 0
            ? (
              <div className="empty-state">
                <Car size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="empty-title">No vehicles found</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {vehicles.map(v => (
                    <VehicleRow
                      key={v.id}
                      vehicle={v}
                      users={users}
                      onEdit={() => setSheet(v)}
                      onRefresh={() => load(page, search)}
                      onAnalytics={() => onNavigate && onNavigate('vehicleAnalytics', v.id)}
                      toast={toast}
                    />
                  ))}
                </div>
                <Pagination page={page} total={total} limit={LIMIT} totalPages={totalPages} onPage={setPage} />
              </>
            )}
      </div>

      {sheet && (
        <VehicleSheet
          vehicle={sheet === 'create' ? null : sheet}
          users={users}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); load(1, ''); setSearch(''); setPage(1); }}
          toast={toast}
        />
      )}
    </div>
  );
}

function VehicleRow({ vehicle: v, users, onEdit, onRefresh, onAnalytics, toast }) {
  const [expanded, setExpanded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const assignedUser = users.find(u => u.id === (v.assignedUserId?.toString() || v.assignedUserId));

  async function toggleExpand(e) {
    e.stopPropagation();
    if (!expanded && logs.length === 0) {
      setLoadingLogs(true);
      try {
        const res = await api.get(`/admin/vehicles/${v.id}/fuel-logs?limit=5`);
        setLogs(res.logs || []);
        setStats(res.stats || null);
      } catch (err) { toast(err.message, 'error'); }
      finally { setLoadingLogs(false); }
    }
    setExpanded(e2 => !e2);
  }

  async function del(e) {
    e.stopPropagation();
    if (!confirm(`Delete vehicle "${v.plateNumber}"?`)) return;
    try { await api.delete(`/admin/vehicles/${v.id}`); toast('Vehicle deleted', 'success'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
  }

  const statusIcon = v.status === 'active'
    ? <CheckCircle size={12} color="var(--success)" />
    : v.status === 'maintenance'
    ? <Wrench size={12} color="var(--warning)" />
    : <XCircle size={12} color="var(--danger)" />;

  return (
    <div className="list-row" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '12px 14px', cursor: 'pointer' }}
        onClick={onAnalytics}
      >
        <div style={{ width: 40, height: 40, background: 'var(--purple-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Car size={18} color="#A78BFA" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-mono)' }}>{v.plateNumber}</p>
            <span className={`badge ${v.status === 'active' ? 'badge-success' : v.status === 'maintenance' ? 'badge-warning' : 'badge-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {statusIcon} {v.status}
            </span>
            <span className="badge badge-blue">{v.fuelType}</span>
            {(() => {
              const ps = getPollutionStatus(v.pollutionExpiry);
              if (!ps) return null;
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                  background: ps.type === 'expired' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  color: ps.type === 'expired' ? '#ef4444' : '#f59e0b',
                  border: `1px solid ${ps.type === 'expired' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                  <AlertTriangle size={10} /> PUC {ps.label}
                </span>
              );
            })()}
            {(() => {
              const is = getInsuranceStatus(v.insuranceExpiry);
              if (!is) return null;
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                  background: is.type === 'expired' ? 'rgba(239,68,68,0.15)' : 'rgba(14,165,233,0.15)',
                  color: is.type === 'expired' ? '#ef4444' : '#0ea5e9',
                  border: `1px solid ${is.type === 'expired' ? 'rgba(239,68,68,0.3)' : 'rgba(14,165,233,0.3)'}` }}>
                  <AlertTriangle size={10} /> INS {is.label}
                </span>
              );
            })()}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{v.make} {v.model} · {v.year}</p>
          {assignedUser && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>👤 {assignedUser.name} ({assignedUser.employeeId})</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 10 }}>
            {[
              { label: 'Fills', value: v.totalFills ?? 0 },
              { label: 'Spend', value: fmtRs(v.totalFuelCost ?? 0) },
              { label: 'KM Driven', value: v.totalKmDriven ? fmt(v.totalKmDriven, 0) + ' km' : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 7, padding: '6px 8px' }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                <p style={{ fontSize: 12, fontWeight: 700, marginTop: 1, color: 'var(--text-primary)' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, padding: '0 14px 12px' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={onAnalytics}
          className="btn btn-ghost btn-sm"
          style={{ flex: 1, padding: '6px', color: 'var(--accent-light)', borderColor: 'rgba(14,165,233,0.3)' }}
        >
          <BarChart2 size={12} /> Analytics
        </button>
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="btn btn-ghost btn-sm" style={{ padding: '6px 12px' }}><Edit2 size={12} /></button>
        <button onClick={del} className="btn btn-danger-ghost btn-sm" style={{ padding: '6px 10px' }}><Trash2 size={12} /></button>
        <button onClick={toggleExpand} className="btn btn-ghost btn-sm" style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '12px 14px' }}>
          {loadingLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><span className="spinner" /></div>
          ) : (
            <>
              {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { icon: <Fuel size={12} />, label: 'Total Fills', val: stats.totalFills },
                    { icon: <TrendingUp size={12} />, label: 'Total Spent', val: fmtRs(stats.totalCost) },
                    { icon: <Gauge size={12} />, label: 'KM Driven', val: stats.totalKm ? fmt(stats.totalKm, 0) + ' km' : '—' },
                    { icon: <MapPin size={12} />, label: 'Last Odometer', val: stats.lastOdometer ? fmt(stats.lastOdometer, 0) + ' km' : '—' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A78BFA', marginBottom: 3 }}>{s.icon}</div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.val}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {logs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>No fuel logs yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Recent Fuel Logs</p>
                  {logs.map(log => (
                    <div key={log.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {log.userName && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-light)' }}>👤 {log.userName}</span>}
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(log.filledAt)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{log.litres}L · ₹{log.costPerLitre}/L</span>
                          {log.kmDriven != null && log.kmDriven > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(log.kmDriven, 0)} km driven</span>}
                          {log.efficiency != null && log.efficiency > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA' }}>{log.efficiency.toFixed(1)} km/L</span>}
                          {log.fuelStation && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.fuelStation}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtRs(log.totalCost)}</p>
                        {log.odometer && <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmt(log.odometer, 0)} km</p>}
                      </div>
                    </div>
                  ))}
                  <button onClick={onAnalytics} className="btn btn-ghost btn-sm" style={{ marginTop: 4, color: 'var(--accent-light)' }}>
                    <BarChart2 size={12} /> View Full Analytics
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function getPollutionStatus(expiry) {
  if (!expiry) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0);
  const diff = Math.round((exp - today) / 86400000);
  if (diff > 10) return null;
  if (diff >= 0) return { type: 'warning', daysLeft: diff, label: diff === 0 ? 'Expires today' : `Expires in ${diff}d` };
  if (diff >= -5) return { type: 'expired', daysLeft: diff, label: `Expired ${Math.abs(diff)}d ago` };
  return null;
}

function getInsuranceStatus(expiry) {
  if (!expiry) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry); exp.setHours(0, 0, 0, 0);
  const diff = Math.round((exp - today) / 86400000);
  if (diff > 10) return null;
  if (diff >= 0) return { type: 'warning', daysLeft: diff, label: diff === 0 ? 'Expires today' : `Expires in ${diff}d` };
  if (diff >= -5) return { type: 'expired', daysLeft: diff, label: `Expired ${Math.abs(diff)}d ago` };
  return null;
}

function VehicleSheet({ vehicle, users, onClose, onSaved, toast }) {
  const isEdit = !!vehicle;
  const toDateInput = (d) => d ? new Date(d).toISOString().split('T')[0] : '';
  const [form, setForm] = useState({
    plateNumber: vehicle?.plateNumber || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    fuelType: vehicle?.fuelType || 'Diesel',
    status: vehicle?.status || 'active',
    assignedUserId: vehicle?.assignedUserId?.toString() || '',
    pollutionExpiry: toDateInput(vehicle?.pollutionExpiry),
  });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!form.plateNumber || !form.make || !form.model) { toast('Plate, make and model required', 'error'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        year: parseInt(form.year),
        assignedUserId: form.assignedUserId || null,
        pollutionExpiry: form.pollutionExpiry || null,
      };
      if (isEdit) await api.put(`/admin/vehicles/${vehicle.id}`, body);
      else await api.post('/admin/vehicles', body);
      toast(isEdit ? 'Vehicle updated' : 'Vehicle created', 'success');
      onSaved();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</p>
        <form onSubmit={save} style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="input-group">
            <label className="input-label">Plate Number *</label>
            <input className="input-field" value={form.plateNumber} onChange={set('plateNumber')} placeholder="MH 01 AB 1234" style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group"><label className="input-label">Make *</label><input className="input-field" value={form.make} onChange={set('make')} placeholder="Tata, Ashok..." /></div>
            <div className="input-group"><label className="input-label">Model *</label><input className="input-field" value={form.model} onChange={set('model')} placeholder="407, LPT..." /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="input-group"><label className="input-label">Year</label><input className="input-field" type="number" value={form.year} onChange={set('year')} min={1990} max={2050} /></div>
            <div className="input-group">
              <label className="input-label">Fuel Type</label>
              <select className="input-field" value={form.fuelType} onChange={set('fuelType')}>
                {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Status</label>
              <select className="input-field" value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Pollution Certificate Expiry (PUC)</label>
            <input className="input-field" type="date" value={form.pollutionExpiry} onChange={set('pollutionExpiry')} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Warning shown 10 days before expiry. Alert shown up to 5 days after.</p>
          </div>
          <div style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 8, padding: '9px 11px', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <ShieldAlert size={13} color="#a78bfa" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11, color: '#a78bfa', lineHeight: 1.5 }}>
              <strong>Insurance expiry</strong> is managed via Insurance Policies. Go to <strong>Quick Actions → Insurance</strong> to add or renew a policy. The expiry date will auto-sync here.
            </p>
          </div>
          <div className="input-group">
            <label className="input-label">Assign to User (optional)</label>
            <select className="input-field" value={form.assignedUserId} onChange={set('assignedUserId')}>
              <option value="">— Unassigned —</option>
              {users.filter(u => u.isActive).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="spinner" /> Saving...</> : isEdit ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
