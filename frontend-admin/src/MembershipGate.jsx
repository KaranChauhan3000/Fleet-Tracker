import { useState, useEffect } from 'react';
import { api } from './api.js';
import {
  Crown, CheckCircle, Phone, Zap, Shield,
  Truck, MapPin, FileText, BarChart2, Star,
  ArrowRight, ArrowLeft, Lock, X,
} from 'lucide-react';

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script  = document.createElement('script');
    script.src    = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror= () => resolve(false);
    document.body.appendChild(script);
  });
}

const FEATURES = [
  { icon: Truck,    text: 'Unlimited vehicle & driver management' },
  { icon: MapPin,   text: 'Live location tracking & timelines' },
  { icon: FileText, text: 'Fuel logs, challans & documents' },
  { icon: BarChart2,text: 'Reports & fleet analytics' },
  { icon: Shield,   text: 'Insurance & service reminders' },
  { icon: Star,     text: 'Karo India Foundation member access' },
];

const PLANS = [
  {
    id:       'yearly',
    label:    'Yearly',
    price:    '₹2,000',
    sub:      'per year',
    badge:    'Best Value',
    saving:   'Save ₹400 · 2 months free',
    perMonth: '₹167/mo',
  },
  {
    id:       'monthly',
    label:    'Monthly',
    price:    '₹200',
    sub:      'per month',
    badge:    null,
    saving:   'Cancel anytime',
    perMonth: null,
  },
];

export default function MembershipGate({ admin, onActivated, onBack }) {
  const [status,       setStatus]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [paying,       setPaying]       = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [error,        setError]        = useState('');
  const [showContact,  setShowContact]  = useState(false);

  useEffect(() => {
    api.get('/admin/membership/status')
      .then(s => setStatus(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function pay() {
    setError('');
    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Could not load payment gateway. Check your internet connection.');

      const order = await api.post('/admin/membership/create-order', { plan: selectedPlan });

      if (order.contactSupport) {
        setShowContact(true);
        setPaying(false);
        return;
      }

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         status.razorpayKeyId,
          amount:      order.amount,
          currency:    order.currency,
          name:        'Karo India Foundation Initiative',
          description: order.planLabel + ' — Fleet Pro Membership',
          order_id:    order.orderId,
          prefill: {
            name:    admin?.name    || '',
            email:   admin?.email   || '',
            contact: admin?.phone   || '',
          },
          notes: { companyName: admin?.companyName || '' },
          theme: { color: '#EA580C' },
          handler: async (response) => {
            try {
              const result = await api.post('/admin/membership/verify-payment', {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                plan:                selectedPlan,
              });
              resolve(result);
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
        rzp.on('payment.failed', resp =>
          reject(new Error(resp.error?.description || 'Payment failed'))
        );
        rzp.open();
      });

      onActivated();
    } catch (err) {
      if (err.message !== 'Payment cancelled') setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  }

  if (loading) return (
    <div style={{
      minHeight:'100vh',
      background:'var(--bg-base)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <div style={{
        width:40, height:40, borderRadius:'50%',
        border:'3px solid var(--border)',
        borderTopColor:'var(--accent)',
        animation:'spin 0.8s linear infinite',
      }} />
    </div>
  );

  const isExpired = status?.status === 'expired';
  const daysLeft  = status?.daysLeft ?? 0;

  return (
    <div style={{
      position:      'relative',
      minHeight:     '100vh',
      background:    'var(--bg-base)',
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
    }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        background:  'linear-gradient(135deg, #C2410C 0%, #EA580C 45%, #F97316 100%)',
        padding:     '24px 20px 22px',
        flexShrink:  0,
        position:    'relative',
        overflow:    'hidden',
      }}>
        {/* bg circles */}
        <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140,
          borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-30, left:-20, width:100, height:100,
          borderRadius:'50%', background:'rgba(0,0,0,0.08)', pointerEvents:'none' }} />

        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              position:'absolute', top:0, left:0,
              background:'rgba(255,255,255,0.15)',
              border:'1px solid rgba(255,255,255,0.25)',
              borderRadius:10, padding:'6px 12px',
              display:'flex', alignItems:'center', gap:6,
              cursor:'pointer', color:'#fff', fontSize:13, fontWeight:700,
              zIndex:1,
            }}
          >
            <ArrowLeft size={15} color="#fff" /> Back
          </button>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative', marginTop: onBack ? 36 : 0 }}>
          <div style={{
            width:48, height:48, borderRadius:14, flexShrink:0,
            background:'rgba(255,255,255,0.18)',
            border:'1.5px solid rgba(255,255,255,0.30)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Crown size={24} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.75)',
              textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:3 }}>
              Karo India Foundation
            </p>
            <p style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:'-0.02em', lineHeight:1.1 }}>
              {isExpired ? 'Membership Expired' : 'Upgrade to Fleet Pro'}
            </p>
          </div>
        </div>

        <p style={{
          fontSize:13, color:'rgba(255,255,255,0.85)', marginTop:12,
          lineHeight:1.55, position:'relative',
        }}>
          {isExpired
            ? `Your access expired ${daysLeft === 0 ? 'recently' : `${Math.abs(daysLeft)} days ago`}. Renew to continue managing your fleet.`
            : `Your free trial ends soon. Get a membership to keep full access — your data is always safe.`}
        </p>
      </div>

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>

        {/* Plan selector */}
        <div style={{ padding:'18px 16px 0' }}>
          <p style={{
            fontSize:11, fontWeight:800, color:'var(--text-muted)',
            textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10,
          }}>
            Choose a plan
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {PLANS.map(plan => {
              const active = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  style={{
                    padding:'14px 16px',
                    borderRadius:14,
                    border: active ? '2px solid #EA580C' : '1.5px solid var(--border)',
                    background: active ? 'rgba(234,88,12,0.07)' : 'var(--bg-card)',
                    cursor:'pointer',
                    textAlign:'left',
                    position:'relative',
                    transition:'border-color 0.15s, background 0.15s',
                  }}
                >
                  {/* Best Value badge */}
                  {plan.badge && (
                    <div style={{
                      position:'absolute', top:-1, right:14,
                      background:'linear-gradient(135deg,#C2410C,#F97316)',
                      borderRadius:'0 0 8px 8px',
                      padding:'2px 9px',
                    }}>
                      <p style={{ fontSize:9, fontWeight:900, color:'#fff',
                        textTransform:'uppercase', letterSpacing:'0.06em' }}>
                        {plan.badge}
                      </p>
                    </div>
                  )}

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <p style={{
                        fontSize:15, fontWeight:800,
                        color: active ? '#EA580C' : 'var(--text-primary)',
                        marginBottom:3,
                      }}>
                        {plan.label}
                        {plan.perMonth && (
                          <span style={{ fontSize:11, fontWeight:600,
                            color:'var(--text-muted)', marginLeft:6 }}>
                            ({plan.perMonth})
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize:11, color:'var(--text-muted)' }}>{plan.saving}</p>
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ textAlign:'right' }}>
                        <p style={{
                          fontSize:22, fontWeight:900, letterSpacing:'-0.02em',
                          color: active ? '#EA580C' : 'var(--text-primary)',
                        }}>
                          {plan.price}
                        </p>
                        <p style={{ fontSize:10, color:'var(--text-muted)' }}>{plan.sub}</p>
                      </div>
                      <div style={{
                        width:20, height:20, borderRadius:'50%', flexShrink:0,
                        border: active ? '2px solid #EA580C' : '2px solid var(--border)',
                        background: active ? '#EA580C' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.15s',
                      }}>
                        {active && <CheckCircle size={12} color="#fff" strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div style={{ padding:'16px 16px 0' }}>
          <p style={{
            fontSize:11, fontWeight:800, color:'var(--text-muted)',
            textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10,
          }}>
            Everything included
          </p>

          <div style={{
            background:'var(--bg-card)', border:'1px solid var(--border)',
            borderRadius:14, overflow:'hidden',
          }}>
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <div key={text} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'11px 14px',
                borderBottom: i < FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width:30, height:30, borderRadius:8, flexShrink:0,
                  background:'rgba(234,88,12,0.10)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Icon size={14} color="#EA580C" />
                </div>
                <p style={{ fontSize:13, color:'var(--text-primary)', fontWeight:600, flex:1 }}>
                  {text}
                </p>
                <CheckCircle size={14} color="var(--success)" style={{ flexShrink:0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Security note */}
        <div style={{
          margin:'12px 16px 0',
          display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>
          <Lock size={11} color="var(--text-muted)" />
          <p style={{ fontSize:11, color:'var(--text-muted)' }}>
            Secured by Razorpay · SSL encrypted · No hidden charges
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            margin:'12px 16px 0',
            background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)',
            borderRadius:10, padding:'10px 14px',
            display:'flex', alignItems:'flex-start', gap:8,
          }}>
            <X size={14} color="#ef4444" style={{ flexShrink:0, marginTop:1 }} />
            <p style={{ fontSize:12, color:'#ef4444', fontWeight:600, lineHeight:1.5 }}>{error}</p>
          </div>
        )}

        {/* Contact support card */}
        {showContact && (
          <div style={{
            margin:'12px 16px 0',
            background:'rgba(234,88,12,0.07)', border:'1px solid rgba(234,88,12,0.25)',
            borderRadius:14, padding:'16px',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <Crown size={18} color="#EA580C" />
              <p style={{ fontSize:14, fontWeight:800, color:'#EA580C' }}>
                Contact Us for Membership
              </p>
            </div>
            <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6, marginBottom:12 }}>
              Online payments are being set up. Please contact Karo India Foundation to activate your membership.
            </p>
            <a
              href="https://wa.me/919999999999"
              target="_blank"
              rel="noreferrer"
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'#25D366', color:'#fff',
                borderRadius:9, padding:'9px 16px',
                textDecoration:'none', fontSize:13, fontWeight:700,
              }}
            >
              <Phone size={14} /> WhatsApp Karo India
            </a>
          </div>
        )}

        {/* Support link */}
        <div style={{
          margin:'12px 16px 0',
          display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>
          <Phone size={12} color="var(--text-muted)" />
          <p style={{ fontSize:12, color:'var(--text-muted)' }}>
            Need help?{' '}
            <a
              href="https://wa.me/919999999999"
              target="_blank"
              rel="noreferrer"
              style={{ color:'#EA580C', fontWeight:700, textDecoration:'none' }}
            >
              Contact Karo India Support
            </a>
          </p>
        </div>

        {/* Bottom spacing */}
        <div style={{ height:16 }} />
      </div>

      {/* ── Sticky pay button ──────────────────────────────────── */}
      <div style={{
        padding:'12px 16px 28px', flexShrink:0,
        background:'var(--bg-base)',
        borderTop:'1px solid var(--border)',
      }}>
        <button
          onClick={pay}
          disabled={paying}
          style={{
            width:'100%', padding:'15px',
            borderRadius:14, border:'none',
            cursor: paying ? 'not-allowed' : 'pointer',
            background: paying
              ? 'var(--bg-elevated)'
              : 'linear-gradient(135deg, #C2410C, #F97316)',
            color: paying ? 'var(--text-muted)' : '#fff',
            fontSize:15, fontWeight:900, letterSpacing:'-0.01em',
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            boxShadow: paying ? 'none' : '0 6px 24px rgba(234,88,12,0.35)',
            transition:'opacity 0.15s',
            opacity: paying ? 0.7 : 1,
          }}
        >
          {paying ? (
            <>
              <div style={{
                width:16, height:16, borderRadius:'50%',
                border:'2px solid var(--text-muted)',
                borderTopColor:'transparent',
                animation:'spin 0.7s linear infinite',
              }} />
              Processing...
            </>
          ) : (
            <>
              Pay {selectedPlan === 'yearly' ? '₹2,000' : '₹200'} — Activate Membership
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
