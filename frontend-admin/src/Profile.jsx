import { clearAuth } from './api.js';
import { LogOut, Phone, Mail, Briefcase, Building2, ShieldCheck, Sun, Moon } from 'lucide-react';

export default function Profile({ admin, onLogout, dark, onToggleTheme }) {
  return (
    <div className="page-wrapper page-enter">
      <div className="page-header" style={{ justifyContent:'space-between' }}>
        <p style={{ fontSize:15, fontWeight:800, letterSpacing:'-0.01em' }}>My Profile</p>
        {onToggleTheme && (
          <button className="theme-toggle" onClick={onToggleTheme} title={dark?'Light mode':'Dark mode'}>
            {dark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
        )}
      </div>
      <div className="page-content">
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 0 12px', gap:10 }}>
          <div style={{ width:68, height:68, background:'linear-gradient(135deg,#EA580C,#F97316)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 24px rgba(249,115,22,0.30)' }}>
            <span style={{ fontSize:26, fontWeight:900, color:'#fff' }}>{admin.name?.[0]?.toUpperCase()}</span>
          </div>
          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:19, fontWeight:800, letterSpacing:'-0.02em' }}>{admin.name}</p>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{admin.designation||'Fleet Admin'}</p>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { icon:Phone,       label:'Phone',       value:admin.phone },
            { icon:Mail,        label:'Email',        value:admin.email },
            { icon:Briefcase,   label:'Designation',  value:admin.designation||'—' },
            { icon:Building2,   label:'Company',      value:admin.companyName },
            { icon:ShieldCheck, label:'Role',         value:'Fleet Administrator' },
          ].map(({ icon:Icon, label, value }) => (
            <div key={label} className="card-sm" style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, background:'var(--accent-dim)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={15} color="var(--accent)"/>
              </div>
              <div>
                <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
                <p style={{ fontSize:14, fontWeight:600 }}>{value||'—'}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="divider"/>
        <button className="btn btn-danger-ghost" onClick={()=>{clearAuth();onLogout();}} style={{ gap:8 }}>
          <LogOut size={16}/> Sign Out
        </button>
        <p style={{ textAlign:'center', fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Fleet Tracker · Admin App</p>
      </div>
    </div>
  );
}
 
