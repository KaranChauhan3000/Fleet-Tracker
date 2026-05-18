import { useState, useEffect, useCallback } from 'react';
import { api, fmtRs, fmtDate, clearAuth } from './api.js';
import { useToast } from './Toast.jsx';
import {
  Building2, Plus, Search, ChevronLeft, ChevronRight, Edit2, Trash2,
  Users, Car, Fuel, ToggleLeft, ToggleRight, Link2, Copy, Check,
  X, ArrowLeft, Gauge, TrendingUp
} from 'lucide-react';

const PG = 10;

// ── Pagination ──────────────────────────────────────────────────────
function Pager({ page, total, limit, onPage }) {
  const tp = Math.max(1, Math.ceil(total/limit));
  if (tp <= 1) return null;
  return (
    <div className="pagination">
      <span className="page-info">Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</span>
      <div className="page-btns">
        <button className="page-btn" disabled={page<=1} onClick={()=>onPage(p=>p-1)}><ChevronLeft size={13}/></button>
        {Array.from({length:Math.min(7,tp)},(_,i)=>{
          let p=i+1; if(tp>7){if(page<=4)p=i+1; else if(page>=tp-3)p=tp-6+i; else p=page-3+i;}
          return <button key={p} className={`page-btn ${p===page?'active':''}`} onClick={()=>onPage(p)}>{p}</button>;
        })}
        <button className="page-btn" disabled={page>=tp} onClick={()=>onPage(p=>p+1)}><ChevronRight size={13}/></button>
      </div>
    </div>
  );
}

// ── CopyButton ──────────────────────────────────────────────────────
function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <button className="btn btn-ghost btn-xs" onClick={copy} title={`Copy ${label}`} style={{ gap: 4, fontSize: 11 }}>
      {copied ? <><Check size={11} style={{ color: 'var(--green-l)' }} /> Copied</> : <><Copy size={11} /> Copy Link</>}
    </button>
  );
}

// ── Login Link Generator ────────────────────────────────────────────
function loginLink(type, slug) {
  // Use env vars in production (Vercel); fix port mismatch in local dev
  if (type === 'admin') {
    const base = import.meta.env.VITE_ADMIN_URL
      || window.location.origin.replace(/:\d+$/, ':3002') + '/admin';
    return `${base}?company=${slug}`;
  }
  const base = import.meta.env.VITE_USER_URL
    || window.location.origin.replace(/:\d+$/, ':3001');
  return `${base}/?company=${slug}`;
}

// ── Fuel Log Drill-Down Modal ───────────────────────────────────────
function FuelLogModal({ type, entityId, entityName, onClose, toast }) {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(page); }, [page]);

  async function load(p) {
    setLoading(true);
    try {
      const endpoint = type === 'user'
        ? `/superadmin/users/${entityId}/fuel-logs?page=${p}&limit=20`
        : `/superadmin/vehicles/${entityId}/fuel-logs?page=${p}&limit=20`;
      const r = await api.get(endpoint);
      setLogs(r.data || []);
      setTotal(r.total || 0);
      setMeta(type === 'user' ? r.user : r.vehicle);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  const fmtEff = (e) => e != null ? `${e.toFixed(2)} L/100km` : '—';
  const fmtKm = (k) => k != null ? `${k.toLocaleString('en-IN')} km` : '—';

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth: 800, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-ghost btn-xs" onClick={onClose}><ArrowLeft size={13}/></button>
          <div>
            <p className="modal-title" style={{ marginBottom: 2 }}>
              {type === 'user' ? '👤' : '🚗'} {meta?.name || meta?.plateNumber || entityName}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {type === 'user' ? `${meta?.companyName} · ${meta?.employeeId}` : `${meta?.companyName} · ${meta?.make} ${meta?.model} ${meta?.year}`}
            </p>
          </div>
          <button className="btn btn-ghost btn-xs" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={13}/></button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>{total} fuel log{total !== 1 ? 's' : ''} — newest first</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : logs.length === 0 ? (
          <div className="empty"><Fuel size={32} style={{ opacity: 0.2 }} /><p>No fuel logs yet</p></div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    {type === 'user' ? <th>Vehicle</th> : <th>User</th>}
                    <th>Litres</th>
                    <th>₹/L</th>
                    <th>Total</th>
                    <th>Odometer</th>
                    <th>KM Driven</th>
                    <th>Efficiency</th>
                    <th>Station</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                        {new Date(l.filledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>
                        {type === 'user' ? l.vehiclePlate : (l.userName || '—')}
                        {type === 'user' && l.vehicleMake && <span style={{ fontWeight: 400, color: 'var(--text-3)', fontFamily: 'inherit' }}> {l.vehicleMake}</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>{l.litres}L</td>
                      <td style={{ fontSize: 12 }}>₹{l.costPerLitre?.toFixed(2)}</td>
                      <td style={{ fontWeight: 800, color: 'var(--green-l)' }}>₹{l.totalCost?.toLocaleString('en-IN')}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{l.odometer?.toLocaleString('en-IN')}</td>
                      <td style={{ fontSize: 12, color: l.kmDriven ? 'var(--text-1)' : 'var(--text-3)' }}>{fmtKm(l.kmDriven)}</td>
                      <td style={{ fontSize: 12, color: l.efficiency ? 'var(--amber-l)' : 'var(--text-3)' }}>{fmtEff(l.efficiency)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{l.fuelStation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={total} limit={20} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Companies ───────────────────────────────────────────────────────
export function Companies({ onNavigate }) {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true); const [modal, setModal] = useState(null);

  useEffect(()=>{const t=setTimeout(()=>{setPage(1);load(1,search)},300);return()=>clearTimeout(t);},[search]);
  useEffect(()=>{load(page,search);},[page]);

  async function load(p=page,q=search){
    setLoading(true);
    try{const r=await api.get(`/superadmin/companies?page=${p}&limit=${PG}&search=${encodeURIComponent(q)}`);setRows(r.data||[]);setTotal(r.total||0);}
    catch(err){if(err.message.includes('401')){clearAuth();window.location.reload();}toast(err.message,'error');}
    finally{setLoading(false);}
  }

  async function toggleActive(c){
    try{await api.put(`/superadmin/companies/${c.id}`,{isActive:!c.isActive});toast(`Company ${c.isActive?'deactivated':'activated'}`,'success');load(page,search);}
    catch(err){toast(err.message,'error');}
  }

  async function del(c){
    if(!confirm(`Delete company "${c.name}" and ALL its data? This is irreversible.`))return;
    try{await api.delete(`/superadmin/companies/${c.id}`);toast('Company deleted','success');load(1,'');setSearch('');setPage(1);}
    catch(err){toast(err.message,'error');}
  }

  return (
    <div className="content">
      <div className="section-header">
        <div><h2 className="section-title">Companies</h2><p className="section-sub">{total} total companies</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal('create')}><Plus size={13}/>New Company</button>
      </div>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <div className="search-box" style={{flex:1}}><Search size={14}/><input placeholder="Search companies..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      </div>

      {loading?<div style={{textAlign:'center',padding:40}}><span className="spinner" style={{width:28,height:28}}/></div>
      :rows.length===0?<div className="empty"><Building2 size={36} style={{opacity:0.2}}/><p>No companies found</p></div>
      :<>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Company</th><th>Admin Login Link</th><th>User Login Link</th><th>Admins</th><th>Users</th><th>Vehicles</th><th>Total Spend</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map(c=>(
                <tr key={c.id}>
                  <td>
                    <p style={{fontWeight:700}}>{c.name}</p>
                    <p style={{fontSize:11,color:'var(--text-3)',fontFamily:'var(--mono)'}}>{c.slug}</p>
                    <p style={{fontSize:10,color:'var(--text-3)'}}>{fmtDate(c.createdAt)}</p>
                  </td>
                  <td>
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      <span style={{fontSize:10,color:'var(--text-3)',fontFamily:'var(--mono)',wordBreak:'break-all'}}>{loginLink('admin',c.slug)}</span>
                      <CopyBtn text={loginLink('admin',c.slug)} label="admin link" />
                    </div>
                  </td>
                  <td>
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      <span style={{fontSize:10,color:'var(--text-3)',fontFamily:'var(--mono)',wordBreak:'break-all'}}>{loginLink('user',c.slug)}</span>
                      <CopyBtn text={loginLink('user',c.slug)} label="user link" />
                    </div>
                  </td>
                  <td><span style={{fontWeight:600}}>{c.adminCount}</span></td>
                  <td><span style={{fontWeight:600}}>{c.userCount}</span></td>
                  <td><span style={{fontWeight:600}}>{c.vehicleCount}</span></td>
                  <td><span style={{fontWeight:700,color:'var(--green-l)'}}>{fmtRs(c.totalSpend)}</span></td>
                  <td><span className={`badge ${c.isActive?'badge-green':'badge-red'}`}>{c.isActive?'Active':'Inactive'}</span></td>
                  <td>
                    <div style={{display:'flex',gap:5}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setModal(c)}><Edit2 size={11}/></button>
                      <button className="btn btn-ghost btn-xs" style={{color:c.isActive?'var(--amber-l)':'var(--green-l)'}} onClick={()=>toggleActive(c)}>
                        {c.isActive?<ToggleRight size={13}/>:<ToggleLeft size={13}/>}
                      </button>
                      <button className="btn btn-danger btn-xs" onClick={()=>del(c)}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={total} limit={PG} onPage={setPage}/>
      </>}

      {modal&&<CompanyModal company={modal==='create'?null:modal} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load(1,'');setSearch('');setPage(1);}} toast={toast}/>}
    </div>
  );
}

function CompanyModal({ company, onClose, onSaved, toast }) {
  const isEdit=!!company;
  const [form,setForm]=useState({name:company?.name||'',slug:company?.slug||''});
  const [saving,setSaving]=useState(false);
  async function save(e){
    e.preventDefault();
    if(!form.name||(!isEdit&&!form.slug)){toast('Name and slug required','error');return;}
    setSaving(true);
    try{
      if(isEdit)await api.put(`/superadmin/companies/${company.id}`,{name:form.name});
      else await api.post('/superadmin/companies',form);
      toast(isEdit?'Company updated':'Company created','success');onSaved();
    }catch(err){toast(err.message,'error');}
    finally{setSaving(false);}
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <p className="modal-title">{isEdit?'Edit Company':'New Company'}</p>
        <form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-row"><label className="form-label">Company Name *</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Acme Transport" /></div>
          {!isEdit&&<div className="form-row">
            <label className="form-label">Slug * (used in login URLs)</label>
            <input className="form-input" value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))} placeholder="acme-transport" style={{fontFamily:'var(--mono)'}}/>
            <p style={{fontSize:11,color:'var(--text-3)',marginTop:4}}>Lowercase letters, numbers, hyphens only. Cannot be changed later.</p>
          </div>}
          {!isEdit&&form.slug&&<div style={{background:'var(--bg-2)',borderRadius:8,padding:'10px 12px',fontSize:11,color:'var(--text-3)'}}>
            <p style={{marginBottom:4}}>Login links will be:</p>
            <p style={{fontFamily:'var(--mono)',color:'var(--accent-l)'}}>Admin: /admin?company={form.slug}</p>
            <p style={{fontFamily:'var(--mono)',color:'var(--purple-l)'}}>User: /?company={form.slug}</p>
          </div>}
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{flex:1}}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{flex:2}}>{saving?<><span className="spinner"/>Saving...</>:isEdit?'Save Changes':'Create Company'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Admins ──────────────────────────────────────────────────────────
export function Admins() {
  const toast = useToast();
  const [rows,setRows]=useState([]);const [total,setTotal]=useState(0);
  const [page,setPage]=useState(1);const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);const [modal,setModal]=useState(null);
  const [companies,setCompanies]=useState([]);

  useEffect(()=>{loadCompanies();},[]);
  useEffect(()=>{const t=setTimeout(()=>{setPage(1);load(1,search)},300);return()=>clearTimeout(t);},[search]);
  useEffect(()=>{load(page,search);},[page]);

  async function loadCompanies(){try{const r=await api.get('/superadmin/companies?page=1&limit=200');setCompanies(r.data||[]);}catch{}}

  async function load(p=page,q=search){
    setLoading(true);
    try{const r=await api.get(`/superadmin/admins?page=${p}&limit=${PG}&search=${encodeURIComponent(q)}`);setRows(r.data||[]);setTotal(r.total||0);}
    catch(err){toast(err.message,'error');}finally{setLoading(false);}
  }

  async function toggleActive(a){
    try{await api.put(`/superadmin/admins/${a.id}`,{isActive:!a.isActive});toast('Updated','success');load(page,search);}
    catch(err){toast(err.message,'error');}
  }

  async function del(a){
    if(!confirm(`Delete admin "${a.name}"?`))return;
    try{await api.delete(`/superadmin/admins/${a.id}`);toast('Admin deleted','success');load(1,'');setSearch('');setPage(1);}
    catch(err){toast(err.message,'error');}
  }

  return (
    <div className="content">
      <div className="section-header">
        <div><h2 className="section-title">Admins</h2><p className="section-sub">{total} total</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal('create')}><Plus size={13}/>New Admin</button>
      </div>
      <div style={{marginBottom:16}}><div className="search-box"><Search size={14}/><input placeholder="Search name, email or phone..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>

      {loading?<div style={{textAlign:'center',padding:40}}><span className="spinner" style={{width:28,height:28}}/></div>
      :rows.length===0?<div className="empty"><Users size={36} style={{opacity:0.2}}/><p>No admins found</p></div>
      :<>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Designation</th><th>Company</th><th>Login Link</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map(a=>(
                <tr key={a.id}>
                  <td><p style={{fontWeight:700}}>{a.name}</p></td>
                  <td style={{fontSize:12,color:'var(--text-2)'}}>{a.email}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:12}}>{a.phone}</td>
                  <td style={{fontSize:12,color:'var(--text-2)'}}>{a.designation||'—'}</td>
                  <td>
                    <span style={{fontSize:12,background:'var(--accent-d)',color:'var(--accent-l)',padding:'2px 8px',borderRadius:4,fontWeight:600}}>{a.companyName}</span>
                  </td>
                  <td>
                    {a.companySlug && <CopyBtn text={loginLink('admin', a.companySlug)} label="admin login link" />}
                  </td>
                  <td><span className={`badge ${a.isActive?'badge-green':'badge-red'}`}>{a.isActive?'Active':'Inactive'}</span></td>
                  <td style={{fontSize:11,color:'var(--text-3)'}}>{a.lastLogin?new Date(a.lastLogin).toLocaleDateString('en-IN'):'Never'}</td>
                  <td>
                    <div style={{display:'flex',gap:5}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setModal(a)}><Edit2 size={11}/></button>
                      <button className="btn btn-ghost btn-xs" style={{color:a.isActive?'var(--amber-l)':'var(--green-l)'}} onClick={()=>toggleActive(a)}>
                        {a.isActive?<ToggleRight size={13}/>:<ToggleLeft size={13}/>}
                      </button>
                      <button className="btn btn-danger btn-xs" onClick={()=>del(a)}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={total} limit={PG} onPage={setPage}/>
      </>}

      {modal&&<AdminModal admin={modal==='create'?null:modal} companies={companies} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load(1,'');setSearch('');setPage(1);}} toast={toast}/>}
    </div>
  );
}

function AdminModal({ admin, companies, onClose, onSaved, toast }) {
  const isEdit=!!admin;
  const [form,setForm]=useState({name:admin?.name||'',email:admin?.email||'',phone:admin?.phone||'',designation:admin?.designation||'',companyId:admin?.companyId?.toString()||''});
  const [saving,setSaving]=useState(false);
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  async function save(e){
    e.preventDefault();
    if(!form.name||!form.email||!form.phone){toast('Name, email and phone required','error');return;}
    if(!isEdit&&!form.companyId){toast('Select a company','error');return;}
    setSaving(true);
    try{
      if(isEdit)await api.put(`/superadmin/admins/${admin.id}`,form);
      else await api.post('/superadmin/admins',form);
      toast(isEdit?'Admin updated':'Admin created','success');onSaved();
    }catch(err){toast(err.message,'error');}
    finally{setSaving(false);}
  }
  const selectedCompany = companies.find(c => c.id === form.companyId);
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <p className="modal-title">{isEdit?'Edit Admin':'Create Admin'}</p>
        <form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-row"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={set('name')} placeholder="Admin Name"/></div>
          <div className="form-grid">
            <div className="form-row"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="admin@company.com"/></div>
            <div className="form-row"><label className="form-label">Phone *</label><input className="form-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 99999 99999"/></div>
          </div>
          <div className="form-row"><label className="form-label">Designation</label><input className="form-input" value={form.designation} onChange={set('designation')} placeholder="Fleet Manager, Operations Head..."/></div>
          {!isEdit&&<div className="form-row"><label className="form-label">Company *</label>
            <select className="form-input" value={form.companyId} onChange={set('companyId')}>
              <option value="">Select company</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>}
          {!isEdit && selectedCompany && (
            <div style={{background:'var(--accent-d)',border:'1px solid rgba(37,99,235,0.2)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'var(--accent-l)'}}>
              <p style={{marginBottom:4,fontWeight:600}}>Admin login link:</p>
              <p style={{fontFamily:'var(--mono)',wordBreak:'break-all',fontSize:11}}>{loginLink('admin', selectedCompany.slug)}</p>
            </div>
          )}
          <div style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'var(--text-3)'}}>
            ℹ Admin logs in using their phone number + OTP (visible on this dashboard).
          </div>
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{flex:1}}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{flex:2}}>{saving?<><span className="spinner"/>Saving...</>:isEdit?'Save Changes':'Create Admin'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Users View (superadmin - can create/edit/delete) ────────────────
export function UsersView() {
  const toast = useToast();
  const [rows,setRows]=useState([]);const [total,setTotal]=useState(0);
  const [page,setPage]=useState(1);const [search,setSearch]=useState('');const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(null);
  const [companies,setCompanies]=useState([]);
  const [logModal,setLogModal]=useState(null); // {id, name}

  useEffect(()=>{loadCompanies();},[]);
  useEffect(()=>{const t=setTimeout(()=>{setPage(1);load(1,search)},300);return()=>clearTimeout(t);},[search]);
  useEffect(()=>{load(page,search);},[page]);

  async function loadCompanies(){try{const r=await api.get('/superadmin/companies?page=1&limit=200');setCompanies(r.data||[]);}catch{}}

  async function load(p=page,q=search){
    setLoading(true);
    try{const r=await api.get(`/superadmin/users?page=${p}&limit=${PG}&search=${encodeURIComponent(q)}`);setRows(r.data||[]);setTotal(r.total||0);}
    catch(err){toast(err.message,'error');}finally{setLoading(false);}
  }

  async function toggleActive(u){
    try{await api.put(`/superadmin/users/${u.id}`,{isActive:!u.isActive});toast('Updated','success');load(page,search);}
    catch(err){toast(err.message,'error');}
  }

  async function del(u){
    if(!confirm(`Delete user "${u.name}"?`))return;
    try{await api.delete(`/superadmin/users/${u.id}`);toast('User deleted','success');load(1,'');setSearch('');setPage(1);}
    catch(err){toast(err.message,'error');}
  }

  return (
    <div className="content">
      <div className="section-header">
        <div><h2 className="section-title">All Users</h2><p className="section-sub">{total} total across all companies</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal('create')}><Plus size={13}/>New User</button>
      </div>
      <div style={{marginBottom:16}}><div className="search-box"><Search size={14}/><input placeholder="Search name, ID or phone..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
      {loading?<div style={{textAlign:'center',padding:40}}><span className="spinner" style={{width:28,height:28}}/></div>
      :rows.length===0?<div className="empty"><Users size={36} style={{opacity:0.2}}/><p>No users found</p></div>
      :<>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>User ID</th><th>Phone</th><th>Company</th><th>Login Link</th><th>Vehicles</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map(u=>(
                <tr key={u.id} style={{cursor:'pointer'}} onClick={()=>setLogModal({id:u.id,name:u.name})}>
                  <td style={{fontWeight:700}}>{u.name}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:12,background:'var(--bg-2)',padding:'2px 6px',borderRadius:4,width:'fit-content'}}>{u.employeeId}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:12}}>{u.phone}</td>
                  <td><span style={{fontSize:12,background:'var(--purple-d)',color:'var(--purple-l)',padding:'2px 8px',borderRadius:4,fontWeight:600}}>{u.companyName}</span></td>
                  <td onClick={e=>e.stopPropagation()}>
                    {u.companySlug && <CopyBtn text={loginLink('user', u.companySlug)} label="user login link" />}
                  </td>
                  <td style={{fontSize:12}}>
                    {u.assignedVehicles?.length > 0
                      ? u.assignedVehicles.map(v=><span key={v.id} style={{fontFamily:'var(--mono)',fontSize:11,background:'var(--bg-2)',padding:'1px 5px',borderRadius:3,marginRight:3}}>{v.plateNumber}</span>)
                      : <span style={{color:'var(--text-3)'}}>—</span>}
                  </td>
                  <td><span className={`badge ${u.isActive?'badge-green':'badge-red'}`}>{u.isActive?'Active':'Inactive'}</span></td>
                  <td style={{fontSize:11,color:'var(--text-3)'}}>{u.lastLogin?new Date(u.lastLogin).toLocaleDateString('en-IN'):'Never'}</td>
                  <td onClick={e=>e.stopPropagation()}>
                    <div style={{display:'flex',gap:5}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setModal(u)}><Edit2 size={11}/></button>
                      <button className="btn btn-ghost btn-xs" style={{color:u.isActive?'var(--amber-l)':'var(--green-l)'}} onClick={()=>toggleActive(u)}>
                        {u.isActive?<ToggleRight size={13}/>:<ToggleLeft size={13}/>}
                      </button>
                      <button className="btn btn-danger btn-xs" onClick={()=>del(u)}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{fontSize:11,color:'var(--text-3)',marginTop:8}}>💡 Click any row to view fuel logs for that user</p>
        <Pager page={page} total={total} limit={PG} onPage={setPage}/>
      </>}

      {modal&&<UserModal user={modal==='create'?null:modal} companies={companies} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load(1,'');setSearch('');setPage(1);}} toast={toast}/>}
      {logModal&&<FuelLogModal type="user" entityId={logModal.id} entityName={logModal.name} onClose={()=>setLogModal(null)} toast={toast}/>}
    </div>
  );
}

function UserModal({ user, companies, onClose, onSaved, toast }) {
  const isEdit=!!user;
  const [form,setForm]=useState({
    name:user?.name||'', employeeId:user?.employeeId||'',
    phone:user?.phone||'', licenseNumber:user?.licenseNumber||'',
    companyId:user?.companyId?.toString()||'',
    assignedVehicleIds: user?.assignedVehicleIds?.map(id=>id.toString())||[],
  });
  const [saving,setSaving]=useState(false);
  const [vehicles,setVehicles]=useState([]);
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));

  useEffect(()=>{
    if(form.companyId) loadVehicles(form.companyId);
  },[form.companyId]);

  async function loadVehicles(cid){
    try{const r=await api.get(`/superadmin/vehicles?companyId=${cid}&limit=100`);setVehicles(r.data||[]);}catch{}
  }

  async function save(e){
    e.preventDefault();
    if(!form.name||!form.employeeId||!form.phone){toast('Name, User ID and phone required','error');return;}
    if(!isEdit&&!form.companyId){toast('Select a company','error');return;}
    setSaving(true);
    try{
      if(isEdit)await api.put(`/superadmin/users/${user.id}`,{name:form.name,phone:form.phone,licenseNumber:form.licenseNumber,assignedVehicleIds:form.assignedVehicleIds});
      else await api.post('/superadmin/users',form);
      toast(isEdit?'User updated':'User created','success');onSaved();
    }catch(err){toast(err.message,'error');}
    finally{setSaving(false);}
  }

  const selectedCompany = companies.find(c => c.id === form.companyId);

  function toggleVehicle(vid) {
    setForm(f => ({
      ...f,
      assignedVehicleIds: f.assignedVehicleIds.includes(vid)
        ? f.assignedVehicleIds.filter(id => id !== vid)
        : [...f.assignedVehicleIds, vid],
    }));
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:480}}>
        <p className="modal-title">{isEdit?'Edit User':'Create User'}</p>
        <form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-row"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={set('name')} placeholder="User Name"/></div>
          <div className="form-grid">
            <div className="form-row">
              <label className="form-label">User ID *{isEdit?' (cannot change)':''}</label>
              <input className="form-input" value={form.employeeId} onChange={isEdit?undefined:set('employeeId')} readOnly={isEdit} placeholder="EMP001" style={{fontFamily:'var(--mono)',fontWeight:600,background:isEdit?'var(--bg-2)':undefined}}/>
            </div>
            <div className="form-row"><label className="form-label">Phone *</label><input className="form-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 99999 99999"/></div>
          </div>
          <div className="form-row"><label className="form-label">License Number</label><input className="form-input" value={form.licenseNumber} onChange={set('licenseNumber')} placeholder="DL-XXXXXXXXXX"/></div>
          {!isEdit&&<div className="form-row"><label className="form-label">Company *</label>
            <select className="form-input" value={form.companyId} onChange={set('companyId')}>
              <option value="">Select company</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>}

          {/* Vehicle assignment */}
          {vehicles.length > 0 && (
            <div className="form-row">
              <label className="form-label">Assign Vehicles</label>
              <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:160,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,padding:8}}>
                {vehicles.map(v=>(
                  <label key={v.id} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'4px 6px',borderRadius:6,background:form.assignedVehicleIds.includes(v.id)?'var(--accent-d)':'transparent'}}>
                    <input type="checkbox" checked={form.assignedVehicleIds.includes(v.id)} onChange={()=>toggleVehicle(v.id)} style={{accentColor:'var(--accent-l)'}}/>
                    <span style={{fontFamily:'var(--mono)',fontWeight:700,fontSize:13}}>{v.plateNumber}</span>
                    <span style={{fontSize:12,color:'var(--text-3)'}}>{v.make} {v.model}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!isEdit&&selectedCompany&&(
            <div style={{background:'var(--bg-2)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'var(--text-3)'}}>
              <p style={{marginBottom:4,color:'var(--text-2)'}}>User logs in with <strong>just their User ID</strong>:</p>
              <p style={{fontFamily:'var(--mono)',color:'var(--purple-l)',wordBreak:'break-all'}}>{loginLink('user', selectedCompany.slug)}</p>
            </div>
          )}

          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{flex:1}}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{flex:2}}>{saving?<><span className="spinner"/>Saving...</>:isEdit?'Save Changes':'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Vehicles View (superadmin - can create/edit/delete) ─────────────
export function VehiclesView() {
  const toast = useToast();
  const [rows,setRows]=useState([]);const [total,setTotal]=useState(0);const [page,setPage]=useState(1);const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState('');
  const [modal,setModal]=useState(null);
  const [companies,setCompanies]=useState([]);
  const [logModal,setLogModal]=useState(null);

  useEffect(()=>{loadCompanies();},[]);
  useEffect(()=>{const t=setTimeout(()=>{setPage(1);load(1,search)},300);return()=>clearTimeout(t);},[search]);
  useEffect(()=>{load(page,search);},[page]);

  async function loadCompanies(){try{const r=await api.get('/superadmin/companies?page=1&limit=200');setCompanies(r.data||[]);}catch{}}

  async function load(p=page,q=search){
    setLoading(true);
    try{
      const params=new URLSearchParams({page:p,limit:PG});
      if(q)params.set('search',q);
      const r=await api.get(`/superadmin/vehicles?${params}`);setRows(r.data||[]);setTotal(r.total||0);
    }catch(err){toast(err.message,'error');}finally{setLoading(false);}
  }

  async function del(v){
    if(!confirm(`Delete vehicle "${v.plateNumber}"?`))return;
    try{await api.delete(`/superadmin/vehicles/${v.id}`);toast('Vehicle deleted','success');load(1,'');}
    catch(err){toast(err.message,'error');}
  }

  return (
    <div className="content">
      <div className="section-header">
        <div><h2 className="section-title">All Vehicles</h2><p className="section-sub">{total} total fleet</p></div>
        <button className="btn btn-primary btn-sm" onClick={()=>setModal('create')}><Plus size={13}/>New Vehicle</button>
      </div>
      <div style={{marginBottom:16}}><div className="search-box"><Search size={14}/><input placeholder="Search plate, make or model..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
      {loading?<div style={{textAlign:'center',padding:40}}><span className="spinner" style={{width:28,height:28}}/></div>
      :<>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Plate</th><th>Make & Model</th><th>Year</th><th>Fuel</th><th>Status</th><th>Company</th><th>User</th><th>Last Odo</th><th>Total KM</th><th>Total Cost</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map(v=>(
                <tr key={v.id} style={{cursor:'pointer'}} onClick={()=>setLogModal({id:v.id,name:v.plateNumber})}>
                  <td><code style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:800}}>{v.plateNumber}</code></td>
                  <td>{v.make} {v.model}</td>
                  <td>{v.year}</td>
                  <td><span className="badge badge-blue">{v.fuelType}</span></td>
                  <td><span className={`badge ${v.status==='active'?'badge-green':v.status==='maintenance'?'badge-amber':'badge-red'}`}>{v.status}</span></td>
                  <td style={{fontSize:12,color:'var(--text-2)'}}>{v.companyName}</td>
                  <td style={{fontSize:12}}>
                    {v.assignedUserName
                      ? <><span style={{fontWeight:600}}>{v.assignedUserName}</span><br/><span style={{fontSize:10,color:'var(--text-3)',fontFamily:'var(--mono)'}}>{v.assignedUserEmpId}</span></>
                      : <span style={{color:'var(--text-3)'}}>—</span>}
                  </td>
                  <td style={{fontFamily:'var(--mono)',fontSize:12}}>{v.lastOdometer!=null?v.lastOdometer.toLocaleString('en-IN')+'km':'—'}</td>
                  <td style={{fontSize:12}}>{v.totalKmDriven>0?v.totalKmDriven.toLocaleString('en-IN')+'km':'—'}</td>
                  <td style={{fontWeight:700,color:'var(--green-l)'}}>{fmtRs(v.totalFuelCost)}</td>
                  <td onClick={e=>e.stopPropagation()}>
                    <div style={{display:'flex',gap:5}}>
                      <button className="btn btn-ghost btn-xs" onClick={()=>setModal(v)}><Edit2 size={11}/></button>
                      <button className="btn btn-danger btn-xs" onClick={()=>del(v)}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{fontSize:11,color:'var(--text-3)',marginTop:8}}>💡 Click any row to view fuel logs for that vehicle</p>
        <Pager page={page} total={total} limit={PG} onPage={setPage}/>
      </>}

      {modal&&<VehicleModal vehicle={modal==='create'?null:modal} companies={companies} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load(1,'');setSearch('');setPage(1);}} toast={toast}/>}
      {logModal&&<FuelLogModal type="vehicle" entityId={logModal.id} entityName={logModal.name} onClose={()=>setLogModal(null)} toast={toast}/>}
    </div>
  );
}

function VehicleModal({ vehicle, companies, onClose, onSaved, toast }) {
  const isEdit=!!vehicle;
  const [form,setForm]=useState({
    plateNumber:vehicle?.plateNumber||'',make:vehicle?.make||'',model:vehicle?.model||'',
    year:vehicle?.year||new Date().getFullYear(),fuelType:vehicle?.fuelType||'Diesel',
    status:vehicle?.status||'active',companyId:vehicle?.companyId?.toString()||'',
    assignedUserId:vehicle?.assignedUserId?.toString()||'',
  });
  const [saving,setSaving]=useState(false);
  const [users,setUsers]=useState([]);
  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));

  useEffect(()=>{
    if(form.companyId) loadUsers(form.companyId);
  },[form.companyId]);

  async function loadUsers(cid){
    try{const r=await api.get(`/superadmin/users?companyId=${cid}&limit=200`);setUsers(r.data||[]);}catch{}
  }

  async function save(e){
    e.preventDefault();
    if(!form.plateNumber||!form.make||!form.model||!form.year){toast('Plate, make, model and year required','error');return;}
    if(!isEdit&&!form.companyId){toast('Select a company','error');return;}
    setSaving(true);
    try{
      if(isEdit)await api.put(`/superadmin/vehicles/${vehicle.id}`,{...form,assignedUserId:form.assignedUserId||null});
      else await api.post('/superadmin/vehicles',{...form,assignedUserId:form.assignedUserId||null});
      toast(isEdit?'Vehicle updated':'Vehicle created','success');onSaved();
    }catch(err){toast(err.message,'error');}
    finally{setSaving(false);}
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:480}}>
        <p className="modal-title">{isEdit?'Edit Vehicle':'Add Vehicle'}</p>
        <form onSubmit={save} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="form-grid">
            <div className="form-row"><label className="form-label">Plate Number *</label><input className="form-input" value={form.plateNumber} onChange={set('plateNumber')} placeholder="MH01AB1234" style={{fontFamily:'var(--mono)',textTransform:'uppercase'}}/></div>
            <div className="form-row"><label className="form-label">Year *</label><input className="form-input" type="number" value={form.year} onChange={set('year')} min={1990} max={2050}/></div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label className="form-label">Make *</label><input className="form-input" value={form.make} onChange={set('make')} placeholder="Tata, Mahindra..."/></div>
            <div className="form-row"><label className="form-label">Model *</label><input className="form-input" value={form.model} onChange={set('model')} placeholder="Ace, Bolero..."/></div>
          </div>
          <div className="form-grid">
            <div className="form-row"><label className="form-label">Fuel Type</label>
              <select className="form-input" value={form.fuelType} onChange={set('fuelType')}>
                {['Diesel','Petrol','CNG','Electric','Other'].map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-row"><label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          {!isEdit&&<div className="form-row"><label className="form-label">Company *</label>
            <select className="form-input" value={form.companyId} onChange={set('companyId')}>
              <option value="">Select company</option>
              {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>}
          {users.length > 0 && <div className="form-row"><label className="form-label">Assign to User</label>
            <select className="form-input" value={form.assignedUserId} onChange={set('assignedUserId')}>
              <option value="">No user assigned</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.employeeId})</option>)}
            </select>
          </div>}
          <div style={{display:'flex',gap:10,marginTop:4}}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{flex:1}}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{flex:2}}>{saving?<><span className="spinner"/>Saving...</>:isEdit?'Save Changes':'Add Vehicle'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fuel Logs View ──────────────────────────────────────────────────
export function FuelLogsView() {
  const toast = useToast();
  const [rows,setRows]=useState([]);const [total,setTotal]=useState(0);const [page,setPage]=useState(1);const [loading,setLoading]=useState(true);
  const [from,setFrom]=useState('');const [to,setTo]=useState('');const [cid,setCid]=useState('');
  const [companies,setCompanies]=useState([]);

  useEffect(()=>{loadCos();},[]);
  useEffect(()=>{load(page);},[page,from,to,cid]);

  async function loadCos(){try{const r=await api.get('/superadmin/companies?page=1&limit=200');setCompanies(r.data||[]);}catch{}}

  async function load(p=page){
    setLoading(true);
    try{
      const q=new URLSearchParams({page:p,limit:PG});
      if(cid)q.set('companyId',cid);if(from)q.set('from',from);if(to)q.set('to',to);
      const r=await api.get(`/superadmin/fuel-logs?${q}`);setRows(r.data||[]);setTotal(r.total||0);
    }catch(err){toast(err.message,'error');}finally{setLoading(false);}
  }

  return (
    <div className="content">
      <div className="section-header"><div><h2 className="section-title">All Fuel Logs</h2><p className="section-sub">{total} entries — newest first</p></div></div>
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <select className="form-input" style={{width:200}} value={cid} onChange={e=>{setCid(e.target.value);setPage(1);}}>
          <option value="">All Companies</option>
          {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="form-input" type="date" style={{width:150}} value={from} onChange={e=>{setFrom(e.target.value);setPage(1);}} />
        <input className="form-input" type="date" style={{width:150}} value={to} onChange={e=>{setTo(e.target.value);setPage(1);}} />
        {(from||to||cid)&&<button className="btn btn-ghost btn-sm" onClick={()=>{setFrom('');setTo('');setCid('');setPage(1);}}>Clear</button>}
      </div>
      {loading?<div style={{textAlign:'center',padding:40}}><span className="spinner" style={{width:28,height:28}}/></div>
      :<>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Vehicle</th><th>User</th><th>Company</th><th>Litres</th><th>₹/L</th><th>Total</th><th>Odometer</th><th>KM Driven</th><th>Efficiency</th><th>Station</th></tr></thead>
            <tbody>
              {rows.map(l=>(
                <tr key={l.id}>
                  <td style={{fontSize:11,color:'var(--text-3)',whiteSpace:'nowrap'}}>{new Date(l.filledAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                  <td><code style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700}}>{l.vehiclePlate}</code>{l.vehicleMake&&<span style={{fontSize:11,color:'var(--text-3)'}}> {l.vehicleMake}</span>}</td>
                  <td style={{fontSize:12}}>{l.userName}<br/><span style={{fontSize:10,color:'var(--text-3)',fontFamily:'var(--mono)'}}>{l.userEmpId}</span></td>
                  <td style={{fontSize:12,color:'var(--text-2)'}}>{l.companyName}</td>
                  <td style={{fontWeight:600}}>{l.litres}L</td>
                  <td style={{fontSize:12}}>₹{l.costPerLitre?.toFixed(2)}</td>
                  <td style={{fontWeight:800,color:'var(--green-l)'}}>₹{l.totalCost?.toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  <td style={{fontFamily:'var(--mono)',fontSize:12}}>{l.odometer?.toLocaleString('en-IN')}</td>
                  <td style={{fontSize:12,color:l.kmDriven?'var(--text-1)':'var(--text-3)'}}>{l.kmDriven!=null?l.kmDriven.toLocaleString('en-IN')+' km':'—'}</td>
                  <td style={{fontSize:12,color:l.efficiency?'var(--amber-l)':'var(--text-3)'}}>{l.efficiency!=null?l.efficiency.toFixed(2)+' L/100km':'—'}</td>
                  <td style={{fontSize:12,color:'var(--text-3)'}}>{l.fuelStation||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={total} limit={PG} onPage={setPage}/>
      </>}
    </div>
  );
}
