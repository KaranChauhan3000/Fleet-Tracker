import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Download, Eye, X, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { BASE } from './api';
import { pcGet, pcSet } from './persistCache.js';

// ── Config ────────────────────────────────────────────────────────────────────
const DOC_TYPES = {
  vehicle: [
    { value: 'rc',        label: 'RC Book',         color: '#A78BFA', bg: 'var(--purple-dim)' },
    { value: 'puc',       label: 'PUC Certificate', color: 'var(--success)', bg: 'var(--success-dim)' },
    { value: 'insurance', label: 'Insurance',        color: 'var(--warning)', bg: 'var(--warning-dim)' },
    { value: 'other',     label: 'Other',            color: 'var(--text-muted)', bg: 'var(--bg-elevated)' },
  ],
  user: [
    { value: 'aadhar',  label: 'Aadhar Card',    color: 'var(--accent-light)', bg: 'var(--accent-dim)' },
    { value: 'license', label: 'Driving License', color: 'var(--success)',      bg: 'var(--success-dim)' },
    { value: 'other',   label: 'Other',           color: 'var(--text-muted)',   bg: 'var(--bg-elevated)' },
  ],
};

function getTypeInfo(entityType, docType) {
  return DOC_TYPES[entityType]?.find(t => t.value === docType) || DOC_TYPES[entityType]?.[DOC_TYPES[entityType].length - 1];
}

// ── Fullscreen Viewer ─────────────────────────────────────────────────────────
function DocViewer({ doc, onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.96)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', flexShrink: 0 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{doc.label}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase' }}>{doc.docType}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={doc.url}
            download
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
          >
            <Download size={13} /> Download
          </a>
          <button
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px 24px', overflow: 'hidden' }}>
        {doc.fileType === 'image' ? (
          <img
            src={doc.url}
            alt={doc.label}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
          />
        ) : (
          <iframe
            src={doc.url}
            title={doc.label}
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff' }}
          />
        )}
      </div>

      {/* Hint */}
      <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', paddingBottom: 16 }}>
        Tap outside to close
      </p>
    </div>
  );
}

// ── Upload Sheet ──────────────────────────────────────────────────────────────
function UploadSheet({ entityType, uploadUrl, onClose, onUploaded, toast }) {
  const [docType, setDocType]   = useState(DOC_TYPES[entityType][0].value);
  const [label, setLabel]       = useState('');
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const types = DOC_TYPES[entityType];

  function onFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview('pdf');
    }
    // Auto-set label if empty
    if (!label) {
      const typeInfo = types.find(t => t.value === docType);
      setLabel(typeInfo?.label || f.name.replace(/\.[^.]+$/, ''));
    }
  }

  async function upload() {
    if (!file) { toast('Select a file first', 'error'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('docType', docType);
      fd.append('label', label || types.find(t => t.value === docType)?.label || 'Document');

      const token = localStorage.getItem('fp_admin_token');
      const res = await fetch(`${BASE}${uploadUrl}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Upload failed');
      }
      const data = await res.json();
      toast('Document uploaded!', 'success');
      onUploaded(data.document);
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-title">Upload Document</p>
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Doc type selector */}
          <div className="input-group">
            <label className="input-label">Document Type</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {types.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setDocType(t.value); setLabel(''); }}
                  style={{
                    padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: docType === t.value ? t.bg : 'var(--bg-elevated)',
                    color: docType === t.value ? t.color : 'var(--text-muted)',
                    border: `1px solid ${docType === t.value ? t.color + '44' : 'var(--border)'}`,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div className="input-group">
            <label className="input-label">Label (optional)</label>
            <input
              className="input-field"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={types.find(t => t.value === docType)?.label || 'Document name'}
            />
          </div>

          {/* File picker */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={onFileChange}
          />

          {!file ? (
            <button
              onClick={() => fileRef.current.click()}
              style={{
                border: '2px dashed var(--border)', borderRadius: 12, padding: '28px 16px',
                background: 'var(--bg-elevated)', cursor: 'pointer', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: 10,
              }}
            >
              <Upload size={24} color="var(--accent-light)" />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Tap to select file</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>JPG, PNG or PDF · max 10MB</p>
              </div>
            </button>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
              {preview === 'pdf' ? (
                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, background: 'var(--danger-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={22} color="var(--danger)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{(file.size / 1024).toFixed(0)} KB · PDF</p>
                  </div>
                </div>
              ) : (
                <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
              )}
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={11} /> Ready to upload
                </p>
                <button onClick={() => { setFile(null); setPreview(null); fileRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>
                  Change
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary" onClick={upload} disabled={!file || uploading} style={{ flex: 2 }}>
              {uploading ? <><span className="spinner" /> Uploading...</> : <><Upload size={13} /> Upload</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main DocManager Component ─────────────────────────────────────────────────
// entityType: 'vehicle' | 'user'
// entityId: the vehicle/user MongoDB ID
// uploadUrl: e.g. '/admin/vehicles/:id/documents'
// readOnly: true = only view/download, no upload/delete
export default function DocManager({ entityType = 'vehicle', entityId, toast, readOnly = false }) {
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewing, setViewing]     = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const baseUrl  = entityType === 'vehicle' ? `/admin/vehicles/${entityId}` : `/admin/users/${entityId}`;
  const uploadUrl = `${baseUrl}/documents`;

  useEffect(() => { if (entityId) loadDocs(); }, [entityId]);

  async function loadDocs() {
    const cacheKey = uploadUrl;
    // Show cached instantly
    const cached = pcGet(cacheKey);
    if (cached) {
      setDocs(cached.data?.documents || []);
      setLoading(false);
      // Refresh in background
      const token = localStorage.getItem('fp_admin_token');
      fetch(`${BASE}${uploadUrl}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(data => {
          pcSet(cacheKey, data);
          setDocs(data.documents || []);
        }).catch(() => {});
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('fp_admin_token');
      const res = await fetch(`${BASE}${uploadUrl}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      pcSet(uploadUrl, data);
      setDocs(data.documents || []);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  }

  async function deleteDoc(doc) {
    if (!confirm(`Delete "${doc.label}"? This cannot be undone.`)) return;
    setDeleting(doc._id);
    try {
      const token = localStorage.getItem('fp_admin_token');
      const res = await fetch(`${BASE}${uploadUrl}/${doc._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      setDocs(d => d.filter(x => x._id !== doc._id));
      toast('Document deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setDeleting(null); }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <span className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Upload button */}
      {!readOnly && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowUpload(true)}
          style={{ alignSelf: 'flex-start', gap: 6 }}
        >
          <Upload size={13} /> Upload Document
        </button>
      )}

      {/* Empty state */}
      {docs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
          <FileText size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p style={{ fontSize: 13 }}>No documents yet</p>
          {!readOnly && <p style={{ fontSize: 11, marginTop: 4 }}>Upload RC, PUC, Insurance and more</p>}
        </div>
      )}

      {/* Doc cards */}
      {docs.map(doc => {
        const typeInfo = getTypeInfo(entityType, doc.docType);
        return (
          <div
            key={doc._id}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}
          >
            {/* Preview strip */}
            {doc.fileType === 'image' ? (
              <div
                onClick={() => setViewing(doc)}
                style={{ height: 120, background: 'var(--bg-card)', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
              >
                <img src={doc.url} alt={doc.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)' }} />
                <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 5, padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Eye size={9} /> View
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setViewing(doc)}
                style={{ height: 80, background: 'var(--danger-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 10 }}
              >
                <FileText size={28} color="var(--danger)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>PDF Document — Tap to View</span>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 5, padding: '2px 7px', background: typeInfo?.bg, color: typeInfo?.color, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                {typeInfo?.label || doc.docType}
              </span>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.label}
              </p>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <a
                  href={doc.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textDecoration: 'none' }}
                >
                  <Download size={12} />
                </a>
                {!readOnly && (
                  <button
                    onClick={() => deleteDoc(doc)}
                    disabled={deleting === doc._id}
                    style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    {deleting === doc._id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Trash2 size={12} color="var(--danger)" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Upload sheet */}
      {showUpload && (
        <UploadSheet
          entityType={entityType}
          uploadUrl={uploadUrl}
          onClose={() => setShowUpload(false)}
          onUploaded={doc => setDocs(d => [...d, doc])}
          toast={toast}
        />
      )}

      {/* Fullscreen viewer */}
      {viewing && <DocViewer doc={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
