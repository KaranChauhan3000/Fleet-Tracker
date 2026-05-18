import { useState, useEffect } from 'react';
import {
  CheckCircle, Truck, MapPin, FileText, BarChart2,
  ArrowRight, Crown, Shield, Zap,
} from 'lucide-react';

const FEATURES = [
  { icon: Truck,    text: 'Manage up to 50 vehicles & drivers' },
  { icon: MapPin,   text: 'Live location tracking & timelines' },
  { icon: FileText, text: 'Fuel logs, challans & documents' },
  { icon: BarChart2,text: 'Reports & fleet analytics' },
  { icon: Shield,   text: 'Insurance & service reminders' },
  { icon: Crown,    text: 'Karo India Foundation member access' },
];

export default function WelcomeTrialScreen({ admin, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  function handleStart() {
    setVisible(false);
    setTimeout(onDone, 300);
  }

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);
  const trialEndStr = trialEnd.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{
      position:      'fixed',
      inset:         0,
      zIndex:        9999,
      background:    'var(--bg-base)',
      display:       'flex',
      flexDirection: 'column',
      opacity:       visible ? 1 : 0,
      transform:     visible ? 'translateY(0)' : 'translateY(16px)',
      transition:    'opacity 0.3s ease, transform 0.3s ease',
      overflow:      'hidden',
    }}>

      {/* ── Orange header ─────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #EA580C 0%, #F97316 60%, #FB923C 100%)',
        padding:    '28px 20px 24px',
        textAlign:  'center',
        position:   'relative',
        overflow:   'hidden',
        flexShrink: 0,
      }}>
        <div style={{ position:'absolute', top:-24, right:-24, width:96, height:96,
          borderRadius:'50%', background:'rgba(255,255,255,0.08)' }} />
        <div style={{ position:'absolute', bottom:-16, left:-16, width:64, height:64,
          borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />

        <div style={{
          width:52, height:52, borderRadius:15,
          background:'rgba(255,255,255,0.2)',
          backdropFilter:'blur(10px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 12px',
          border:'1.5px solid rgba(255,255,255,0.3)',
        }}>
          <CheckCircle size={28} color="#fff" strokeWidth={2.5} />
        </div>

        <p style={{
          fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.85)',
          textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:6,
        }}>
          Karo India Foundation Initiative
        </p>

        <p style={{
          fontSize:24, fontWeight:900, color:'#fff',
          letterSpacing:'-0.02em', lineHeight:1.2, marginBottom:6,
        }}>
          Welcome to Fleet Pro!
        </p>

        <p style={{ fontSize:14, color:'rgba(255,255,255,0.92)', fontWeight:600, marginBottom:14 }}>
          Congratulations, {admin?.name?.split(' ')[0] || 'there'}! 🎉
        </p>

        {/* Trial pill inside header — no floating card */}
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          background:'rgba(255,255,255,0.18)',
          border:'1px solid rgba(255,255,255,0.3)',
          borderRadius:10, padding:'7px 14px',
        }}>
          <Zap size={14} color="#fff" />
          <p style={{ fontSize:13, fontWeight:800, color:'#fff' }}>
            30 Days FREE Trial — until {trialEndStr}
          </p>
          <Zap size={14} color="#fff" />
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'16px 16px 8px' }}>

        <p style={{
          fontSize:10, fontWeight:800, color:'var(--text-muted)',
          textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10,
        }}>
          Everything included in your trial
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} style={{
              display:'flex', alignItems:'center', gap:10,
              background:'var(--bg-card)', border:'1px solid var(--border)',
              borderRadius:10, padding:'10px 12px',
            }}>
              <div style={{
                width:32, height:32, borderRadius:8, flexShrink:0,
                background:'var(--accent-dim)',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Icon size={15} color="var(--accent)" />
              </div>
              <p style={{ fontSize:13, color:'var(--text-primary)', fontWeight:600, flex:1 }}>
                {text}
              </p>
              <CheckCircle size={14} color="var(--success)" style={{ flexShrink:0 }} />
            </div>
          ))}
        </div>

        <div style={{
          marginTop:10, padding:'9px 13px',
          background:'var(--bg-elevated)',
          borderRadius:10, border:'1px solid var(--border)',
        }}>
          <p style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.5, textAlign:'center' }}>
            After your trial, continue with <strong>₹200/month</strong> or{' '}
            <strong>₹2000/year</strong> per company.
            No credit card required during trial.
          </p>
        </div>
      </div>

      {/* ── Sticky CTA ────────────────────────────────────────────── */}
      <div style={{ padding:'12px 16px 28px', flexShrink:0, background:'var(--bg-base)' }}>
        <button
          onClick={handleStart}
          style={{
            width:'100%', padding:'15px',
            borderRadius:14, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg, #EA580C, #F97316)',
            color:'#fff', fontSize:16, fontWeight:900,
            letterSpacing:'-0.01em',
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            boxShadow:'0 6px 24px rgba(249,115,22,0.40)',
          }}
        >
          Start Exploring Fleet Pro
          <ArrowRight size={18} />
        </button>
        <p style={{ textAlign:'center', fontSize:11, color:'var(--text-muted)', marginTop:8 }}>
          No payment needed · Cancel anytime
        </p>
      </div>
    </div>
  );
}
