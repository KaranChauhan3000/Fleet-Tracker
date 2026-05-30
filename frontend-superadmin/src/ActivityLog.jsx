import { useState, useEffect, useCallback } from 'react';
import { api, fmtDT } from './api.js';
import { RefreshCw, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

const ACTION_CHIP = {
  create: 'chip-green',  update: 'chip-blue', delete: 'chip-red',
  login:  'chip-purple', approve:'chip-cyan',  reject: 'chip-amber',
};

const ENTITY_CHIP = {
  company: 'chip-blue', admin: 'chip-green', user: 'chip-purple',
  vehicle: 'chip-amber', fuel_log: 'chip-default', membership: 'chip-cyan',
};

function Pagination({ page, total, limit, onChange }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end', marginTop:14 }}>
      <span style={{ fontSize:11, color:'var(--text-4)' }}>{total} entries</span>
      <button className="icon-btn" onClick={() => onChange(page-1)} disabled={page<=1}><ChevronLeft size={12} /></button>
      {Array.from({ length: Math.min(5, pages) }, (_, i) => {
        let p = i+1;
        if (pages > 5 && page > 3) { p = page-2+i; if (p>pages) return null; }
        return <button key={p} className={`btn btn-sm ${page===p?'btn-primary':'btn-ghost'}`} onClick={() => onChange(p)} style={{ minWidth:28, padding:'4px 7px' }}>{p}</button>;
      })}
      <button className="icon-btn" onClick={() => onChange(page+1)} disabled={page>=pages}><ChevronRight size={12} /></button>
    </div>
  );
}

export default function ActivityLog() {
  const [data,    setData]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [entity,  setEntity]  = useState('');
  const [action,  setAction]  = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let qs = `?page=${page}&limit=25`;
      if (search) qs += '&search=' + encodeURIComponent(search);
      if (entity) qs += '&entity=' + entity;
      if (action) qs += '&action=' + action;
      const r = await api.get('/superadmin/activity-log' + qs);
      setData(r.data || []); setTotal(r.total || 0);
    } catch { setData([]); setTotal(0); }
    finally { setLoading(false); }
  }, [page, search, entity, action]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, entity, action]);

  return (
    <div className="content fade-in" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <p className="page-title">Activity Log</p>
          <p className="page-sub">Audit trail of all changes made in the platform</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={12} strokeWidth={2} /> Refresh</button>
      </div>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <div className="search" style={{ flex:1, minWidth:200 }}>
          <Search strokeWidth={1.6} />
          <input placeholder="Search by name or detail…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="icon-btn" style={{ border:'none', width:20, height:20 }} onClick={() => setSearch('')}><X size={11} /></button>}
        </div>
        <select className="field-input" style={{ width:140 }} value={entity} onChange={e => setEntity(e.target.value)}>
          <option value="">All entities</option>
          {['company','admin','user','vehicle','fuel_log','membership'].map(e =>
            <option key={e} value={e}>{e.replace('_',' ')}</option>
          )}
        </select>
        <select className="field-input" style={{ width:130 }} value={action} onChange={e => setAction(e.target.value)}>
          <option value="">All actions</option>
          {['create','update','delete','login','approve','reject'].map(a =>
            <option key={a} value={a}>{a}</option>
          )}
        </select>
        {(entity || action) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setEntity(''); setAction(''); }}>
            <X size={11} /> Clear
          </button>
        )}
      </div>

      <div className="tbl-wrap" style={{ background:'var(--bg-card)' }}>
        <table className="tbl">
          <thead>
            <tr><th>Time</th><th>Action</th><th>Entity</th><th>Details</th><th>Performed By</th></tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={5} style={{ textAlign:'center', padding:32 }}><div className="spin-ring" style={{ margin:'0 auto' }} /></td></tr>
              : data.length === 0
              ? <tr><td colSpan={5}><div className="empty"><p>No activity yet</p></div></td></tr>
              : data.map((entry, i) => (
                <tr key={i}>
                  <td style={{ fontSize:11, color:'var(--text-3)', whiteSpace:'nowrap' }}>{fmtDT(entry.createdAt)}</td>
                  <td><span className={`chip ${ACTION_CHIP[entry.action] || 'chip-default'}`}>{entry.action}</span></td>
                  <td><span className={`chip ${ENTITY_CHIP[entry.entity] || 'chip-default'}`}>{entry.entity?.replace('_',' ')}</span></td>
                  <td style={{ fontSize:12, color:'var(--text-2)', maxWidth:320, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {entry.detail || entry.entityName || '—'}
                  </td>
                  <td style={{ fontSize:12 }}>
                    <p style={{ fontWeight:500 }}>{entry.performedBy || 'Super Admin'}</p>
                    {entry.companyName && <p style={{ fontSize:11, color:'var(--text-4)', marginTop:1 }}>{entry.companyName}</p>}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        <div style={{ padding:'10px 18px' }}>
          <Pagination page={page} total={total} limit={25} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
