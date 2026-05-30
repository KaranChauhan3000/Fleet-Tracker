import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);
let uid = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = 'info') => {
    const id = ++uid;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const remove = id => setToasts(t => t.filter(x => x.id !== id));

  const cfg = {
    success: { icon: CheckCircle, color: 'var(--green-l)' },
    error:   { icon: XCircle,     color: 'var(--red-l)' },
    info:    { icon: Info,        color: 'var(--blue-l)' },
  };

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div style={{ position:'fixed', bottom:20, right:20, display:'flex', flexDirection:'column', gap:6, zIndex:999 }}>
        {toasts.map(t => {
          const { icon: Icon, color } = cfg[t.type] || cfg.info;
          return (
            <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--bg-card)', border:'1px solid var(--border-2)', borderRadius:8, padding:'9px 12px', boxShadow:'0 8px 32px rgba(0,0,0,0.4)', minWidth:240, maxWidth:340, animation:'fadeIn 0.15s ease' }}>
              <Icon size={14} color={color} strokeWidth={2} style={{ flexShrink:0 }} />
              <p style={{ flex:1, fontSize:13 }}>{t.msg}</p>
              <button onClick={() => remove(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-4)', padding:2, display:'flex' }}>
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
