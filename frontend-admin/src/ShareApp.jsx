
import { useState, useRef } from 'react';
import { X, Smartphone, Share2, Phone, CheckCircle } from 'lucide-react';

const APP_URL = window.location.origin;
const APP_NAME = 'FleetPro';

const styles = `
@keyframes sa_slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
@keyframes sa_pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.4); }
  50%     { box-shadow: 0 0 0 10px rgba(37,211,102,0); }
}
@keyframes sa_bounce {
  0%,100% { transform: translateY(0); }
  40%     { transform: translateY(-6px); }
}
@keyframes sa_checkPop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.sa-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
}
.sa-sheet {
  width: 100%; max-width: 480px;
  background: #111827;
  border-radius: 24px 24px 0 0;
  padding: 0 0 env(safe-area-inset-bottom,24px);
  animation: sa_slideUp 0.32s cubic-bezier(.32,1.14,.56,1) both;
}
.sa-handle {
  width: 40px; height: 4px; border-radius: 2px;
  background: #334155; margin: 12px auto 0;
}
.sa-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 0;
}
.sa-title { font-size: 18px; font-weight: 700; color: #F1F5F9; }
.sa-close {
  width: 32px; height: 32px; border-radius: 50%;
  background: #1E293B; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #94A3B8; transition: background 0.15s;
}
.sa-close:hover { background: #334155; }

/* Hero */
.sa-hero {
  margin: 18px 20px 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%);
  padding: 20px;
  display: flex; align-items: center; gap: 14px;
  position: relative; overflow: hidden;
}
.sa-hero::before {
  content: ''; position: absolute;
  width: 140px; height: 140px; border-radius: 50%;
  background: rgba(255,255,255,0.06);
  top: -40px; right: -30px;
}
.sa-hero-icon {
  width: 52px; height: 52px; border-radius: 14px;
  background: rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  animation: sa_bounce 2.4s ease-in-out infinite;
}
.sa-hero-text { flex: 1; }
.sa-hero-text h3 { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 3px; }
.sa-hero-text p  { font-size: 12px; color: rgba(255,255,255,0.72); line-height: 1.4; }

/* Main share section */
.sa-body { padding: 24px 20px 8px; }

.sa-label {
  font-size: 12px; font-weight: 700; color: #64748B;
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 10px;
}

/* Phone input */
.sa-input-wrap {
  display: flex; align-items: center;
  background: #1E293B; border: 1.5px solid #334155;
  border-radius: 14px; padding: 4px 4px 4px 14px;
  transition: border-color 0.2s;
  gap: 8px;
}
.sa-input-wrap:focus-within {
  border-color: #3B82F6;
}
.sa-input-prefix {
  font-size: 15px; font-weight: 700; color: #60A5FA;
  white-space: nowrap; flex-shrink: 0;
}
.sa-input {
  flex: 1; background: transparent; border: none; outline: none;
  font-size: 17px; font-weight: 600; color: #F1F5F9;
  padding: 10px 0;
  letter-spacing: 1px;
}
.sa-input::placeholder { color: #475569; font-weight: 400; letter-spacing: 0; }
.sa-input::-webkit-inner-spin-button,
.sa-input::-webkit-outer-spin-button { -webkit-appearance: none; }

/* Big share button */
.sa-share-btn {
  width: 100%; margin-top: 16px;
  padding: 16px;
  border-radius: 14px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
  display: flex; align-items: center; justify-content: center; gap: 10px;
  font-size: 16px; font-weight: 700; color: #fff;
  transition: opacity 0.2s, transform 0.1s;
  animation: sa_pulse 2.5s ease-in-out infinite;
  position: relative; overflow: hidden;
}
.sa-share-btn:active { transform: scale(0.97); }
.sa-share-btn:disabled {
  background: #1E293B; color: #475569;
  animation: none; cursor: not-allowed;
}
.sa-share-btn-wa {
  font-size: 22px;
}

/* Success state */
.sa-success {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(16,185,129,0.1);
  border: 1.5px solid rgba(16,185,129,0.25);
  display: flex; align-items: flex-start; gap: 12px;
}
.sa-success-icon {
  animation: sa_checkPop 0.4s ease both;
  flex-shrink: 0; margin-top: 1px;
}
.sa-success-text strong {
  display: block; font-size: 14px; font-weight: 700; color: #34D399;
  margin-bottom: 3px;
}
.sa-success-text span {
  font-size: 12px; color: #6EE7B7; line-height: 1.5;
}

/* Info note */
.sa-note {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(59,130,246,0.06);
  border: 1px solid rgba(59,130,246,0.12);
  font-size: 11.5px; color: #64748B; line-height: 1.6;
}
.sa-note strong { color: #93C5FD; }

.sa-divider {
  height: 1px; background: #1E293B; margin: 20px 0 0;
}
.sa-footer {
  padding: 16px 20px;
  font-size: 11px; color: #334155; text-align: center;
}
`;

export default function ShareApp({ onClose }) {
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const inputRef = useRef(null);

  // Sanitise: keep digits only, max 10 (Indian mobile without country code)
  function handlePhone(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    if (sent) setSent(false);
  }

  function handleShare() {
    if (phone.length < 10) return;

    const fullNumber = `+91${phone}`;   // country code prepended
    const contactName = 'FleetPro User';

    // ── 1. Save contact directly to phone via vCard download ──────────────
    // On mobile browsers this prompts "Add to Contacts" natively.
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contactName}`,
      `TEL;TYPE=CELL:${fullNumber}`,
      'END:VCARD',
    ].join('\n');

    const blob = new Blob([vcard], { type: 'text/vcard' });
    const vcardUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = vcardUrl;
    a.download = `${contactName.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(vcardUrl), 3000);

    // ── 2. Open WhatsApp to that number with the app link ─────────────────
    const waText =
      `📱 *FleetPro – Fleet Management App*\n\n` +
      `Manage your fleet vehicles, fuel logs & documents — right from your phone!\n\n` +
      `🔗 ${APP_URL}\n\n` +
      `_Open the link in Chrome (Android) or Safari (iPhone) → tap Menu → "Add to Home Screen" to install the app._`;

    // Small delay so vCard dialog appears first, then WhatsApp opens
    setTimeout(() => {
      window.open(
        `https://wa.me/${fullNumber.replace('+', '')}?text=${encodeURIComponent(waText)}`,
        '_blank'
      );
    }, 400);

    setSent(true);
  }

  const isValid = phone.length === 10;

  return (
    <>
      <style>{styles}</style>
      <div className="sa-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="sa-sheet">
          <div className="sa-handle" />

          {/* Header */}
          <div className="sa-header">
            <span className="sa-title">Share App</span>
            <button className="sa-close" onClick={onClose}><X size={16} /></button>
          </div>

          {/* Hero */}
          <div className="sa-hero">
            <div className="sa-hero-icon">
              <Smartphone size={26} color="#fff" />
            </div>
            <div className="sa-hero-text">
              <h3>Send FleetPro to anyone</h3>
              <p>Enter their number, tap Share — contact saved &amp; WhatsApp message sent instantly.</p>
            </div>
          </div>

          {/* Body */}
          <div className="sa-body">
            <div className="sa-label">Mobile Number</div>

            {/* Phone input */}
            <div className="sa-input-wrap" onClick={() => inputRef.current?.focus()}>
              <span className="sa-input-prefix">🇮🇳 +91</span>
              <input
                ref={inputRef}
                className="sa-input"
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phone}
                onChange={handlePhone}
                onKeyDown={e => e.key === 'Enter' && isValid && handleShare()}
                autoFocus
              />
              {phone.length > 0 && (
                <button
                  onClick={() => { setPhone(''); setSent(false); inputRef.current?.focus(); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#475569', padding: '8px 10px', flexShrink: 0
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* One-click Share button */}
            <button
              className="sa-share-btn"
              onClick={handleShare}
              disabled={!isValid}
            >
              <span className="sa-share-btn-wa">💬</span>
              {sent ? 'Sent! Tap again to resend' : 'Save Contact & Send WhatsApp'}
              <Share2 size={18} />
            </button>

            {/* Success feedback */}
            {sent && (
              <div className="sa-success">
                <CheckCircle size={20} color="#34D399" className="sa-success-icon" />
                <div className="sa-success-text">
                  <strong>Done in one tap!</strong>
                  <span>
                    ✅ Contact saved to your phone&nbsp;&nbsp;•&nbsp;&nbsp;
                    💬 WhatsApp opened to +91 {phone.slice(0,5)} {phone.slice(5)}
                  </span>
                </div>
              </div>
            )}

            {/* Info note */}
            <div className="sa-note">
              <strong>How it works:</strong> Tapping the button downloads a contact card
              (.vcf) — your phone will ask to save it. WhatsApp then opens automatically
              with the app link pre-filled for that number.
            </div>
          </div>

          <div className="sa-divider" />
          <div className="sa-footer">
            FleetPro • {APP_URL}
          </div>
        </div>
      </div>
    </>
  );
}
