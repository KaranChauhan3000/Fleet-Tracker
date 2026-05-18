import { useState, useEffect } from 'react';
import { LogOut, Phone, Hash, Building2, ShieldCheck, Users, Plus, Trash2, X } from 'lucide-react';
import { userApi as api } from './api.js';

export default function Profile({ user, onLogout, onNavigate, toast }) {
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    try {
      const res = await api.get('/user/family-members');
      setMembers(res.members || []);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function handleAdd() {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/user/family-members', { name: name.trim(), phone: phone.trim() });
      setMembers(res.members || []);
      setName(''); setPhone(''); setShowAdd(false);
      toast?.('Family member added', 'success');
    } catch (err) { toast?.(err.message || 'Failed to add', 'error'); }
    finally { setSaving(false); }
  }

  async function handleRemove(memberPhone) {
    setDeleting(memberPhone);
    try {
      const res = await api.delete('/user/family-members/' + encodeURIComponent(memberPhone));
      setMembers(res.members || []);
      toast?.('Removed', 'success');
    } catch (err) { toast?.(err.message || 'Failed to remove', 'error'); }
    finally { setDeleting(null); }
  }

  const initials = user.name.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="page-wrapper page-enter">

      {/* ── Beautiful gradient profile header ──────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)',
        padding: '24px 16px 52px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140,
          borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
        <div style={{ position:'absolute', bottom:-10, left:-20, width:90, height:90,
          borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />

        <p style={{ fontSize:10, color:'rgba(255,255,255,0.6)', fontWeight:700,
          textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:20, position:'relative', zIndex:1 }}>
          Profile
        </p>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, position:'relative', zIndex:1 }}>
          <div style={{ width:72, height:72, borderRadius:'50%',
            background:'rgba(255,255,255,0.20)', backdropFilter:'blur(6px)',
            border:'2px solid rgba(255,255,255,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:26, fontWeight:900, color:'#fff' }}>{initials}</span>
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{user.name}</p>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:3 }}>Field User · {user.companyName}</p>
          </div>
        </div>
      </div>

      {/* ── Info cards — overlap header ─────────────────────────────── */}
      <div style={{ padding:'0 12px', marginTop:-24, position:'relative', zIndex:2 }}>
        <div style={{ background:'var(--bg-card)', borderRadius:16, boxShadow:'var(--shadow-md)',
          border:'1px solid var(--border-subtle)', overflow:'hidden' }}>
          <ProfileRow icon={Hash}        label="Employee ID" value={user.employeeId} mono />
          <ProfileRow icon={Phone}       label="Phone"       value={user.phone} />
          <ProfileRow icon={Building2}   label="Company"     value={user.companyName} />
          <ProfileRow icon={ShieldCheck} label="Role"        value="User / Field User" last />
        </div>
      </div>

      <div className="page-content" style={{ paddingTop:16 }}>

        {/* ── Family Tracker section ───────────────────────────────── */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-subtle)',
          borderRadius:16, padding:'14px', boxShadow:'var(--shadow)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:'rgba(99,102,241,0.12)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Users size={16} color="#6366f1" />
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:800, color:'var(--text-primary)' }}>Family Tracker</p>
                <p style={{ fontSize:11, color:'var(--text-muted)' }}>Members who can view your location</p>
              </div>
            </div>
            <button onClick={() => setShowAdd(v => !v)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
                border:'1px solid rgba(99,102,241,0.3)', background:'rgba(99,102,241,0.08)',
                fontSize:12, fontWeight:700, color:'#6366f1', cursor:'pointer' }}>
              {showAdd ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add</>}
            </button>
          </div>

          {showAdd && (
            <div style={{ background:'var(--bg-elevated)', borderRadius:12, padding:'12px',
              marginBottom:10, display:'flex', flexDirection:'column', gap:8 }}>
              <input placeholder="Name (e.g. Mom, Wife)" value={name} onChange={e => setName(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid var(--border)',
                  background:'var(--bg-input)', color:'var(--text-primary)', fontSize:14, outline:'none', boxSizing:'border-box' }} />
              <input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel"
                style={{ width:'100%', padding:'10px 12px', borderRadius:8, border:'1px solid var(--border)',
                  background:'var(--bg-input)', color:'var(--text-primary)', fontSize:14, outline:'none', boxSizing:'border-box' }} />
              <button onClick={handleAdd} disabled={saving || !name.trim() || !phone.trim()}
                style={{ padding:'11px', borderRadius:8,
                  background:'linear-gradient(135deg,#4f46e5,#6366f1)', border:'none',
                  color:'#fff', fontSize:13, fontWeight:800,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Adding…' : 'Add Family Member'}
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <span className="spinner" style={{ width:20, height:20 }} />
            </div>
          ) : members.length === 0 ? (
            <div style={{ background:'var(--bg-elevated)', border:'1px dashed var(--border)',
              borderRadius:10, padding:'18px 14px', textAlign:'center' }}>
              <p style={{ fontSize:13, color:'var(--text-muted)', fontWeight:600 }}>No family members added yet</p>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
                Add members so they can track you via the Family Tracker app
              </p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {members.map(m => (
                <div key={m.phone} style={{ display:'flex', alignItems:'center', gap:12,
                  background:'var(--bg-elevated)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ width:38, height:38, borderRadius:'50%',
                    background:'linear-gradient(135deg,#4f46e5,#8b5cf6)',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{m.name[0]?.toUpperCase()}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:14 }}>{m.name}</p>
                    <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>{m.phone}</p>
                  </div>
                  <button onClick={() => handleRemove(m.phone)} disabled={deleting === m.phone}
                    style={{ width:32, height:32, borderRadius:8, border:'1px solid rgba(239,68,68,0.25)',
                      background:'rgba(239,68,68,0.06)', display:'flex', alignItems:'center',
                      justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                    {deleting === m.phone
                      ? <span className="spinner" style={{ width:12, height:12, borderTopColor:'#ef4444' }} />
                      : <Trash2 size={13} color="#ef4444" />}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:10, textAlign:'center' }}>
            They open the <strong>Family Tracker</strong> app and enter their phone number to connect.
          </p>
        </div>

        {/* ── Sign out ───────────────────────────────────────────────── */}
        <button className="btn btn-danger" onClick={onLogout} style={{ gap:8, borderRadius:12 }}>
          <LogOut size={18} /> Sign Out
        </button>
        <p style={{ textAlign:'center', fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
          Fleet Tracker v3.0 · User App
        </p>

        <div style={{ height:4 }} />
      </div>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value, mono, last }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px',
      borderBottom: last ? 'none' : '1px solid var(--border-subtle)' }}>
      <div style={{ width:36, height:36, background:'var(--bg-elevated)', borderRadius:9,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon size={16} color="var(--text-muted)" />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700,
          textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
        <p style={{ fontSize:14, fontWeight:600, marginTop:2,
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font)',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}
