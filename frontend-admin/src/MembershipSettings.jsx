import { useState, useEffect } from 'react';
import { api } from './api.js';
import { useToast } from './Toast.jsx';
import { Crown, CheckCircle, Clock, AlertTriangle, ChevronRight,
  Phone, Users, Truck, ArrowRight, Shield } from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    trial:   { label: 'Free Trial',  color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
    active:  { label: 'Active',      color: 'var(--success)', bg: 'var(--success-dim)' },
    expired: { label: 'Expired',     color: 'var(--danger)',  bg: 'var(--danger-dim)' },
  };
  const s = map[status] || map.trial;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20,
      padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>
      {s.label}
    </span>
  );
}

export default function MembershipSettings({ admin, onGetMembership }) {
  const toast = useToast();
  const [membership, setMembership]   = useState(null);
  const [loading,    setLoading]      = useState(true);
  const [showForm,   setShowForm]     = useState(false);
  const [form,       setForm]         = useState({ desiredLimit: '', reason: '', contactName: '', contactPhone: '' });
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const s = await api.get('/admin/membership/status');
      setMembership(s);
      setForm(f => ({ ...f, contactName: admin?.name || '', contactPhone: admin?.phone || '' }));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function submitLimitRequest() {
    if (!form.desiredLimit || parseInt(form.desiredLimit) <= (membership?.vehicleLimit || 50)) {
      toast(`Enter a number greater than your current limit (${membership?.vehicleLimit || 50})`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/membership/limit-request', {
        desiredLimit:  parseInt(form.desiredLimit),
        reason:        form.reason,
        contactName:   form.contactName,
        contactPhone:  form.contactPhone,
      });
      toast('Request submitted! Karo India team will contact you within 24 hours.', 'success');
      setShowForm(false);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSubmitting(false); }
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
      <span className="spinner" style={{ width:24, height:24 }} />
    </div>
  );

  if (!membership) return null;

  const isActive  = membership.status === 'active';
  const isTrial   = membership.status === 'trial';
  const isExpired = membership.status === 'expired';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Status card */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:14, overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'14px 16px',
          background: isActive ? 'var(--success-dim)' : isTrial ? 'rgba(59,130,246,0.06)' : 'var(--danger-dim)',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Crown size={18} color={isActive ? 'var(--success)' : isTrial ? '#3b82f6' : 'var(--danger)'} />
            <p style={{ fontSize:14, fontWeight:800 }}>Membership</p>
          </div>
          <StatusBadge status={membership.status} />
        </div>

        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {/* Plan info */}
          {[
            { label: 'Company',     value: admin?.companyName || '—' },
            { label: 'Plan',        value: isActive ? (membership.plan === 'yearly' ? '₹2000/year' : '₹200/month') : isTrial ? '30-day Free Trial' : '—' },
            { label: isActive ? 'Expires On' : isTrial ? 'Trial Ends' : 'Expired On',
              value: membership.expiresAt
                ? new Date(membership.expiresAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
                : membership.trialEndsAt
                  ? new Date(membership.trialEndsAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
                  : '—' },
            { label: 'Days Left',   value: membership.daysLeft > 0 ? `${membership.daysLeft} days` : 'Expired' },
            { label: 'Vehicle Limit', value: `${membership.vehicleLimit} vehicles & drivers` },
          ].map(({ label, value }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <p style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{label}</p>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action button */}
      {(isExpired || isTrial || (isActive && membership.daysLeft <= 30)) && (
        <button
          onClick={onGetMembership}
          style={{
            padding:'14px', borderRadius:12, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg,#EA580C,#F97316)',
            color:'#fff', fontSize:14, fontWeight:800,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow:'0 4px 16px rgba(249,115,22,0.30)',
          }}
        >
          <Crown size={16} />
          {isExpired ? 'Renew Membership' : isActive ? 'Renew Early' : 'Get Membership'}
          <ArrowRight size={15} />
        </button>
      )}

      {/* Vehicle limit section */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:14, overflow:'hidden' }}>
        <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:10 }}>
          <Truck size={16} color="var(--accent)" />
          <div>
            <p style={{ fontSize:13, fontWeight:800 }}>Vehicle & Driver Limit</p>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
              Your plan includes up to {membership.vehicleLimit} vehicles and drivers
            </p>
          </div>
        </div>
        <div style={{ padding:'13px 16px' }}>
          {membership.limitRequest?.pending ? (
            <div style={{ display:'flex', alignItems:'flex-start', gap:8,
              background:'rgba(245,158,11,0.08)', borderRadius:10, padding:'10px 12px',
              border:'1px solid rgba(245,158,11,0.25)' }}>
              <Clock size={14} color="#f59e0b" style={{ flexShrink:0, marginTop:1 }} />
              <div>
                <p style={{ fontSize:12, fontWeight:800, color:'#f59e0b' }}>
                  Limit increase request pending
                </p>
                <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                  Requested: {membership.limitRequest.requested} vehicles · Our team will contact you shortly
                </p>
              </div>
            </div>
          ) : isActive ? (
            <>
              <p style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5, marginBottom:10 }}>
                Need more than {membership.vehicleLimit} vehicles or drivers?
                Fill the form below and our team will set up your custom limit.
              </p>
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px',
                    background:'var(--accent-dim)', border:'1px solid rgba(249,115,22,0.25)',
                    borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
                    color:'var(--accent-light)' }}
                >
                  Request Limit Increase <ChevronRight size={13} />
                </button>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div className="input-group">
                    <label className="input-label">Desired Vehicle Limit *</label>
                    <input className="input-field" type="number" min={membership.vehicleLimit + 1}
                      value={form.desiredLimit} onChange={e => setForm(f => ({...f, desiredLimit: e.target.value}))}
                      placeholder={`More than ${membership.vehicleLimit}`} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Reason (optional)</label>
                    <input className="input-field" value={form.reason}
                      onChange={e => setForm(f => ({...f, reason: e.target.value}))}
                      placeholder="e.g. expanding fleet operations" />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div className="input-group">
                      <label className="input-label">Contact Name</label>
                      <input className="input-field" value={form.contactName}
                        onChange={e => setForm(f => ({...f, contactName: e.target.value}))} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Contact Phone</label>
                      <input className="input-field" type="tel" value={form.contactPhone}
                        onChange={e => setForm(f => ({...f, contactPhone: e.target.value}))} />
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-ghost" onClick={() => setShowForm(false)}
                      style={{ flex:1 }} disabled={submitting}>Cancel</button>
                    <button className="btn btn-primary" onClick={submitLimitRequest}
                      style={{ flex:2 }} disabled={submitting}>
                      {submitting ? <><span className="spinner" /> Submitting...</> : 'Submit Request'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>
              Get an active membership to request a limit increase.
            </p>
          )}
        </div>
      </div>

      {/* Support */}
      <div style={{ display:'flex', alignItems:'center', gap:10,
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:12, padding:'12px 14px' }}>
        <Phone size={15} color="var(--accent)" style={{ flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <p style={{ fontSize:13, fontWeight:700 }}>Karo India Foundation Support</p>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
            Questions about membership or billing?
          </p>
        </div>
        <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer"
          style={{ fontSize:11, fontWeight:700, color:'var(--accent-light)',
            background:'var(--accent-dim)', borderRadius:7, padding:'5px 10px',
            textDecoration:'none' }}>
          WhatsApp
        </a>
      </div>

    </div>
  );
}
