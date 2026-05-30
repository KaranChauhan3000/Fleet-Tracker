import { useState, useEffect, useCallback } from 'react';
import { api, fmtDate } from './api.js';
import { useToast } from './Toast.jsx';
import { Search, X, Check, Edit2, ChevronLeft, ChevronRight, AlertTriangle, Clock } from 'lucide-react';

function Pagination({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end', marginTop:14 }}>
      <span style={{ fontSize:11, color:'var(--text-4)' }}>{total} total</span>
      <button className="icon-btn" onClick={() => onChange(page-1)} disabled={page<=1}><ChevronLeft size={12} /></button>
      {Array.from({ length: Math.min(7, pages) }, (_, i) => {
        let p = i+1;
        if (pages > 7 && page > 4) { p = page-3+i; if (p > pages) return null; }
        return <button key={p} className={`btn btn-sm ${page===p?'btn-primary':'btn-ghost'}`} onClick={() => onChange(p)} style={{ minWidth:28, padding:'4px 7px' }}>{p}</button>;
      })}
      <button className="icon-btn" onClick={() => onChange(page+1)} disabled={page>=pages}><ChevronRight size={12} /></button>
    </div>
  );
}

const PLANS = ['monthly', 'yearly'];

export default function Memberships() {
  const toast = useToast();
  const [data,   setData]   = useState([]);
  const [total,  setTotal]  = useState(0);
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [tab,    setTab]    = useState('all');   // all | expiring | expired | pending
  const [modal,  setModal]  = useState(null);    // null | { company }
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [loading,setLoading]= useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let qs = `?page=${page}&limit=15`;
      if (search) qs += '&search=' + encodeURIComponent(search);
      if (tab !== 'all') qs += '&filter=' + tab;
      const r = await api.get('/superadmin/memberships' + qs);
      setData(r.data || []); setTotal(r.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [page, search, tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, tab]);

  function openEdit(c) {
    setForm({
      _id: c.id,
      plan: c.membership?.plan || 'monthly',
      vehicleLimit: c.membership?.vehicleLimit || 10,
      expiresAt: c.membership?.expiresAt ? c.membership.expiresAt.slice(0, 10) : '',
    });
    setModal(c);
  }

  async function save() {
    setSaving(true);
    try {
      await api.put(`/superadmin/companies/${form._id}/membership`, {
        plan: form.plan,
        vehicleLimit: parseInt(form.vehicleLimit),
        expiresAt: form.expiresAt,
      });
      toast('Membership updated', 'success');
      setModal(null); load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  async function approveLimitRequest(companyId) {
    try {
      await api.post(`/superadmin/companies/${companyId}/approve-limit`);
      toast('Limit request approved', 'success'); load();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function rejectLimitRequest(companyId) {
    try {
      await api.post(`/superadmin/companies/${companyId}/reject-limit`);
      toast('Limit request rejected', 'success'); load();
    } catch (err) { toast(err.message, 'error'); }
  }

  const statusChip = (c) => {
    const now = new Date();
    const exp = c.membership?.expiresAt ? new Date(c.membership.expiresAt) : null;
    if (!c.membership?.plan) return <span className="chip chip-default">No Plan</span>;
    if (exp && exp < now)    return <span className="chip chip-red">Expired</span>;
    if (exp && (exp - now) < 30 * 86400000) return <span className="chip chip-amber">Expiring</span>;
    return <span className="chip chip-green">Active</span>;
  };

  const fld = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const TABS = [
    { id:'all',      label:'All' },
    { id:'expiring', label:'Expiring (30d)' },
    { id:'expired',  label:'Expired' },
    { id:'pending',  label:'Limit Requests' },
  ];

  return (
    <div className="content fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <p className="page-title">Memberships</p>
          <p className="page-sub">Manage plans, vehicle limits and renewal dates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="search">
        <Search strokeWidth={1.6} />
        <input placeholder="Search company…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="icon-btn" style={{ border:'none', width:20, height:20 }} onClick={() => setSearch('')}><X size={11} /></button>}
      </div>

      <div className="tbl-wrap" style={{ background:'var(--bg-card)' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Company</th><th>Plan</th><th>Vehicle Limit</th>
              <th>Expires</th><th>Status</th><th>Limit Request</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} style={{ textAlign:'center', padding:32 }}><div className="spin-ring" style={{ margin:'0 auto' }} /></td></tr>
              : data.length === 0
              ? <tr><td colSpan={7}><div className="empty"><p>No results</p></div></td></tr>
              : data.map(c => (
                <tr key={c.id}>
                  <td>
                    <p style={{ fontWeight:600, fontSize:13 }}>{c.name}</p>
                    <p style={{ fontSize:11, color:'var(--text-4)', marginTop:2, fontFamily:'var(--mono)' }}>{c.slug}</p>
                  </td>
                  <td>
                    {c.membership?.plan
                      ? <span className="chip chip-blue">{c.membership.plan}</span>
                      : <span className="chip chip-default">—</span>}
                  </td>
                  <td style={{ fontFamily:'var(--mono)', fontWeight:600 }}>{c.membership?.vehicleLimit ?? '—'}</td>
                  <td style={{ fontSize:12, color:'var(--text-2)' }}>{fmtDate(c.membership?.expiresAt)}</td>
                  <td>{statusChip(c)}</td>
                  <td>
                    {c.membership?.limitRequest?.pending
                      ? <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span className="chip chip-amber">
                            <AlertTriangle size={10} strokeWidth={2} />
                            Req: {c.membership.limitRequest.requested}
                          </span>
                          <button className="icon-btn success" title="Approve" onClick={() => approveLimitRequest(c.id)}><Check size={12} /></button>
                          <button className="icon-btn danger" title="Reject" onClick={() => rejectLimitRequest(c.id)}><X size={12} /></button>
                        </div>
                      : <span style={{ color:'var(--text-4)', fontSize:12 }}>—</span>
                    }
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => openEdit(c)} title="Edit plan"><Edit2 size={13} strokeWidth={1.8} /></button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        <div style={{ padding:'10px 18px' }}>
          <Pagination page={page} total={total} limit={15} onChange={setPage} />
        </div>
      </div>

      {modal && (
        <div className="overlay">
          <div className="modal">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div>
                <p style={{ fontSize:15, fontWeight:700 }}>Edit Membership</p>
                <p style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{modal.name}</p>
              </div>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={14} /></button>
            </div>

            <div className="g2">
              <div className="field">
                <label className="field-lbl">Plan</label>
                <select className="field-input" value={form.plan} onChange={e => fld('plan', e.target.value)}>
                  {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-lbl">Vehicle Limit</label>
                <input className="field-input" type="number" min={1} value={form.vehicleLimit} onChange={e => fld('vehicleLimit', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="field-lbl">Expiry Date</label>
              <input className="field-input" type="date" value={form.expiresAt} onChange={e => fld('expiresAt', e.target.value)} />
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:6 }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><span className="spin-ring" style={{ borderTopColor:'#fff' }} /> Saving…</> : <><Check size={12} strokeWidth={2.5} /> Save</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
