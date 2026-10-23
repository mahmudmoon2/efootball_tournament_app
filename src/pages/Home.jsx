import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { FORMATS, newTournament } from '../lib/engine.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Icon from '../components/Icon.jsx';
import { useUI } from '../components/ui.jsx';

function NotAdmin({ user }) {
  const { toast } = useUI();
  return (
    <div className="panel alert-panel">
      <h3>
        <Icon name="shield" /> Your account is not an admin yet
      </h3>
      <p className="small muted">
        In the Firebase console, open <b>Firestore Database</b>, create a collection called <code>admins</code> and add a
        document whose <b>Document ID</b> is your UID below (no fields needed). Then reload this page.
      </p>
      <div className="uid-row">
        <code>{user.uid}</code>
        <button
          className="btn ghost sm"
          onClick={() => {
            navigator.clipboard?.writeText(user.uid);
            toast('UID copied', 'ok');
          }}
        >
          <Icon name="copy" size={14} /> Copy
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const [slow, setSlow] = useState(false);

  useEffect(() => api.subscribeList(setList, (e) => setError(e.message)), []);

  // Firestore retries silently when the database is missing or offline, so tell the user after a while
  useEffect(() => {
    if (list) return undefined;
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [list]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const t = newTournament(name.trim());
      await api.save(t);
      nav(`/t/${t.id}`);
    } catch (err) {
      setError(`Could not create the tournament: ${err.message}`);
      setBusy(false);
    }
  };

  const live = list?.filter((t) => t.status === 'group' || t.status === 'knockout').length || 0;

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">
            <Icon name="bolt" size={14} /> Live tournament manager
          </span>
          <h1>
            Run your <span className="grad">eFootball</span> tournaments like a pro
          </h1>
          <p className="muted">League, Knockout, World Cup or Champions League style. Live tables, brackets and scores.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="ball-3d">⚽</div>
          <div className="ball-shadow" />
        </div>
      </section>

      {user && !isAdmin && <NotAdmin user={user} />}

      {isAdmin && (
        <form className="panel create-row" onSubmit={create}>
          <input placeholder="New tournament name, e.g. Friday Night Cup" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={busy || !name.trim()}>
            <Icon name="plus" size={16} /> {busy ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {error && <div className="alert error">{error}</div>}
      {!list && !error && slow && (
        <div className="alert error">
          Cannot reach the database. Check your internet connection, and make sure the Firestore database has been
          created in the Firebase console (Build → Firestore Database → Create database).
        </div>
      )}

      <div className="section-head">
        <h2>Tournaments</h2>
        {list && (
          <span className="muted small">
            {list.length} total{live ? ` · ${live} live` : ''}
          </span>
        )}
      </div>

      {!list && !error && (
        <div className="grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel skeleton" />
          ))}
        </div>
      )}
      {list && list.length === 0 && (
        <div className="empty panel">
          <div className="empty-icon">🏟️</div>
          No tournaments yet.{' '}
          {isAdmin ? 'Create your first one above.' : !user && <Link to="/login">Log in to create one.</Link>}
        </div>
      )}
      <div className="grid">
        {list?.map((t) => (
          <Link key={t.id} to={`/t/${t.id}`} className="panel t-card tilt">
            <div className="t-card-head">
              <span className="t-icon">
                <Icon name={t.champion ? 'trophy' : 'bracket'} size={20} />
              </span>
              <StatusBadge status={t.status} format={t.format} />
            </div>
            <h3>{t.name}</h3>
            <div className="muted small">
              {t.format ? FORMATS[t.format]?.short : 'Style not chosen'} · {t.players} players
            </div>
            {t.champion && (
              <div className="champ-line">
                <Icon name="trophy" size={15} /> {t.champion}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
