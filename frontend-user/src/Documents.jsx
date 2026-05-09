import { useState, useEffect, useRef } from 'react';
import {
  FileText, Download, Eye, FolderOpen, ChevronLeft,
  Upload, Plus, Trash2, Car, User, X, CheckCircle,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const USER_DOC_TYPES = {
  aadhar:  { label: 'Aadhar Card',     color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' },
  license: { label: 'Driving License', color: '#34D399', bg: 'rgba(16,185,129,0.12)' },
  other:   { label: 'Document',        color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

const VEHICLE_DOC_TYPES = {
  rc:        { label: 'RC Book',   color: '#A78BFA', bg: 'rgba(139,92,246,0.12)' },
  puc:       { label: 'PUC',       color: '#34D399', bg: 'rgba(16,185,129,0.12)' },
  insurance: { label: 'Insurance', color: '#FBBF24', bg: 'rgba(245,158,11,0.12)' },
  other:     { label: 'Document',  color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

// ── Fullscreen viewer ─────────────────────────────────────────────
function Viewer({ doc, onClose }) {
  const typeMap = { ...USER_DOC_TYPES, ...VEHICLE_DOC_TYPES };
  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'#000',display:'flex',flexDirection:'column',overscrollBehavior:'none' }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,padding:'14px 16px',background:'rgba(255,255,255,0.05)',flexShrink:0 }}>
        <button onClick={onClose} style={{ width:36,height:36,borderRadius:8,background:'rgba(255,255,255,0.1)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:700,fontSize:14,color:'#fff' }}>{doc.label}</p>
          <p style={{ fontSize:11,color:'rgba(255,255,255,0.45)',marginTop:1,textTransform:'uppercase',letterSpacing:'0.05em' }}>
            {typeMap[doc.docType]?.label || doc.docType}
          </p>
        </div>
        <a href={doc.url} download target="_blank" rel="noreferrer"
          style={{ display:'flex',alignItems:'center',gap:5,padding:'8px 12px',borderRadius:8,background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:12,fontWeight:700,textDecoration:'none',flexShrink:0 }}>
          <Download size={13} /> Save
        </a>
      </div>
      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',padding:12 }}>
        {doc.fileType === 'image'
          ? <img src={doc.url} alt={doc.label} style={{ maxWidth:'100%',maxHeight:'100%',objectFit:'contain',borderRadius:8,userSelect:'none' }} draggable={false} />
          : <iframe src={doc.url} title={doc.label} style={{ width:'100%',height:'100%',border:'none',borderRadius:8,background:'#fff' }} />
        }
      </div>
      <div style={{ padding:'10px 16px',background:'rgba(255,255,255,0.04)',textAlign:'center',flexShrink:0 }}>
        <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)' }}>Show this screen to the authority · Tap ‹ to go back</p>
      </div>
    </div>
  );
}

// ── Doc card ──────────────────────────────────────────────────────
function DocCard({ doc, typeMap, onView, onDelete, canDelete }) {
  const info = typeMap[doc.docType] || typeMap.other;
  return (
    <div style={{ background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden' }}>
      <div style={{ cursor:'pointer' }} onClick={onView}>
        {doc.fileType === 'image' ? (
          <div style={{ height:130,overflow:'hidden',position:'relative',background:'var(--bg-elevated)' }}>
            <img src={doc.url} alt={doc.label} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
            <div style={{ position:'absolute',inset:0,background:'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
            <div style={{ position:'absolute',bottom:10,left:12,display:'flex',alignItems:'center',gap:6 }}>
              <Eye size={12} color="#fff" />
              <span style={{ fontSize:11,color:'#fff',fontWeight:700 }}>Tap to show</span>
            </div>
          </div>
        ) : (
          <div style={{ height:80,background:'rgba(239,68,68,0.08)',display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
            <FileText size={26} color="var(--danger)" />
            <div>
              <p style={{ fontSize:12,fontWeight:700,color:'var(--danger)' }}>PDF</p>
              <p style={{ fontSize:10,color:'var(--text-muted)' }}>Tap to open</p>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding:'10px 12px',display:'flex',alignItems:'center',gap:8 }}>
        <span style={{ fontSize:10,fontWeight:800,borderRadius:5,padding:'2px 7px',background:info.bg,color:info.color,textTransform:'uppercase',letterSpacing:'0.04em',flexShrink:0 }}>
          {info.label}
        </span>
        <p style={{ flex:1,fontSize:12,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
          {doc.label}
        </p>
        <a href={doc.url} download target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          style={{ width:30,height:30,borderRadius:7,background:'var(--bg-elevated)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,textDecoration:'none' }}>
          <Download size={12} color="var(--text-muted)" />
        </a>
        {canDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ width:30,height:30,borderRadius:7,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer' }}>
            <Trash2 size={12} color="var(--danger)" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Upload modal ──────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }) {
  const [docType, setDocType] = useState('aadhar');
  const [label,   setLabel]   = useState('');
  const [file,    setFile]    = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');
  const fileRef = useRef();

  const docTypeOptions = [
    { value:'aadhar',  label:'Aadhar Card' },
    { value:'license', label:'DL' },
    { value:'other',   label:'Other' },
  ];

  async function handleSubmit() {
    if (!file)         { setError('Please select a file'); return; }
    if (!label.trim()) { setError('Please enter a document name'); return; }
    setBusy(true); setError('');
    try {
      const token = localStorage.getItem('fp_user_token');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('docType', docType);
      fd.append('label', label.trim());
      const res = await fetch(`${API_BASE}/user/my-documents`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      onUploaded(data.document);
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ position:'fixed',inset:0,zIndex:8888,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div style={{ width:'100%',maxWidth:480,background:'var(--bg-card)',borderRadius:'20px 20px 0 0',padding:'20px 20px 36px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
          <p style={{ fontSize:16,fontWeight:800 }}>Upload Document</p>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:'var(--bg-elevated)',border:'1px solid var(--border)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <X size={14} color="var(--text-muted)" />
          </button>
        </div>

        <p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:8 }}>DOCUMENT TYPE</p>
        <div style={{ display:'flex',gap:8,marginBottom:14 }}>
          {docTypeOptions.map(opt => (
            <button key={opt.value} onClick={() => setDocType(opt.value)}
              style={{ flex:1,padding:'9px 4px',borderRadius:10,fontSize:11,fontWeight:700,cursor:'pointer',
                border: docType===opt.value ? '2px solid #3B82F6' : '1px solid var(--border)',
                background: docType===opt.value ? 'rgba(59,130,246,0.12)' : 'var(--bg-elevated)',
                color: docType===opt.value ? '#60A5FA' : 'var(--text-muted)' }}>
              {opt.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:8 }}>DOCUMENT NAME</p>
        <input value={label} onChange={e => setLabel(e.target.value)}
          placeholder={docType==='aadhar' ? 'e.g. My Aadhar' : docType==='license' ? 'e.g. DL 2028' : 'e.g. NOC Letter'}
          style={{ width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid var(--border)',background:'var(--bg-elevated)',color:'var(--text-primary)',fontSize:13,marginBottom:14,boxSizing:'border-box' }}
        />

        <input type="file" ref={fileRef} accept="image/*,application/pdf" style={{ display:'none' }}
          onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }} />
        <button onClick={() => fileRef.current?.click()}
          style={{ width:'100%',padding:14,borderRadius:12,border:'2px dashed var(--border)',background: file ? 'rgba(16,185,129,0.06)' : 'var(--bg-elevated)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:14 }}>
          {file
            ? <><CheckCircle size={16} color="#34D399" /><span style={{ fontSize:12,fontWeight:700,color:'#34D399' }}>{file.name}</span></>
            : <><Upload size={16} color="var(--text-muted)" /><span style={{ fontSize:12,fontWeight:600,color:'var(--text-muted)' }}>Tap to choose image or PDF</span></>
          }
        </button>

        {error && <p style={{ fontSize:12,color:'var(--danger)',marginBottom:10,textAlign:'center' }}>{error}</p>}

        <button onClick={handleSubmit} disabled={busy}
          style={{ width:'100%',padding:14,borderRadius:12,background: busy ? 'var(--bg-elevated)' : 'linear-gradient(135deg,#1E40AF,#3B82F6)',border:'none',color:'#fff',fontSize:14,fontWeight:800,cursor: busy ? 'not-allowed' : 'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
          {busy
            ? <><span className="spinner" style={{ width:16,height:16,borderWidth:2,borderTopColor:'#fff' }} /> Uploading…</>
            : <><Upload size={15} /> Upload Document</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Main Documents Screen ─────────────────────────────────────────
export default function Documents() {
  const [tab,           setTab]           = useState('my');
  const [myDocs,        setMyDocs]        = useState([]);
  const [vehicles,      setVehicles]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [viewing,       setViewing]       = useState(null);
  const [showUpload,    setShowUpload]    = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const token = localStorage.getItem('fp_user_token');
    const h = { Authorization:`Bearer ${token}` };
    try {
      const [myRes, vRes] = await Promise.all([
        fetch(`${API_BASE}/user/my-documents`,     { headers:h }),
        fetch(`${API_BASE}/user/vehicle-documents`, { headers:h }),
      ]);
      const [myData, vData] = await Promise.all([myRes.json(), vRes.json()]);
      setMyDocs(myData.documents || []);
      setVehicles(vData.vehicles  || []);
    } catch { setMyDocs([]); setVehicles([]); }
    finally { setLoading(false); }
  }

  async function handleDelete(docId) {
    const token = localStorage.getItem('fp_user_token');
    try {
      const res = await fetch(`${API_BASE}/user/my-documents/${docId}`, {
        method:'DELETE',
        headers:{ Authorization:`Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setMyDocs(prev => prev.filter(d => d._id !== docId));
    } catch { alert('Failed to delete document'); }
    setDeleteConfirm(null);
  }

  const totalVehicleDocs = vehicles.reduce((s, v) => s + (v.documents?.length || 0), 0);

  return (
    <>
      <div className="page-wrapper page-enter">
        {/* Header */}
        <div className="page-header">
          <div style={{ width:32,height:32,background:'rgba(59,130,246,0.12)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center' }}>
            <FolderOpen size={16} color="#60A5FA" />
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:15,fontWeight:800 }}>Documents</p>
            <p style={{ fontSize:11,color:'var(--text-muted)' }}>
              {myDocs.length} personal · {totalVehicleDocs} vehicle
            </p>
          </div>
          {tab === 'my' && (
            <button onClick={() => setShowUpload(true)}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'linear-gradient(135deg,#1E40AF,#3B82F6)',border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer' }}>
              <Plus size={13} /> Upload
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex',gap:8,padding:'0 16px',marginBottom:4 }}>
          {[
            { key:'my',      icon:<User size={13} />, label:'My Docs' },
            { key:'vehicle', icon:<Car  size={13} />, label:'Vehicle Docs' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'9px 0',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',
                border: tab===t.key ? '2px solid #3B82F6' : '1px solid var(--border)',
                background: tab===t.key ? 'rgba(59,130,246,0.10)' : 'var(--bg-elevated)',
                color: tab===t.key ? '#60A5FA' : 'var(--text-muted)' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="page-content">
          {loading ? (
            <div style={{ display:'flex',justifyContent:'center',padding:48 }}>
              <span className="spinner" style={{ width:28,height:28 }} />
            </div>
          ) : tab === 'my' ? (
            myDocs.length === 0 ? (
              <div className="empty-state">
                <FolderOpen size={40} style={{ color:'var(--text-muted)',opacity:0.3 }} />
                <p className="empty-title">No documents yet</p>
                <p className="empty-desc">Upload your Aadhar, driving license, or any document you need to carry</p>
                <button onClick={() => setShowUpload(true)}
                  style={{ marginTop:16,display:'flex',alignItems:'center',gap:6,padding:'10px 18px',borderRadius:10,background:'linear-gradient(135deg,#1E40AF,#3B82F6)',border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer' }}>
                  <Plus size={14} /> Upload First Document
                </button>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                <div style={{ background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:10,padding:'10px 13px',display:'flex',alignItems:'center',gap:8 }}>
                  <Eye size={14} color="#60A5FA" />
                  <p style={{ fontSize:12,color:'#93C5FD',fontWeight:500 }}>Tap any document to view fullscreen — show it to authorities</p>
                </div>
                {myDocs.map(doc => (
                  <DocCard key={doc._id} doc={doc} typeMap={USER_DOC_TYPES}
                    onView={() => setViewing(doc)}
                    onDelete={() => setDeleteConfirm(doc._id)}
                    canDelete />
                ))}
              </div>
            )
          ) : (
            vehicles.length === 0 ? (
              <div className="empty-state">
                <Car size={40} style={{ color:'var(--text-muted)',opacity:0.3 }} />
                <p className="empty-title">No vehicles assigned</p>
                <p className="empty-desc">Vehicle documents will appear here once a vehicle is assigned to you</p>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
                {vehicles.map(vehicle => (
                  <div key={vehicle.id}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:10 }}>
                      <div style={{ width:34,height:34,borderRadius:8,background:'rgba(139,92,246,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        <Car size={16} color="#A78BFA" />
                      </div>
                      <div>
                        <p style={{ fontSize:13,fontWeight:800 }}>{vehicle.plateNumber}</p>
                        <p style={{ fontSize:11,color:'var(--text-muted)' }}>{vehicle.make} {vehicle.model}</p>
                      </div>
                      <span style={{ marginLeft:'auto',fontSize:11,color:'var(--text-muted)',fontWeight:600 }}>
                        {vehicle.documents?.length || 0} doc{(vehicle.documents?.length || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {!vehicle.documents?.length ? (
                      <div style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:10,padding:16,textAlign:'center' }}>
                        <p style={{ fontSize:12,color:'var(--text-muted)' }}>No documents uploaded by admin yet</p>
                      </div>
                    ) : (
                      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                        {vehicle.documents.map(doc => (
                          <DocCard key={doc._id} doc={doc} typeMap={VEHICLE_DOC_TYPES}
                            onView={() => setViewing(doc)} canDelete={false} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {viewing      && <Viewer doc={viewing} onClose={() => setViewing(null)} />}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={doc => { setMyDocs(prev => [...prev, doc]); setShowUpload(false); }}
        />
      )}

      {deleteConfirm && (
        <div style={{ position:'fixed',inset:0,zIndex:9000,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
          <div style={{ background:'var(--bg-card)',borderRadius:16,padding:24,width:'100%',maxWidth:320 }}>
            <p style={{ fontSize:15,fontWeight:800,marginBottom:8 }}>Delete Document?</p>
            <p style={{ fontSize:13,color:'var(--text-muted)',marginBottom:20 }}>This will permanently remove the document.</p>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex:1,padding:12,borderRadius:10,border:'1px solid var(--border)',background:'var(--bg-elevated)',color:'var(--text-primary)',fontSize:13,fontWeight:700,cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                style={{ flex:1,padding:12,borderRadius:10,border:'none',background:'var(--danger)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
