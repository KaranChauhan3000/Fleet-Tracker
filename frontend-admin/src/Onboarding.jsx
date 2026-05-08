import { useState } from 'react';
import {
  ShieldCheck, BarChart3, Bell, FileText,
  Fuel, CheckCircle2, ChevronRight, ArrowRight,
  RefreshCw, Users, Zap, Truck, UserCircle, Settings,
} from 'lucide-react';

const T = {
  bg:        '#0A0A0A',
  card:      '#111111',
  elevated:  '#161616',
  border:    '#222222',
  border2:   '#2a2a2a',
  orange:    '#F97316',
  orangeDim: 'rgba(249,115,22,0.12)',
  white:     '#FFFFFF',
  muted:     '#555555',
  subtle:    '#333333',
  textSec:   '#888888',
};

const S = {
  shell:  { minHeight:'100vh', display:'flex', flexDirection:'column', background:T.bg, fontFamily:'var(--font)', overflowX:'hidden' },
  dots:   { display:'flex', gap:6, justifyContent:'center', padding:'20px 0 0' },
  dot:    { height:6, borderRadius:99, transition:'all 0.35s ease' },
  page:   { flex:1, display:'flex', flexDirection:'column', padding:'0 28px 36px' },
  topRow: { display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:32, marginBottom:40 },
  brand:  { fontSize:12, fontWeight:600, color:T.muted, letterSpacing:'0.07em', textTransform:'uppercase' },
  ver:    { fontSize:12, color:T.subtle },
  iconBg: { width:64, height:64, borderRadius:18, background:T.elevated, border:`0.5px solid ${T.border2}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28 },
  h1:     { fontSize:36, fontWeight:500, color:T.white, lineHeight:1.1, letterSpacing:'-1px', margin:'0 0 16px' },
  h1Muted:{ color:T.muted, fontWeight:400, display:'block', fontSize:28, marginTop:6 },
  desc:   { fontSize:15, color:T.textSec, lineHeight:1.65, margin:'0 0 36px', maxWidth:290 },
  chip:   { display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:T.card, border:`0.5px solid ${T.border}`, borderRadius:12, marginBottom:10 },
  chipIcon:  { width:34, height:34, borderRadius:8, background:T.elevated, border:`0.5px solid ${T.border2}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:T.orange },
  chipTitle: { fontSize:13, fontWeight:600, color:T.white, margin:0 },
  chipSub:   { fontSize:12, color:T.muted },
  btn:    { width:'100%', padding:'15px', background:T.orange, color:T.white, border:'none', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'var(--font)', marginTop:'auto' },
  hint:   { textAlign:'center', fontSize:12, color:T.subtle, marginTop:14 },
};

function Dots({ total, current }) {
  return (
    <div style={S.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ ...S.dot, width: i === current ? 20 : 6, background: i === current ? T.orange : T.subtle }} />
      ))}
    </div>
  );
}

function WelcomePage({ onNext }) {
  return (
    <div style={S.page}>
      <div style={S.topRow}><span style={S.brand}>Fleet Pro</span><span style={S.ver}>v2.0</span></div>
      <div style={S.iconBg}><Truck size={28} color={T.orange} strokeWidth={1.6} /></div>
      <h1 style={S.h1}>Your fleet,<em style={S.h1Muted}>fully in control.</em></h1>
      <p style={S.desc}>Manage vehicles, fuel, documents and your team — from the palm of your hand.</p>
      {[
        { icon:<RefreshCw size={17} color={T.orange}/>, title:'Always up to date', sub:'Real-time data across your whole fleet' },
        { icon:<Users size={17} color={T.orange}/>,     title:'Built for teams',   sub:'Admin and driver access in one app' },
        { icon:<Zap size={17} color={T.orange}/>,       title:'Fast & simple',     sub:'Log fuel, docs, and expenses in seconds' },
      ].map((c,i) => (
        <div key={i} style={S.chip}>
          <div style={S.chipIcon}>{c.icon}</div>
          <div><p style={S.chipTitle}>{c.title}</p><span style={S.chipSub}>{c.sub}</span></div>
        </div>
      ))}
      <button style={{ ...S.btn, marginTop:32 }} onClick={onNext}>Get Started <ArrowRight size={18} /></button>
      <p style={S.hint}>Takes less than a minute to set up</p>
    </div>
  );
}

function RolePage({ onAdmin, onUser }) {
  const roleCard = { width:'100%', background:T.card, border:`0.5px solid ${T.border}`, borderRadius:14, padding:'20px', display:'flex', alignItems:'center', gap:16, cursor:'pointer', textAlign:'left' };
  return (
    <div style={S.page}>
      <div style={S.topRow}><span style={S.brand}>Fleet Pro</span><span style={S.ver}>v2.0</span></div>
      <p style={{ fontSize:13, fontWeight:600, color:T.orange, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Who are you?</p>
      <h1 style={{ ...S.h1, fontSize:30 }}>Let's get you<br/><em style={{ ...S.h1Muted, fontSize:24 }}>to the right place.</em></h1>
      <p style={{ ...S.desc, marginBottom:32 }}>Tell us your role so we can take you where you need to go.</p>

      <button onClick={onAdmin} style={{ ...roleCard, marginBottom:12 }}>
        <div style={{ width:48, height:48, borderRadius:13, background:T.orangeDim, border:`0.5px solid rgba(249,115,22,0.25)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Settings size={22} color={T.orange} />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:15, fontWeight:600, color:T.white, margin:'0 0 4px' }}>Admin</p>
          <p style={{ fontSize:13, color:T.textSec, margin:0 }}>Manage fleet, vehicles, users & reports</p>
        </div>
        <ChevronRight size={18} color={T.muted} />
      </button>

      <button onClick={onUser} style={roleCard}>
        <div style={{ width:48, height:48, borderRadius:13, background:T.elevated, border:`0.5px solid ${T.border2}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <UserCircle size={22} color={T.textSec} />
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:15, fontWeight:600, color:T.white, margin:'0 0 4px' }}>Driver / User</p>
          <p style={{ fontSize:13, color:T.textSec, margin:0 }}>Log fuel, view trips and manage your docs</p>
        </div>
        <ChevronRight size={18} color={T.muted} />
      </button>
    </div>
  );
}

function FeaturesPage({ onNext }) {
  return (
    <div style={S.page}>
      <div style={S.topRow}><span style={S.brand}>Fleet Pro</span><span style={S.ver}>v2.0</span></div>
      <p style={{ fontSize:13, fontWeight:600, color:T.orange, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Everything you need</p>
      <h1 style={{ ...S.h1, fontSize:30, marginBottom:8 }}>What you'll get</h1>
      <p style={{ ...S.desc, marginBottom:28 }}>Powerful tools that make fleet management feel effortless.</p>
      <div style={{ flex:1 }}>
        {[
          { icon:<BarChart3 size={18} color={T.orange}/>,   title:'Live dashboard',    desc:'Full fleet overview at a glance' },
          { icon:<Fuel size={18} color={T.orange}/>,        title:'Fuel & expenses',   desc:'Log and monitor every fill-up and cost' },
          { icon:<Bell size={18} color={T.orange}/>,        title:'Smart alerts',      desc:'Never miss expiry, insurance or service' },
          { icon:<FileText size={18} color={T.orange}/>,    title:'Document manager',  desc:'RC, insurance, challans — all stored' },
          { icon:<ShieldCheck size={18} color={T.orange}/>, title:'Compliance ready',  desc:'Stay on top of all regulatory needs' },
        ].map((f,i) => (
          <div key={i} style={S.chip}>
            <div style={S.chipIcon}>{f.icon}</div>
            <div><p style={S.chipTitle}>{f.title}</p><span style={S.chipSub}>{f.desc}</span></div>
          </div>
        ))}
      </div>
      <button style={{ ...S.btn, marginTop:24 }} onClick={onNext}>Continue <ArrowRight size={18} /></button>
    </div>
  );
}

function TermsPage({ onDone }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div style={{ ...S.page, paddingBottom:0 }}>
      <div style={S.topRow}><span style={S.brand}>Fleet Pro</span><span style={S.ver}>v2.0</span></div>
      <p style={{ fontSize:13, fontWeight:600, color:T.orange, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Before you begin</p>
      <h1 style={{ ...S.h1, fontSize:28, marginBottom:8 }}>Terms &<br/>Conditions</h1>
      <p style={{ ...S.desc, marginBottom:24 }}>Please read and agree to continue.</p>
      <div style={{ flex:1, overflowY:'auto', marginBottom:20 }}>
        {[
          { title:'Data usage',             body:'Your fleet data is stored securely and used only to power your dashboard. We never sell your data.' },
          { title:'Account responsibility', body:'You are responsible for your login credentials and all activity under your account.' },
          { title:'Accurate information',   body:'Ensure vehicle details, fuel logs, and documents you upload are accurate and up to date.' },
          { title:'Acceptable use',         body:'Fleet Pro is for legitimate fleet management only. Misuse will result in account termination.' },
          { title:'Updates & changes',      body:'We may update these terms occasionally. Continued use means you accept any updates.' },
        ].map((t,i) => (
          <div key={i} style={{ display:'flex', gap:12, marginBottom:16 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:T.orange, marginTop:6, flexShrink:0 }} />
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:T.white, margin:'0 0 3px' }}>{t.title}</p>
              <p style={{ fontSize:12, color:T.textSec, margin:0, lineHeight:1.55 }}>{t.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:'16px 0 36px', borderTop:`0.5px solid ${T.border}` }}>
        <label onClick={() => setAgreed(a=>!a)} style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer', userSelect:'none', marginBottom:16 }}>
          <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, marginTop:1, border:`1.5px solid ${agreed?T.orange:T.subtle}`, background:agreed?T.orangeDim:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
            {agreed && <CheckCircle2 size={14} color={T.orange} />}
          </div>
          <span style={{ fontSize:13, color:T.textSec, lineHeight:1.5 }}>I have read and agree to the Terms & Conditions</span>
        </label>
        <button style={{ ...S.btn, marginTop:0, opacity:agreed?1:0.35, cursor:agreed?'pointer':'not-allowed' }} disabled={!agreed} onClick={onDone}>
          Enter Fleet Pro <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default function Onboarding({ onDone }) {
  const [page, setPage] = useState(0);
  return (
    <div style={S.shell}>
      <Dots total={page === 0 ? 1 : 4} current={page} />
      {page === 0 && <RolePage onAdmin={() => setPage(1)} onUser={() => onDone('user-login')} />}
      {page === 1 && <WelcomePage onNext={() => setPage(2)} />}
      {page === 2 && <FeaturesPage onNext={() => setPage(3)} />}
      {page === 3 && <TermsPage onDone={() => onDone('register')} />}
    </div>
  );
}