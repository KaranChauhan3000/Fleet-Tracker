import { useState, useEffect } from 'react';
import { Download, Share, Plus, Smartphone } from 'lucide-react';

/**
 * InstallPrompt — shown once when the app is opened in a browser (not yet installed).
 *
 * Android/Chrome  → uses the `beforeinstallprompt` event → one-tap install button.
 * iOS/Safari      → no native install API; shows step-by-step guide with Share → "Add to Home Screen".
 * Already installed (standalone) → calls onDone() immediately so nothing shows.
 */
export default function InstallPrompt({ onDone }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // If already running as installed PWA, skip this screen entirely
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      onDone();
      return;
    }

    // Detect iOS (no beforeinstallprompt support)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Android/Chrome: capture the install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // If user installs via the prompt, proceed
    window.addEventListener('appinstalled', () => onDone());

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [onDone]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        onDone();
      }
    } finally {
      setIsInstalling(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: '24px',
      textAlign: 'center',
    }}>

      {/* App icon */}
      <div style={{
        width: 88,
        height: 88,
        borderRadius: 22,
        background: 'linear-gradient(135deg, #C2410C, #F97316)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        boxShadow: '0 12px 32px rgba(249,115,22,0.28)',
      }}>
        <Smartphone size={42} color="#fff" />
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: 28,
        fontWeight: 800,
        color: 'var(--text-primary)',
        margin: '0 0 8px',
        fontFamily: 'var(--font)',
        letterSpacing: '-0.5px',
      }}>
        Fleet Pro
      </h1>

      <p style={{
        fontSize: 15,
        color: 'var(--text-muted)',
        margin: '0 0 40px',
        maxWidth: 280,
        lineHeight: 1.5,
        fontFamily: 'var(--font)',
      }}>
        Install the app on your device for the best experience — fast, reliable, always ready.
      </p>

      {/* Android: one-tap install button */}
      {!isIOS && deferredPrompt && (
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #C2410C, #F97316)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'var(--font)',
            cursor: isInstalling ? 'not-allowed' : 'pointer',
            opacity: isInstalling ? 0.7 : 1,
            boxShadow: '0 6px 20px rgba(249,115,22,0.35)',
            transition: 'opacity 0.2s',
            marginBottom: 16,
            width: '100%',
            maxWidth: 320,
            justifyContent: 'center',
          }}
        >
          <Download size={20} />
          {isInstalling ? 'Installing…' : 'Install Fleet Pro'}
        </button>
      )}

      {/* Android: no prompt yet (already installed or not supported) */}
      {!isIOS && !deferredPrompt && (
        <button
          onClick={onDone}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 32px',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1.5px solid var(--border)',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
            marginBottom: 16,
            width: '100%',
            maxWidth: 320,
            justifyContent: 'center',
          }}
        >
          Open Fleet Pro
        </button>
      )}

      {/* iOS: step-by-step guide */}
      {isIOS && (
        <div style={{ width: '100%', maxWidth: 320 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 16,
            fontFamily: 'var(--font)',
          }}>
            How to install on iPhone / iPad
          </p>

          {[
            { icon: <Share size={18} color="var(--accent)" />, text: <>Tap the <strong>Share</strong> button at the bottom of Safari</> },
            { icon: <Plus size={18} color="var(--accent)" />, text: <>Scroll down and tap <strong>"Add to Home Screen"</strong></> },
            { icon: <Smartphone size={18} color="var(--accent)" />, text: <>Tap <strong>Add</strong> — Fleet Pro will appear on your home screen</> },
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-elevated)',
              borderRadius: 12,
              marginBottom: 10,
              textAlign: 'left',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--accent-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {step.icon}
              </div>
              <p style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.5,
                fontFamily: 'var(--font)',
                paddingTop: 6,
              }}>
                {step.text}
              </p>
            </div>
          ))}

          <button
            onClick={onDone}
            style={{
              marginTop: 8,
              padding: '12px 24px',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none',
              fontSize: 14,
              fontFamily: 'var(--font)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Skip, open in browser
          </button>
        </div>
      )}

      {/* Skip for non-iOS when no prompt */}
      {!isIOS && !deferredPrompt && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'var(--font)' }}>
          Use your browser's menu to add Fleet Pro to your home screen.
        </p>
      )}
    </div>
  );
}
