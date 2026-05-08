// FuelLogs.jsx — Admin Fuel Logs
// Changes from original:
//   • Edit button added to each LogCard
//   • EditLogSheet component to edit existing fuel entries
//   • Backend: PUT /admin/fuel-logs/:id already exists

import { useState, useEffect, useRef } from 'react';
import { api, fmt, fmtRs, fmtDT, fmtDate, clearAuth } from './api.js';
import { pcGet } from './persistCache.js';
import { useToast } from './Toast.jsx';
import { Fuel, Plus, Filter, ChevronLeft, ChevronRight, Gauge, TrendingUp, MapPin, Trash2, Edit2 } from 'lucide-react';
import { Pagination } from './Users.jsx';

const LIMIT = 10;

function getThisMonthFrom() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
}

export default function FuelLogs({ admin, onLogout, onNavigate }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ vehicleId:'', userId:'', from: '', to: '' });
  const [showFilter, setShowFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [editLog, setEditLog] = useState(null); // log being edited
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { load(page); }, [page, filters]);

  async function loadMeta() {
    try {
      const vPath = '/admin/vehicles?page=1&limit=200';
      const uPath = '/admin/users?page=1&limit=200';
      // Show cached meta instantly
      const vc = pcGet(vPath); const uc = pcGet(uPath);
      if (vc) setVehicles(vc.data?.data || []);
      if (uc) setUsers(uc.data?.data || []);
      // Always refresh in background
      const [vr, ur] = await Promise.all([api.get(vPath), api.get(uPath)]);
      setVehicles(vr.data||[]); setUsers(ur.data||[]);
    } catch {}
  }

  function buildUrl(p) {
    const q = new URLSearchParams({ page: p, limit: LIMIT });
    if (filters.vehicleId) q.set('vehicleId', filters.vehicleId);
    if (filters.userId) q.set('userId', filters.userId);
    if (filters.from) q.set('from', filters.from);
    if (filters.to) q.set('to', filters.to);
    return `/admin/fuel-logs?${q}`;
  }

  async function load(p=page) {
    const path = buildUrl(p);
    const cached = pcGet(path);
    if (cached) {
      setLogs(cached.data?.data||[]); setTotal(cached.data?.total||0);
      setLoading(false);
      api.get(path).then(res => { setLogs(res.data||[]); setTotal(res.total||0); }).catch(() => {});
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(path);
      setLogs(res.data||[]); setTotal(res.total||0);
    } catch(err) {
      if(err.message.includes('401')){clearAuth();onLogout();}
      toast(err.message,'error');
    } finally { setLoading(false); }
  }

  function applyFilter(f) { setFilters(f); setPage(1); setShowFilter(false); }
  function clearFilters() { applyFilter({ vehicleId:'',userId:'',from:'',to:'' }); }
  const hasFilters = Object.values(filters).some(Boolean);
  const totalPages = Math.max(1, Math.ceil(total/LIMIT));

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header" style={{ justifyContent:'space-between' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{ width:32,height:32,background:'var(--warning-dim)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Fuel size={16} color="var(--warning)" />
          </div>
          <div>
            <p style={{ fontSize:15,fontWeight:800 }}>Fuel Logs</p>
            <p style={{ fontSize:11,color:'var(--text-muted)' }}>{total} entries · newest first</p>
          </div>
        </div>
        <div style={{ display:'flex',gap:7 }}>
          <button className="btn-icon" onClick={() => setShowFilter(true)} style={{ color: hasFilters?'var(--accent-light)':'var(--text-secondary)', borderColor: hasFilters?'var(--accent)':undefined }}>
            <Filter size={14} />
          </button>
          <button className="btn btn-primary btn-sm" style={{ width:'auto',padding:'8px 12px' }} onClick={()=>setSheet(true)}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="page-content">
        {hasFilters && (
          <div style={{ background:'var(--accent-dim)',border:'1px solid rgba(249,115,22,0.2)',borderRadius:8,padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <span style={{ fontSize:12,color:'var(--accent)',fontWeight:600 }}>Filters active</span>
            <button onClick={clearFilters} style={{ background:'none',fontSize:12,color:'var(--text-secondary)' }}>Clear all</button>
          </div>
        )}

        {loading
          ? <div style={{ display:'flex',justifyContent:'center',padding:32 }}><span className="spinner" style={{width:28,height:28}} /></div>
          : logs.length === 0
          ? <div className="empty-state"><Fuel size={36} style={{color:'var(--text-muted)',opacity:0.4}} /><p className="empty-title">No entries found</p></div>
          : (
            <>
              <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
                {logs.map(log => (
                  <LogCard
                    key={log.id}
                    log={log}
                    onRefresh={() => load(page)}
                    onEdit={() => setEditLog(log)}
                    toast={toast}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
              <Pagination page={page} total={total} limit={LIMIT} totalPages={totalPages} onPage={setPage} />
            </>
          )
        }
      </div>

      {showFilter && <FilterSheet filters={filters} vehicles={vehicles} users={users} onApply={applyFilter} onClose={()=>setShowFilter(false)} />}
      {sheet && <AddLogSheet vehicles={vehicles} users={users} onClose={()=>setSheet(false)} onSaved={()=>{setSheet(false);load(1);setPage(1);}} toast={toast} />}
      {editLog && <EditLogSheet log={editLog} vehicles={vehicles} users={users} onClose={()=>setEditLog(null)} onSaved={()=>{setEditLog(null);load(page);}} toast={toast} />}
    </div>
  );
}

function LogCard({ log, onRefresh, onEdit, toast, onNavigate }) {
  const [confirming, setConfirming] = useState(false);

  async function del() {
    try { await api.delete(`/admin/fuel-logs/${log.id}`); toast('Entry deleted','success'); onRefresh(); }
    catch(err) { toast(err.message,'error'); }
    finally { setConfirming(false); }
  }

  function goToAnalytics(e) {
    e.stopPropagation();
    if (onNavigate && log.vehicleId) onNavigate('vehicleAnalytics', log.vehicleId);
  }

  return (
    <div className="card" style={{ display:'flex',flexDirection:'column',gap:10 }}>
      {confirming && (
        <ConfirmSheet
          message={`This will permanently remove the fuel entry for ${log.vehiclePlate || 'this vehicle'}.`}
          onConfirm={del}
          onCancel={() => setConfirming(false)}
        />
      )}

      {/* Header row */}
      <div onClick={goToAnalytics} style={{ display:'flex',alignItems:'center',gap:10,cursor: onNavigate && log.vehicleId ? 'pointer' : 'default' }}>
        <div style={{ width:38,height:38,background:'var(--warning-dim)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <Fuel size={17} color="var(--warning)" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <p style={{ fontWeight:800,fontSize:14,fontFamily:'var(--font-mono)' }}>{log.vehiclePlate||'—'}</p>
            <p style={{ fontWeight:900,fontSize:16,color:'var(--success)' }}>{fmtRs(log.totalCost)}</p>
          </div>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:2 }}>
            <p style={{ fontSize:11,color:'var(--text-muted)' }}>{log.userName} · {fmtDT(log.filledAt)}</p>
            <p style={{ fontSize:11,color:'var(--text-secondary)' }}>{fmt(log.litres,2)}L @ ₹{fmt(log.costPerLitre,2)}</p>
          </div>
        </div>
      </div>

      {/* Metrics chips */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7 }}>
        <MetaChip icon={Gauge} label="Odometer" value={log.odometer?.toLocaleString()+'km'} />
        {log.kmDriven!=null && log.kmDriven>0 && <MetaChip icon={TrendingUp} label="KM Driven" value={fmt(log.kmDriven,0)+' km'} color="var(--warning)" />}
        {log.efficiency!=null && log.efficiency>0 && <MetaChip icon={TrendingUp} label="km/L" value={fmt(log.efficiency,1)} color={log.efficiency>=8?'var(--success)':log.efficiency>=5?'var(--warning)':'var(--danger)'} />}
      </div>

      {log.fuelStation && (
        <p style={{ fontSize:11,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:4 }}>
          <MapPin size={10} /> {log.fuelStation}
        </p>
      )}
      {log.notes && <p style={{ fontSize:11,color:'var(--text-muted)',fontStyle:'italic',borderTop:'1px solid var(--border-subtle)',paddingTop:8 }}>"{log.notes}"</p>}

      {/* Action buttons: Edit + Delete */}
      <div style={{ display:'flex',gap:7,alignItems:'center',borderTop:'1px solid var(--border-subtle)',paddingTop:8 }}>
        <button onClick={onEdit} className="btn btn-ghost btn-sm" style={{ flex:1 }}>
          <Edit2 size={12} /> Edit
        </button>
        <button onClick={() => setConfirming(true)} className="btn btn-danger-ghost btn-sm" style={{ flex:1 }}>
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}

function MetaChip({ icon:Icon, label, value, color='var(--text-primary)' }) {
  return (
    <div style={{ background:'var(--bg-elevated)',borderRadius:8,padding:'7px 8px' }}>
      <p style={{ fontSize:9,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em' }}>{label}</p>
      <p style={{ fontSize:12,fontWeight:700,color,marginTop:2,fontFamily:'var(--font-mono)' }}>{value||'—'}</p>
    </div>
  );
}

function ConfirmSheet({ message, onConfirm, onCancel }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ padding:'8px 16px 20px',display:'flex',flexDirection:'column',gap:16 }}>
          <div style={{ display:'flex',flexDirection:'column',gap:8,alignItems:'center',textAlign:'center',paddingTop:8 }}>
            <div style={{ width:48,height:48,background:'var(--danger-dim)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Trash2 size={22} color="var(--danger)" />
            </div>
            <p style={{ fontSize:16,fontWeight:700 }}>Delete Entry?</p>
            <p style={{ fontSize:14,color:'var(--text-muted)',lineHeight:1.5 }}>{message}</p>
          </div>
          <div style={{ display:'flex',gap:9 }}>
            <button className="btn btn-ghost" onClick={onCancel} style={{flex:1}}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm} style={{flex:1}}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSheet({ filters, vehicles, users, onApply, onClose }) {
  const [f, setF] = useState(filters);
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">Filter Fuel Logs</p>
        <div style={{ padding:'0 16px',display:'flex',flexDirection:'column',gap:13 }}>
          <div className="input-group"><label className="input-label">Vehicle</label>
            <select className="input-field" value={f.vehicleId} onChange={e=>setF(x=>({...x,vehicleId:e.target.value}))}>
              <option value="">All vehicles</option>
              {vehicles.map(v=><option key={v.id} value={v.id}>{v.plateNumber} – {v.make} {v.model}</option>)}
            </select>
          </div>
          <div className="input-group"><label className="input-label">User</label>
            <select className="input-field" value={f.userId} onChange={e=>setF(x=>({...x,userId:e.target.value}))}>
              <option value="">All users</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>)}
            </select>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div className="input-group"><label className="input-label">From Date</label><input className="input-field" type="date" value={f.from} onChange={e=>setF(x=>({...x,from:e.target.value}))} /></div>
            <div className="input-group"><label className="input-label">To Date</label><input className="input-field" type="date" value={f.to} onChange={e=>setF(x=>({...x,to:e.target.value}))} /></div>
          </div>
          <div style={{ display:'flex',gap:9,marginTop:4 }}>
            <button className="btn btn-ghost" onClick={onClose} style={{flex:1}}>Cancel</button>
            <button className="btn btn-primary" onClick={()=>onApply(f)} style={{flex:2}}>Apply Filters</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared form logic for Add / Edit ────────────────────────────
function LogForm({ initialForm, vehicles, users, onSubmit, onClose, saving, title, submitLabel }) {
  const [form, setForm] = useState(initialForm);

  function handleChange(k, val) {
    setForm(f => {
      const next = { ...f, [k]: val };
      const l = parseFloat(k==='litres'?val:next.litres);
      const r = parseFloat(k==='costPerLitre'?val:next.costPerLitre);
      const t = parseFloat(k==='totalCost'?val:next.totalCost);
      const hasL=!isNaN(l)&&l>0, hasR=!isNaN(r)&&r>0, hasT=!isNaN(t)&&t>0;
      if (k==='litres') {
        if(hasL&&hasR) next.totalCost=(l*r).toFixed(2);
        else if(hasL&&hasT) next.costPerLitre=(t/l).toFixed(4);
      } else if (k==='costPerLitre') {
        if(hasR&&hasL) next.totalCost=(l*r).toFixed(2);
        else if(hasR&&hasT) next.litres=(t/r).toFixed(2);
      } else if (k==='totalCost') {
        if(hasT&&hasL) next.costPerLitre=(t/l).toFixed(4);
        else if(hasT&&hasR) next.litres=(t/r).toFixed(2);
      }
      return next;
    });
  }

  const displayTotal = parseFloat(form.totalCost)||(form.litres&&form.costPerLitre?parseFloat(form.litres)*parseFloat(form.costPerLitre):0);

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">{title}</p>
        <form onSubmit={e=>{e.preventDefault();onSubmit(form);}} style={{ padding:'0 16px',display:'flex',flexDirection:'column',gap:12 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div className="input-group"><label className="input-label">Vehicle *</label>
              <select className="input-field" value={form.vehicleId} onChange={e=>handleChange('vehicleId',e.target.value)}>
                <option value="">Select</option>
                {vehicles.map(v=><option key={v.id} value={v.id}>{v.plateNumber}</option>)}
              </select>
            </div>
            <div className="input-group"><label className="input-label">User *</label>
              <select className="input-field" value={form.userId} onChange={e=>handleChange('userId',e.target.value)}>
                <option value="">Select</option>
                {users.filter(u=>u.isActive||(u.id===form.userId)).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group"><label className="input-label">Fill Date & Time</label>
            <input className="input-field" type="datetime-local" value={form.filledAt} onChange={e=>handleChange('filledAt',e.target.value)} />
          </div>
          <p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:-4 }}>Fill any 2 — third auto-calculates</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div className="input-group"><label className="input-label">Litres</label>
              <input className="input-field" type="number" step="0.01" min="0.1" value={form.litres} onChange={e=>handleChange('litres',e.target.value)} placeholder="35.5" />
            </div>
            <div className="input-group"><label className="input-label">₹/Litre</label>
              <input className="input-field" type="number" step="0.01" min="0.01" value={form.costPerLitre} onChange={e=>handleChange('costPerLitre',e.target.value)} placeholder="94.50" />
            </div>
          </div>
          <div className="input-group"><label className="input-label">Total Cost (₹)</label>
            <input className="input-field" type="number" step="0.01" min="0.01" value={form.totalCost} onChange={e=>handleChange('totalCost',e.target.value)} placeholder="e.g. 3354.75" />
          </div>
          {displayTotal>0&&<div style={{background:'var(--success-dim)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,padding:'10px 12px',display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:13,color:'var(--text-secondary)'}}>Total Cost</span>
            <span style={{fontSize:18,fontWeight:800,color:'var(--success)'}}>₹{fmt(displayTotal)}</span>
          </div>}
          <div className="input-group"><label className="input-label">Odometer (km) *</label>
            <input className="input-field" type="number" step="1" min="0" value={form.odometer} onChange={e=>handleChange('odometer',e.target.value)} placeholder="Current km reading" />
          </div>
          <div className="input-group"><label className="input-label">Fuel Station</label>
            <input className="input-field" value={form.fuelStation} onChange={e=>handleChange('fuelStation',e.target.value)} placeholder="Optional" />
          </div>
          <div className="input-group"><label className="input-label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e=>handleChange('notes',e.target.value)} placeholder="Optional notes" style={{resize:'none'}} />
          </div>
          <div style={{ display:'flex',gap:9,marginTop:4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{flex:1}}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{flex:2}}>
              {saving?<><span className="spinner"/>Saving...</>:<><Fuel size={14}/>{submitLabel}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toLocalDT(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d - offset).toISOString().slice(0, 16);
}

function getNow() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 16);
}

function AddLogSheet({ vehicles, users, onClose, onSaved, toast }) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(form) {
    if (!form.vehicleId||!form.userId) { toast('Select vehicle and user','error'); return; }
    if (!form.litres||!form.costPerLitre||!form.odometer) { toast('Litres, cost and odometer required','error'); return; }
    setSaving(true);
    try {
      await api.post('/admin/fuel-logs', {
        vehicleId: form.vehicleId, userId: form.userId,
        litres: parseFloat(form.litres), costPerLitre: parseFloat(form.costPerLitre),
        odometer: parseFloat(form.odometer), fuelStation: form.fuelStation,
        notes: form.notes, filledAt: new Date(form.filledAt).toISOString(),
      });
      toast('Fuel entry added','success'); onSaved();
    } catch(err) { toast(err.message,'error'); }
    finally { setSaving(false); }
  }

  return (
    <LogForm
      title="Add Fuel Entry"
      submitLabel="Add Entry"
      initialForm={{ vehicleId:'', userId:'', litres:'', costPerLitre:'', totalCost:'', odometer:'', fuelStation:'', notes:'', filledAt: getNow() }}
      vehicles={vehicles}
      users={users}
      onSubmit={handleSubmit}
      onClose={onClose}
      saving={saving}
    />
  );
}

// ─── Edit Log Sheet ───────────────────────────────────────────────
function EditLogSheet({ log, vehicles, users, onClose, onSaved, toast }) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(form) {
    if (!form.vehicleId||!form.userId) { toast('Select vehicle and user','error'); return; }
    if (!form.litres||!form.costPerLitre||!form.odometer) { toast('Litres, cost and odometer required','error'); return; }
    setSaving(true);
    try {
      await api.put(`/admin/fuel-logs/${log.id}`, {
        litres: parseFloat(form.litres),
        costPerLitre: parseFloat(form.costPerLitre),
        odometer: parseFloat(form.odometer),
        fuelStation: form.fuelStation,
        notes: form.notes,
        filledAt: new Date(form.filledAt).toISOString(),
      });
      toast('Fuel entry updated','success'); onSaved();
    } catch(err) { toast(err.message,'error'); }
    finally { setSaving(false); }
  }

  return (
    <LogForm
      title="Edit Fuel Entry"
      submitLabel="Save Changes"
      initialForm={{
        vehicleId: log.vehicleId || '',
        userId: log.userId || '',
        litres: String(log.litres || ''),
        costPerLitre: String(log.costPerLitre || ''),
        totalCost: String(log.totalCost || ''),
        odometer: String(log.odometer || ''),
        fuelStation: log.fuelStation || '',
        notes: log.notes || '',
        filledAt: toLocalDT(log.filledAt),
      }}
      vehicles={vehicles}
      users={users}
      onSubmit={handleSubmit}
      onClose={onClose}
      saving={saving}
    />
  );
}
