import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { isDemo } from '../lib/api.js';
import { usePrefs } from '../lib/prefs.jsx';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const { t, tr } = usePrefs();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) nav('/');
  }, [user, nav]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="panel login-card" onSubmit={submit}>
        <div className="login-icon">
          <Icon name="shield" size={30} />
        </div>
        <h2>{t('login.title')}</h2>
        <p className="muted small">{t('login.sub')}</p>
        <label className="field">
          <span>{t('login.user')}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            required
          />
        </label>
        <label className="field">
          <span>{t('login.pass')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="alert error">{tr(error)}</div>}
        <button className="btn full big" disabled={busy}>
          {busy ? t('login.busy') : t('login.submit')}
        </button>
        {isDemo && <p className="muted tiny center">{t('login.demo')}</p>}
      </form>
    </div>
  );
}
