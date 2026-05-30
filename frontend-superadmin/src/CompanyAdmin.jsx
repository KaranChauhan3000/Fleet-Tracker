import { useState, useEffect, useCallback } from 'react';
import { api, fmtDate, fmtDT, fmtRs } from './api.js';
import { useToast } from './Toast.jsx';
import { Search, Plus, Edit2, Trash2, X, Check, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';

function Pg({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end', marginTop:14 }}>
      <span style={{ fontSize:11, color:'var(--text-4)' }}>{total} total</span>
      <button className="icon-btn" onClick={() => onChange(page-1)} disabled={page<=1}><ChevronLeft size={12} /></button>
      {Array.from({ length: Math.min(7, pages) }, (_, i) => {
        let p = i+1;
        if (pages>7 && page>4) { p=page-3+i; if(p>pages) return null; }
        return <button key={p} className={`btn btn-sm ${page===p?'btn-primary':'btn-ghost'}`} onClick={() => onChange(p)} style={{ minWidth:28, padding:'4px 7px' }}>{p}</button>;
      })}
      <button className="icon-btn" onClick={() => onChange(page+1)} disabled={page>=pages}><ChevronRight size={12} /></button>
    </div>
  );
}

function ConfirmDel({ name, onConfirm, onCancel }) {
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth:380 }}>
        <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>Confirm Delete</p>
        <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:16 }}>This will permanently delete <strong style={{ color:'var(--text)' }}>{name}</strong>. This cannot be undone.</p>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── COMPANIES ─────────────────────────────────────────────────── */
export function Companies({ onNavigate }) {
  const toast = useToast();
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(null);
  const [del, setDel]         = useState(null);
  const [form, setForm]       = useState({ name:'', slug:'', isActive:true });
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/superadmin/companies?page=${page}&limit=15${search?'&search='+encodeURIComponent(search):''}`);
      setData(r.data); setTotal(r.total);
    } catch {} finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  async function save() {
    if (!form.name?.trim()) { toast('Name is required', 'error'); return; }
    if (modal==='create' && !form.slug?.trim()) { toast('Slug is required', 'error'); return; }
    setSaving(true);
    try {
      if (modal==='create') await api.post('/superadmin/companies', { name:form.name, slug:form.slug });
      else await api.put(`/superadmin/companies/${form._id}`, { name:form.name, isActive:form.isActive });
      toast(`Company ${modal==='create'?'created':'updated'}`, 'success');
      setModal(null); load();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  }

  async function toggle(c) {
    try {
      await api.put(`/superadmin/companies/${c.id}`, { isActive:!c.isActive });
      load();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function doDelete() {
    try {
      await api.delete(`/superadmin/companies/${del.id}`);
      toast('Company deleted', 'success'); setDel(null); load();
    } catch (err) { toast(err.message, 'error'); }
  }

  const fld = (k,v) => setForm(f => ({...f, [k]:v}));

  return (
    <div className="content fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <p className="page-title">Companies</p>
          <p className="page-sub">{total} companies on the platform</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm({ name:'', slug:'', isActive:true }); setModal('create'); }}>
          <Plus size={13} strokeWidth={2.5} /> New Company
        </button>
      </div>

      <div className="search">
        <Search strokeWidth={1.6} />
        <input placeholder="Search by name or slug…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="icon-btn" style={{ border:'none', width:20, height:20 }} onClick={() => setSearch('')}><X size={11} /></button>}
      </div>

      <div className="tbl-wrap" style={{ background:'var(--bg-card)' }}>
        <table className="tbl">
          <thead>
            <tr><th>Company</th><th>Admins</th><th>Drivers</th><th>Vehicles</th><th style={{ textAlign:'right' }}>Spend</th><th>Status</th><th>Created</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8} style={{ textAlign:'center', padding:32 }}><div className="spin-ring" style={{ margin:'0 auto' }} /></td></tr>
              : data.length === 0
              ? <tr><td colSpan={8}><div className="empty"><p>No companies found</p></div></td></tr>
              : data.map(c => (
                <tr key={c.id}>
                  <td>
                    <p style={{ fontWeight:600, fontSize:13 }}>{c.name}</p>
                    <p style={{ fontSize:11, color:'var(--text-4)', fontFamily:'var(--mono)', marginTop:2 }}>{c.slug}</p>
                  </td>
                  <td style={{ fontFamily:'var(--mono)', fontWeight:600, color:'var(--blue-l)' }}>{c.adminCount}</td>
                  <td style={{ fontFamily:'var(--mono)', fontWeight:600, color:'var(--purple-l)' }}>{c.userCount}</td>
                  <td style={{ fontFamily:'var(--mono)', fontWeight:600, color:'var(--amber-l)' }}>{c.vehicleCount}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, color:'var(--green-l)', fontWeight:600 }}>{fmtRs(c.totalSpend)}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span className={`dot ${c.isActive?'dot-green':'dot-gray'}`} />
                      <span style={{ fontSize:12, color:'var(--text-2)' }}>{c.isActive?'Active':'Inactive'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:11, color:'var(--text-3)' }}>{fmtDate(c.createdAt)}</td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="icon-btn" onClick={() => toggle(c)} title={c.isActive?'Deactivate':'Activate'}>
                        {c.isActive ? <ToggleRight size={14} color="var(--green-l)" /> : <ToggleLeft size={14} />}
                      </button>
                      <button className="icon-btn" onClick={() => { setForm({ name:c.name, slug:c.slug, isActive:c.isActive, _id:c.id }); setModal('edit'); }} title="Edit">
                        <Edit2 size={13} strokeWidth={1.8} />
                      </button>
                      <button className="icon-btn danger" onClick={() => setDel(c)} title="Delete">
                        <Trash2 size={13} strokeWidth={1.8} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        <div style={{ padding:'10px 18px' }}><Pg page={page} total={total} limit={15} onChange={setPage} /></div>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <p style={{ fontSize:15, fontWeight:700 }}>{modal==='create'?'New Company':'Edit Company'}</p>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <div className="field"><label className="field-lbl">Company Name *</label>
              <input className="field-input" value={form.name} onChange={e => fld('name', e.target.value)} placeholder="Karo India Logistics" /></div>
            {modal==='create' && (
              <div className="field"><label className="field-lbl">Slug * (lowercase, hyphens only)</label>
                <input className="field-input" value={form.slug} onChange={e => fld('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="karo-india-logistics" /></div>
            )}
            {modal==='edit' && (
              <div className="field">
                <label className="field-lbl">Status</label>
                <div style={{ display:'flex', gap:6 }}>
                  {[true, false].map(v => (
                    <button key={String(v)} className={`btn btn-sm ${form.isActive===v?'btn-primary':'btn-ghost'}`} onClick={() => fld('isActive', v)}>
                      {v ? 'Active' : 'Inactive'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><span className="spin-ring" style={{ borderTopColor:'#fff' }} /> Saving…</> : <><Check size={13} strokeWidth={2.5} /> {modal==='create'?'Create':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {del && <ConfirmDel name={del.name} onConfirm={doDelete} onCancel={() => setDel(null)} />}
    </div>
  );
}

/* ── ADMINS ─────────────────────────────────────────────────────── */
export function Admins() {
  const toast = useToast();
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [companies, setComps] = useState([]);
  const [cFilter, setCFilter] = useState('');
  const [modal, setModal]     = useState(null);
  const [del, setDel]         = useState(null);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let qs = `?page=${page}&limit=15`;
      if (search)  qs += '&search=' + encodeURIComponent(search);
      if (cFilter) qs += '&companyId=' + cFilter;
      const r = await api.get('/superadmin/admins' + qs);
      setData(r.data); setTotal(r.total);
    } catch {} finally { setLoading(false); }
  }, [page, search, cFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, cFilter]);
  useEffect(() => { api.get('/superadmin/companies?limit=100').then(r => setComps(r.data||[])).catch(()=>{}); }, []);

  const fld = (k,v) => setForm(f => ({...f,[k]:v}));

  async function save() {
    if (!form.name||!form.email||!form.phone||!form.companyId) { toast('All fields required', 'error'); return; }
    setSaving(true);
    try {
      if (modal==='create') await api.post('/superadmin/admins', form);
      else await api.put(`/superadmin/admins/${form._id}`, { name:form.name, email:form.email, phone:form.phone, designation:form.designation, isActive:form.isActive });
      toast(`Admin ${modal==='create'?'created':'updated'}`, 'success');
      setModal(null); load();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  }

  async function doDelete() {
    try { await api.delete(`/superadmin/admins/${del.id}`); toast('Admin deleted', 'success'); setDel(null); load(); }
    catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div className="content fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <p className="page-title">Admins</p>
          <p className="page-sub">{total} admins across all companies</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm({ name:'', email:'', phone:'', designation:'', companyId:companies[0]?.id||'', isActive:true }); setModal('create'); }}>
          <Plus size={13} strokeWidth={2.5} /> New Admin
        </button>
      </div>

      <div style={{ display:'flex', gap:10 }}>
        <div className="search" style={{ flex:1 }}>
          <Search strokeWidth={1.6} />
          <input placeholder="Search by name, email or phone…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="icon-btn" style={{ border:'none', width:20, height:20 }} onClick={() => setSearch('')}><X size={11} /></button>}
        </div>
        <select className="field-input" style={{ width:190 }} value={cFilter} onChange={e => setCFilter(e.target.value)}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="tbl-wrap" style={{ background:'var(--bg-card)' }}>
        <table className="tbl">
          <thead><tr><th>Admin</th><th>Phone</th><th>Company</th><th>Designation</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} style={{ textAlign:'center', padding:32 }}><div className="spin-ring" style={{ margin:'0 auto' }} /></td></tr>
              : data.length === 0
              ? <tr><td colSpan={7}><div className="empty"><p>No admins found</p></div></td></tr>
              : data.map(a => (
                <tr key={a.id}>
                  <td>
                    <p style={{ fontWeight:600, fontSize:13 }}>{a.name}</p>
                    <p style={{ fontSize:11, color:'var(--text-4)', marginTop:2 }}>{a.email}</p>
                  </td>
                  <td style={{ fontFamily:'var(--mono)', fontSize:12 }}>{a.phone}</td>
                  <td><span className="chip chip-blue">{a.companyName}</span></td>
                  <td style={{ fontSize:12, color:'var(--text-2)' }}>{a.designation||'—'}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span className={`dot ${a.isActive?'dot-green':'dot-gray'}`} />
                      <span style={{ fontSize:12, color:'var(--text-2)' }}>{a.isActive?'Active':'Inactive'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:11, color:'var(--text-3)' }}>{a.lastLogin ? fmtDT(a.lastLogin) : 'Never'}</td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="icon-btn" onClick={() => { setForm({ name:a.name, email:a.email, phone:a.phone, designation:a.designation||'', isActive:a.isActive, _id:a.id }); setModal('edit'); }}>
                        <Edit2 size={13} strokeWidth={1.8} />
                      </button>
                      <button className="icon-btn danger" onClick={() => setDel(a)}><Trash2 size={13} strokeWidth={1.8} /></button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        <div style={{ padding:'10px 18px' }}><Pg page={page} total={total} limit={15} onChange={setPage} /></div>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <p style={{ fontSize:15, fontWeight:700 }}>{modal==='create'?'New Admin':'Edit Admin'}</p>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={14} /></button>
            </div>
            <div className="g2">
              <div className="field"><label className="field-lbl">Full Name *</label><input className="field-input" value={form.name||''} onChange={e => fld('name',e.target.value)} placeholder="Rajesh Kumar" /></div>
              <div className="field"><label className="field-lbl">Email *</label><input className="field-input" type="email" value={form.email||''} onChange={e => fld('email',e.target.value)} placeholder="rajesh@co.in" /></div>
              <div className="field"><label className="field-lbl">Phone *</label><input className="field-input" value={form.phone||''} onChange={e => fld('phone',e.target.value)} placeholder="9876543210" /></div>
              <div className="field"><label className="field-lbl">Designation</label><input className="field-input" value={form.designation||''} onChange={e => fld('designation',e.target.value)} placeholder="Fleet Manager" /></div>
            </div>
            {modal==='create' && (
              <div className="field"><label className="field-lbl">Company *</label>
                <select className="field-input" value={form.companyId||''} onChange={e => fld('companyId',e.target.value)}>
                  <option value="">Select…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {modal==='edit' && (
              <div className="field"><label className="field-lbl">Status</label>
                <div style={{ display:'flex', gap:6 }}>
                  {[true, false].map(v => (
                    <button key={String(v)} className={`btn btn-sm ${form.isActive===v?'btn-primary':'btn-ghost'}`} onClick={() => fld('isActive',v)}>{v?'Active':'Inactive'}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><span className="spin-ring" style={{ borderTopColor:'#fff' }} /> Saving…</> : <><Check size={13} strokeWidth={2.5} /> {modal==='create'?'Create':'Save'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {del && <ConfirmDel name={del.name} onConfirm={doDelete} onCancel={() => setDel(null)} />}
    </div>
  );
}
