import { Fuel } from 'lucide-react';

/**
 * AppClosed — "Soft close" landing screen.
 *
 * Shown after the user confirms "Yes, close" in the PWA close-confirm
 * dialog. Because PWAs cannot be programmatically closed, we:
 *   1. Mark the session as saved (done by App.jsx before showing this screen)
 *   2. Stop all background work
 *   3. Navigate here so the user sees a clear "the app is closed" state
 *   4. Let the user dismiss the window themselves
 *
 * The "Return to App" button calls onReturn(), which resets App.jsx to
 * the locked / login screen (same as a fresh open).
 */
export default function AppClosed({ onReturn, dark }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: '0 24px 48px',
        background: 'var(--bg-base)',
        textAlign: 'center',
      }}
    >
      {/* App icon */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'linear-gradient(135deg,#C2410C,#F97316)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 32px rgba(249,115,22,0.28)',
          marginBottom: 24,
        }}
      >
        <Fuel size={32} color="#fff" />
      </div>

      {/* Status badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: dark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)',
          border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 999,
          padding: '4px 14px',
          fontSize: 12,
          fontWeight: 600,
          color: '#F97316',
          letterSpacing: '0.04em',
          marginBottom: 20,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#F97316',
            display: 'inline-block',
          }}
        />
        SESSION SAVED
      </div>

      {/* Headline */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--text-primary)',
          margin: '0 0 12px',
          letterSpacing: '-0.5px',
          lineHeight: 1.2,
        }}
      >
        FleetPro is closed.
      </h1>

      {/* Sub-text */}
      <p
        style={{
          fontSize: 15,
          color: 'var(--text-muted)',
          lineHeight: 1.65,
          maxWidth: 280,
          margin: '0 0 36px',
        }}
      >
        Your session has been saved.
        <br />
        You may now <strong style={{ color: 'var(--text-primary)' }}>close this window</strong>,
        or tap below to return to the app.
      </p>

      {/* Close-window hint card */}
      <div
        style={{
          width: '100%',
          maxWidth: 320,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 18,
          }}
        >
          📱
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>
          On Android, press the{' '}
          <strong style={{ color: 'var(--text-primary)' }}>square (recent apps)</strong> button
          and swipe to close.
        </p>
      </div>

      {/* Return to app button */}
      <button
        onClick={onReturn}
        style={{
          width: '100%',
          maxWidth: 320,
          padding: '14px 20px',
          borderRadius: 12,
          border: '1.5px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-primary)',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '-0.1px',
        }}
      >
        Return to App
      </button>
    </div>
  );
}
