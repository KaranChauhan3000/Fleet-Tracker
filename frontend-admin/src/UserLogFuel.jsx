import { useState, useEffect } from 'react';
import { userApi as api, fmt } from './api.js';
import { useToast } from './Toast.jsx';
import { Fuel, Car, Gauge, IndianRupee, MapPin, FileText, CheckCircle, ChevronLeft } from 'lucide-react';

export default function LogFuel({ user, onBack }) {
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
 const getNow = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now - offset).toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    vehicleId: '',
    litres: '',
    costPerLitre: '',
    totalCost: '',
    odometer: '',
    fuelStation: '',
    notes: '',
    filledAt: getNow(),
  });

  useEffect(() => { loadVehicles(); }, []);

  async function loadVehicles() {
    try {
      const data = await api.get('/user/vehicles');
      setVehicles(data || []);
      if (data?.length === 1) setForm(f => ({ ...f, vehicleId: data[0].id }));
    } catch (err) { toast(err.message, 'error'); }
  }

  function handleChange(k, val) {
    setForm(f => {
      const next = { ...f, [k]: val };
      const l = parseFloat(k === 'litres' ? val : next.litres);
      const r = parseFloat(k === 'costPerLitre' ? val : next.costPerLitre);
      const t = parseFloat(k === 'totalCost' ? val : next.totalCost);
      const hasL = !isNaN(l) && l > 0;
      const hasR = !isNaN(r) && r > 0;
      const hasT = !isNaN(t) && t > 0;

      if (k === 'litres') {
        if (hasL && hasR) next.totalCost = (l * r).toFixed(2);
        else if (hasL && hasT) next.costPerLitre = (t / l).toFixed(4);
      } else if (k === 'costPerLitre') {
        if (hasR && hasL) next.totalCost = (l * r).toFixed(2);
        else if (hasR && hasT) next.litres = (t / r).toFixed(2);
      } else if (k === 'totalCost') {
        if (hasT && hasL) next.costPerLitre = (t / l).toFixed(4);
        else if (hasT && hasR) next.litres = (t / r).toFixed(2);
      }
      return next;
    });
  }

  const displayTotal = parseFloat(form.totalCost) || (form.litres && form.costPerLitre ? parseFloat(form.litres) * parseFloat(form.costPerLitre) : 0);
  const finalLitres = parseFloat(form.litres);
  const finalRate = parseFloat(form.costPerLitre);

  async function submit(e) {
    e.preventDefault();
    if (!form.vehicleId) { toast('Select a vehicle', 'error'); return; }
    if (!form.litres || finalLitres <= 0) { toast('Enter litres', 'error'); return; }
    if (!form.costPerLitre || finalRate <= 0) { toast('Enter cost per litre', 'error'); return; }
    if (!form.odometer || parseFloat(form.odometer) < 0) { toast('Enter odometer reading', 'error'); return; }

    setLoading(true);
    try {
      await api.post('/user/fuel-logs', {
        vehicleId: form.vehicleId,
        litres: finalLitres,
        costPerLitre: finalRate,
        odometer: parseFloat(form.odometer),
        fuelStation: form.fuelStation,
        notes: form.notes,
        filledAt: new Date(form.filledAt).toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      toast(err.message, 'error');
    } finally { setLoading(false); }
  }

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
      <div style={{ width: 72, height: 72, background: 'var(--success-dim)', border: '2px solid var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle size={36} color="var(--success)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Entry Logged!</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 15 }}>
          ₹{fmt(displayTotal, 2)} · {form.litres}L recorded
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 340 }}>
        <button className="btn btn-primary" onClick={() => { setSubmitted(false); setForm(f => ({ ...f, litres: '', costPerLitre: '', totalCost: '', odometer: '', fuelStation: '', notes: '', filledAt: new Date().toISOString().slice(0,16) })); }}>
          <Fuel size={16} /> Log Another Entry
        </button>
        <button className="btn btn-ghost" onClick={onBack}>← Back to Home</button>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper page-enter">
      <div className="page-header">
        <button onClick={onBack} style={{ background: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600 }}>
          <ChevronLeft size={18} /> Back
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: 17, fontWeight: 700 }}>Log Fuel Entry</h1>
        </div>
        <div style={{ width: 60 }} />
      </div>

      <form onSubmit={submit} className="page-content">
        {/* Vehicle selector */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Car size={13} />Vehicle</label>
          <select className="input-field" value={form.vehicleId} onChange={e => handleChange('vehicleId', e.target.value)}>
            <option value="">Select vehicle</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.plateNumber} — {v.make} {v.model} ({v.fuelType})</option>
            ))}
          </select>
        </div>

        {/* Date/Time */}
        <div className="input-group">
          <label className="input-label">Fill Date & Time</label>
          <input className="input-field" type="datetime-local" value={form.filledAt} onChange={e => handleChange('filledAt', e.target.value)} />
        </div>

        {/* Fuel calculation — fill any 2 */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fill any 2 — third auto-calculates</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Fuel size={13} />Litres</label>
            <input className="input-field" type="number" inputMode="decimal" step="0.01" min="0.1" value={form.litres} onChange={e => handleChange('litres', e.target.value)} placeholder="e.g. 35.5" />
          </div>
          <div className="input-group">
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IndianRupee size={13} />Price/Litre</label>
            <input className="input-field" type="number" inputMode="decimal" step="0.01" min="0.01" value={form.costPerLitre} onChange={e => handleChange('costPerLitre', e.target.value)} placeholder="e.g. 94.50" />
          </div>
        </div>

        {/* Total cost — also editable */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IndianRupee size={13} />Total Cost (₹)</label>
          <input className="input-field" type="number" inputMode="decimal" step="0.01" min="0.01" value={form.totalCost} onChange={e => handleChange('totalCost', e.target.value)} placeholder="e.g. 3354.75" />
        </div>

        {/* Total cost preview */}
        {displayTotal > 0 && (
          <div style={{ background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Cost</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>₹{fmt(displayTotal)}</span>
          </div>
        )}

        {/* Odometer */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Gauge size={13} />Odometer Reading (km)</label>
          <input className="input-field" type="number" inputMode="numeric" step="1" min="0" value={form.odometer} onChange={e => handleChange('odometer', e.target.value)} placeholder="Current odometer km" />
        </div>

        {/* Fuel Station */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={13} />Fuel Station <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span></label>
          <input className="input-field" value={form.fuelStation} onChange={e => handleChange('fuelStation', e.target.value)} placeholder="Station name or location" />
        </div>

        {/* Notes */}
        <div className="input-group">
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={13} />Notes <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional)</span></label>
          <textarea className="input-field" rows={2} value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Any notes..." style={{ resize: 'none' }} />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, fontSize: 16, padding: '15px', background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}>
          {loading ? <><div className="spinner" style={{ borderTopColor: '#fff' }} />&nbsp;Saving...</> : <><Fuel size={18} /> Submit Fuel Entry</>}
        </button>
      </form>
    </div>
  );
}
