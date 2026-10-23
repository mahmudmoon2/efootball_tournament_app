import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { isDemo } from '../lib/api.js';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) nav('/');
  }, [user, nav]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="panel login-card" onSubmit={submit}>
        <div className="login-icon">
          <Icon name="shield" size={30} />
        </div>
        <h2>Admin login</h2>
        <p className="muted small">Log in to add players, enter scores and control the tournament.</p>
        <label className="field">
          <span>Username or email</span>
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
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="alert error">{error}</div>}
        <button className="btn full big" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        {isDemo && <p className="muted tiny center">Demo login: admin / admin</p>}
      </form>
    </div>
  );
}
