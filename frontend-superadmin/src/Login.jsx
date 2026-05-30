import { useState } from 'react';
import { api, saveAuth } from './api.js';
import { useToast } from './Toast.jsx';
import { Fuel, Lock, User } from 'lucide-react';

export default function Login({ onLogin }) {
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!username || !password) { toast('Enter credentials', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/superadmin-login', { username, password });
      saveAuth(res.token, res.user);
      onLogin(res.user);
    } catch (err) { toast(err.message, 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', inset:0, backgroundImage:'radial-gradient(circle at 50% 0%, rgba(59,111,240,0.06) 0%, transparent 60%)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:380, padding:'0 20px', position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:48, height:48, background:'var(--blue)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:'0 0 40px rgba(59,111,240,0.3)' }}>
            <Fuel size={22} color="#fff" strokeWidth={1.8} />
          </div>
          <p style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em' }}>FleetPro</p>
          <p style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>Super Admin Portal</p>
        </div>

        <form onSubmit={submit} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:24, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:6, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--red)', flexShrink:0 }} />
            <p style={{ fontSize:11, color:'var(--red-l)' }}>Restricted — authorised access only</p>
          </div>

          <div className="field" style={{ marginBottom:0 }}>
            <label className="field-lbl">Username</label>
            <div className="field-input-icon">
              <User size={13} strokeWidth={1.6} />
              <input className="field-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="superadmin" autoComplete="username" />
            </div>
          </div>

          <div className="field" style={{ marginBottom:0 }}>
            <label className="field-lbl">Password</label>
            <div className="field-input-icon">
              <Lock size={13} strokeWidth={1.6} />
              <input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'10px', marginTop:4, fontSize:13 }} disabled={loading}>
            {loading ? <><span className="spin-ring" style={{ borderTopColor:'#fff' }} /> Signing in…</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
