import { createContext, useContext, useState, useCallback, useMemo } from 'react';
const Ctx = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => {
  const show = useContext(Ctx);
  return useMemo(() => {
    if (!show) return null;
    // Callable: toast('msg', 'success')
    const fn = (msg, type = 'info') => show(msg, type);
    // Methods: toast.success('msg'), toast.error('msg'), etc.
    fn.success = (msg) => show(msg, 'success');
    fn.error   = (msg) => show(msg, 'error');
    fn.info    = (msg) => show(msg, 'info');
    fn.warn    = (msg) => show(msg, 'warn');
    fn.warning = (msg) => show(msg, 'warn');
    return fn;
  }, [show]);
};
