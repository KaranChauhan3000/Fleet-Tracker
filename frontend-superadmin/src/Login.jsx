import { useState } from 'react';
import { api, saveAuth } from './api.js';
import { useToast } from './Toast.jsx';
import { Fuel, Lock, User, ShieldAlert } from 'lucide-react';

export default function Login({ onLogin }) {
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!username||!password) { toast('Enter username and password','error'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/superadmin-login', { username, password });
      saveAuth(res.token, res.user);
      onLogin(res.user);
    } catch(err) { toast(err.message,'error'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      {/* Bg grid */}
      <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:420, padding:'0 20px', position:'relative' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:60, height:60, background:'linear-gradient(135deg,#1D4ED8,#2563EB)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:'0 8px 32px rgba(37,99,235,0.3)' }}>
            <Fuel size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:'-0.02em' }}>Fleet Tracker</h1>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>Super Admin Control Panel</p>
          <p style={{ fontSize:11, color:'#F97316', marginTop:5, fontWeight:600, letterSpacing:'0.03em' }}>Karo India Foundation Initiative</p>
        </div>

        <form onSubmit={submit} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:28, display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'var(--red-d)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, marginBottom:4 }}>
            <ShieldAlert size={16} color="var(--red-l)" />
            <p style={{ fontSize:12, color:'var(--red-l)', fontWeight:600 }}>Restricted access — Super Admin only</p>
          </div>

          <div className="form-row">
            <label className="form-label">Username</label>
            <div style={{ position:'relative' }}>
              <User size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }} />
              <input className="form-input" style={{ paddingLeft:32 }} value={username} onChange={e=>setUsername(e.target.value)} placeholder="superadmin" autoComplete="username" />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Password</label>
            <div style={{ position:'relative' }}>
              <Lock size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }} />
              <input className="form-input" style={{ paddingLeft:32 }} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px', marginTop:4, fontSize:14 }} disabled={loading}>
            {loading ? <><span className="spinner" style={{borderTopColor:'#fff'}} />&nbsp;Signing in...</> : 'Sign In to Super Admin'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:12, color:'var(--text-3)' }}>
          Fleet Tracker v3.0 · Super Admin Portal · Desktop Only
        </p>
      </div>
    </div>
  );
}
