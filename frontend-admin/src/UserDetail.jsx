import { useState, useEffect } from 'react';
import { api, fmtDate, fmtRs, fmt } from './api.js';
import { useToast } from './Toast.jsx';
import DocManager from './DocManager.jsx';
import {
  ArrowLeft, User, Phone, Hash, Car, Fuel, FileText, Wrench,
  TrendingUp, Gauge, MapPin, AlertTriangle, CheckCircle, Clock,
  ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ icon, title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
      >
        <div style={{ width: 28, height: 28, background: 'var(--accent-dim)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <p style={{ fontWeight: 700, fontSize: 14, flex: 1, textAlign: 'left' }}>{title}</p>
        {count != null && (
          <span style={{ fontSize: 11, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>
            {count}
          </span>
        )}
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function StatPill({ icon, label, value }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-light)' }}>{icon}</div>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{value ?? '—'}</p>
      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

function EmptyRow({ label }) {
  return (
    <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>{label}</p>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserDetail({ userId, onBack }) {
  const toast = useToast();

  const [user, setUser] = useState(null);
  const [fuelData, setFuelData] = useState(null);       // { logs, stats }
  const [challans, setChallans] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadAll();
  }, [userId]);

  async function loadAll() {
    setLoading(true);
    try {
      // 1. Fetch user details via user list (filter by search not ideal, use direct endpoint if available)
      //    Most backends expose GET /admin/users/:id — fall back to list search if not.
      let userData = null;
      try {
        const r = await api.get(`/admin/users/${userId}`);
        userData = r.data ?? r;
      } catch {
        // Fallback: search users and find match
        const r = await api.get(`/admin/users?page=1&limit=200`);
        userData = (r.data || []).find(u => u.id === userId || u.id === String(userId));
      }
      setUser(userData);

      // 2. Fuel logs (existing endpoint)
      const fuelRes = await api.get(`/admin/users/${userId}/fuel-logs?limit=50`);
      setFuelData({ logs: fuelRes.logs || [], stats: fuelRes.stats || null });

      // 3. Services for this user
      const svcRes = await api.get(`/admin/service-logs?userId=${userId}&limit=50`);
      setServices(svcRes.data || svcRes.logs || []);

      // 4. Challans for each assigned vehicle
      if (userData?.assignedVehicles?.length) {
        const challanPromises = userData.assignedVehicles.map(v =>
          api.get(`/admin/challans?vehicleId=${v.id}&limit=50`).then(r => r.data || r.challans || []).catch(() => [])
        );
        const arrays = await Promise.all(challanPromises);
        // Flatten + deduplicate by id
        const seen = new Set();
        const all = arrays.flat().filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
        // Sort newest first
        all.sort((a, b) => new Date(b.issuedAt || b.createdAt) - new Date(a.issuedAt || a.createdAt));
        setChallans(all);
      } else {
        setChallans([]);
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-wrapper page-enter" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto', padding: '8px 12px' }} onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 48 }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-wrapper page-enter">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto', padding: '8px 12px' }} onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
        <div className="empty-state">
          <User size={36} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="empty-title">User not found</p>
        </div>
      </div>
    );
  }

  const fuelStats = fuelData?.stats;
  const fuelLogs  = fuelData?.logs || [];
  const totalChallanAmount = challans.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="page-wrapper page-enter">
      {/* Header */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: 'auto', padding: '8px 12px' }}
          onClick={onBack}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 12 }}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="page-content" style={{ gap: 12 }}>

        {/* ── User Info Card ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: user.isActive ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 22,
              color: user.isActive ? 'var(--accent-light)' : 'var(--text-muted)',
              flexShrink: 0,
            }}>
              {user.name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 800, fontSize: 17 }}>{user.name}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Hash size={11} />{user.employeeId}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={11} />{user.phone}
                </span>
              </div>
              {user.licenseNumber && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>DL: {user.licenseNumber}</p>
              )}
            </div>
          </div>

          {/* Overall fuel stats summary */}
          {fuelStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
              <StatPill icon={<Fuel size={12} />} label="Total Fills" value={fuelStats.totalFills} />
              <StatPill icon={<TrendingUp size={12} />} label="Total Spent" value={fmtRs(fuelStats.totalCost)} />
              <StatPill icon={<Gauge size={12} />} label="KM Driven" value={fuelStats.totalKm ? `${fmt(fuelStats.totalKm, 0)} km` : null} />
              <StatPill icon={<MapPin size={12} />} label="Last Odo" value={fuelStats.lastOdometer ? `${fmt(fuelStats.lastOdometer, 0)} km` : null} />
            </div>
          )}
        </div>

        {/* ── Assigned Vehicles ── */}
        <Section icon={<Car size={13} color="var(--accent-light)" />} title="Assigned Vehicles" count={user.assignedVehicles?.length ?? 0}>
          {!user.assignedVehicles?.length ? (
            <EmptyRow label="No vehicles assigned" />
          ) : user.assignedVehicles.map(v => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, background: 'var(--accent-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Car size={16} color="var(--accent-light)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 14 }}>{v.plateNumber}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{v.make} {v.model} · {v.fuelType}</p>
              </div>
            </div>
          ))}
        </Section>

        {/* ── Fuel Logs ── */}
        <Section icon={<Fuel size={13} color="var(--accent-light)" />} title="Fuel Logs" count={fuelLogs.length}>
          {fuelLogs.length === 0 ? (
            <EmptyRow label="No fuel logs yet" />
          ) : fuelLogs.map(log => (
            <div key={log.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#A78BFA', background: 'var(--purple-dim)', borderRadius: 4, padding: '1px 5px' }}>
                    {log.vehiclePlate || '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(log.filledAt)}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.litres}L · ₹{log.costPerLitre}/L</span>
                  {log.kmDriven && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.kmDriven} km</span>}
                  {log.efficiency && <span style={{ fontSize: 11, color: 'var(--success)' }}>{fmt(log.efficiency, 1)} km/L</span>}
                  {log.fuelStation && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.fuelStation}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700 }}>{fmtRs(log.totalCost)}</p>
                {log.odometer && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(log.odometer, 0)} km</p>}
              </div>
            </div>
          ))}
        </Section>

        {/* ── Challans ── */}
        <Section
          icon={<FileText size={13} color="var(--accent-light)" />}
          title="Challans"
          count={challans.length}
          defaultOpen={challans.length > 0}
        >
          {challans.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Challans</p>
                <p style={{ fontSize: 15, fontWeight: 800 }}>{challans.length}</p>
              </div>
              <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Amount</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--danger)' }}>{fmtRs(totalChallanAmount)}</p>
              </div>
            </div>
          )}
          {challans.length === 0 ? (
            <EmptyRow label="No challans on assigned vehicles" />
          ) : challans.map(c => (
            <div key={c.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#A78BFA', background: 'var(--purple-dim)', borderRadius: 4, padding: '1px 5px' }}>
                    {c.vehiclePlate || c.vehicle?.plateNumber || '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(c.issuedAt)}</span>
                  {c.status && (
                    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 6px',
                      background: c.status === 'paid' ? 'var(--success-dim)' : 'var(--danger-dim)',
                      color: c.status === 'paid' ? 'var(--success)' : 'var(--danger)',
                    }}>{c.status}</span>
                  )}
                </div>
                {c.violationType && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.violationType}</p>}
                {c.location && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.location}</p>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>{fmtRs(c.amount)}</p>
              </div>
            </div>
          ))}
        </Section>

        {/* ── Documents ── */}
        <Section
          icon={<FileText size={13} color="var(--accent-light)" />}
          title="Documents"
          defaultOpen={false}
        >
          <DocManager
            entityType="user"
            entityId={userId}
            toast={toast}
          />
        </Section>

        {/* ── Services ── */}
        <Section
          icon={<Wrench size={13} color="var(--accent-light)" />}
          title="Services"
          count={services.length}
          defaultOpen={false}
        >
          {services.length === 0 ? (
            <EmptyRow label="No service records yet" />
          ) : services.map(s => (
            <div key={s.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#A78BFA', background: 'var(--purple-dim)', borderRadius: 4, padding: '1px 5px' }}>
                    {s.vehiclePlate || s.vehicle?.plateNumber || '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(s.servicedAt)}</span>
                  {s.nextServiceDate && (() => {
                    const diff = Math.round((new Date(s.nextServiceDate) - new Date()) / 86400000);
                    const overdue = diff < 0;
                    return (
                      <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 6px', display: 'flex', alignItems: 'center', gap: 3,
                        background: overdue ? 'var(--danger-dim)' : diff <= 7 ? 'var(--warning-dim)' : 'var(--success-dim)',
                        color: overdue ? 'var(--danger)' : diff <= 7 ? 'var(--warning)' : 'var(--success)',
                      }}>
                        {overdue ? <AlertTriangle size={9} /> : diff <= 7 ? <Clock size={9} /> : <CheckCircle size={9} />}
                        Next: {fmtDate(s.nextServiceDate)}
                      </span>
                    );
                  })()}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.serviceType}</p>
                {s.notes && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.notes}</p>}
                {s.odometer && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmt(s.odometer, 0)} km</p>}
              </div>
              {s.cost != null && (
                <p style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{fmtRs(s.cost)}</p>
              )}
            </div>
          ))}
        </Section>

      </div>
    </div>
  );
}
