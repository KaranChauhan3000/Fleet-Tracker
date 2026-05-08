import { useState, useEffect } from 'react';
import { FileText, Download, X, Eye, FolderOpen, ChevronLeft } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const TYPE_INFO = {
  aadhar:   { label: 'Aadhar Card',     color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
  license:  { label: 'Driving License', color: '#34D399', bg: 'rgba(16,185,129,0.12)' },
  other:    { label: 'Document',        color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

// ── Fullscreen viewer (show to authorities) ───────────────────────────────────
function Viewer({ doc, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        // Overscroll lock while viewer is open
        overscrollBehavior: 'none',
      }}
    >
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{doc.label}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {TYPE_INFO[doc.docType]?.label || doc.docType}
          </p>
        </div>
        <a
          href={doc.url}
          download
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}
        >
          <Download size={13} /> Save
        </a>
      </div>

      {/* Document content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12 }}>
        {doc.fileType === 'image' ? (
          <img
            src={doc.url}
            alt={doc.label}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8, userSelect: 'none' }}
            draggable={false}
          />
        ) : (
          <iframe
            src={doc.url}
            title={doc.label}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff' }}
          />
        )}
      </div>

      {/* Hint strip */}
      <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.04)', textAlign: 'center', flexShrink: 0 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Show this screen to the authority · Tap ‹ to go back
        </p>
      </div>
    </div>
  );
}

// ── Document card ─────────────────────────────────────────────────────────────
function DocCard({ doc, onView }) {
  const info = TYPE_INFO[doc.docType] || TYPE_INFO.other;
  return (
    <div
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}
      onClick={onView}
    >
      {/* Preview */}
      {doc.fileType === 'image' ? (
        <div style={{ height: 150, overflow: 'hidden', position: 'relative', background: 'var(--bg-elevated)' }}>
          <img src={doc.url} alt={doc.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={12} color="#fff" />
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>Tap to show</span>
          </div>
        </div>
      ) : (
        <div style={{ height: 100, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <FileText size={30} color="var(--danger)" />
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>PDF</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tap to open</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 5, padding: '2px 7px', background: info.bg, color: info.color, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
          {info.label}
        </span>
        <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.label}
        </p>
        <a
          href={doc.url}
          download
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none' }}
        >
          <Download size={12} color="var(--text-muted)" />
        </a>
      </div>
    </div>
  );
}

// ── Main Documents Screen ─────────────────────────────────────────────────────
export default function Documents({ user }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const token = localStorage.getItem('fp_user_token');
      const res = await fetch(`${API_BASE}/user/my-documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setDocs(data.documents || []);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  }

  return (
    <>
      <div className="page-wrapper page-enter">
        <div className="page-header">
          <div style={{ width: 32, height: 32, background: 'rgba(59,130,246,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen size={16} color="#60A5FA" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800 }}>My Documents</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="page-content">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <span className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : docs.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p className="empty-title">No documents yet</p>
              <p className="empty-desc">Your admin will upload your documents here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Info banner */}
              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={14} color="#60A5FA" />
                <p style={{ fontSize: 12, color: '#93C5FD', fontWeight: 500 }}>
                  Tap any document to view fullscreen — show it to authorities
                </p>
              </div>

              {docs.map(doc => (
                <DocCard key={doc._id} doc={doc} onView={() => setViewing(doc)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {viewing && <Viewer doc={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
