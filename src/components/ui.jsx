import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePrefs } from '../lib/prefs.jsx';

const UICtx = createContext(null);

export function UIProvider({ children }) {
  const { t, tr } = usePrefs();
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);

  // msg may be plain text, a { key, vars } message or an error with a key
  const toast = useCallback(
    (msg, kind = 'error') => {
      const id = Math.random();
      const text = tr(msg);
      setToasts((list) => [...list, { id, msg: text, kind }]);
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 3800);
    },
    [tr]
  );

  const close = (value) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => e.key === 'Escape' && close(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <UICtx.Provider value={{ confirm, toast }}>
      {children}
      {dialog && (
        <div className="modal-back" onClick={() => close(false)}>
          <div className="modal panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{dialog.title || t('areYouSure')}</h3>
            {dialog.message && <p className="muted">{dialog.message}</p>}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => close(false)}>
                {dialog.cancelText || t('cancel')}
              </button>
              <button className={`btn ${dialog.danger ? 'danger' : ''}`} onClick={() => close(true)} autoFocus>
                {dialog.confirmText || t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </UICtx.Provider>
  );
}

export const useUI = () => useContext(UICtx);

// Player photos of the tournament being viewed: { [playerId]: dataUrl }
export const PhotoCtx = createContext({});

const AVATAR_HUES = [152, 199, 262, 330, 28, 48, 180, 290];
export function Avatar({ name = '?', size = 34, id, src }) {
  const photos = useContext(PhotoCtx);
  const photo = src || (id && photos[id]);
  if (photo) return <img className="avatar photo" src={photo} alt={name} style={{ width: size, height: size }} />;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = AVATAR_HUES[h % AVATAR_HUES.length];
  return (
    <span className="avatar" style={{ '--hue': hue, width: size, height: size, fontSize: size * 0.38 }}>
      {initials || '?'}
    </span>
  );
}
