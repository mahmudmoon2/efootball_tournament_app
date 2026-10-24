import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { newTournament } from '../lib/engine.js';
import { usePrefs } from '../lib/prefs.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import WinnerCard from '../components/WinnerCard.jsx';
import Icon from '../components/Icon.jsx';
import { useUI } from '../components/ui.jsx';

function NotAdmin({ user }) {
  const { toast } = useUI();
  const { t } = usePrefs();
  return (
    <div className="panel alert-panel">
      <h3>
        <Icon name="shield" /> {t('notAdmin.title')}
      </h3>
      <p className="small muted">{t('notAdmin.body')}</p>
      <div className="uid-row">
        <code>{user.uid}</code>
        <button
          className="btn ghost sm"
          onClick={() => {
            navigator.clipboard?.writeText(user.uid);
            toast(t('notAdmin.copied'), 'ok');
          }}
        >
          <Icon name="copy" size={14} /> {t('notAdmin.copy')}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, isAdmin } = useAuth();
  const { t, tr } = usePrefs();
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => api.subscribeList(setList, (e) => setError(tr(e))), [tr]);

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
      const tour = newTournament(name.trim());
      await api.save(tour);
      nav(`/t/${tour.id}`);
    } catch (err) {
      setError(t('home.createFailed', { msg: tr(err) }));
      setBusy(false);
    }
  };

  const live = list?.filter((x) => x.status === 'group' || x.status === 'knockout').length || 0;
  const champions = list?.filter((x) => x.status === 'finished' && x.championId) || [];

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-text">
          <span className="eyebrow">
            <Icon name="bolt" size={14} /> {t('home.eyebrow')}
          </span>
          <h1>
            {t('home.titleBefore')}
            <span className="grad">eFootball</span>
            {t('home.titleAfter')}
          </h1>
          <p className="muted">{t('home.sub')}</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="ball-3d">⚽</div>
          <div className="ball-shadow" />
        </div>
      </section>

      {user && !isAdmin && <NotAdmin user={user} />}

      {isAdmin && (
        <form className="panel create-row" onSubmit={create}>
          <input placeholder={t('home.newPlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={busy || !name.trim()}>
            <Icon name="plus" size={16} /> {busy ? t('home.creating') : t('home.create')}
          </button>
        </form>
      )}

      {error && <div className="alert error">{error}</div>}
      {!list && !error && slow && <div className="alert error">{t('home.unreachable')}</div>}

      {champions.length > 0 && (
        <section className="stack">
          <div className="section-head">
            <h2>🏆 {t('home.hallOfFame')}</h2>
            <span className="muted small">{t('home.finished', { n: champions.length })}</span>
          </div>
          <div className="winners-grid">
            {champions.map((x) => (
              <WinnerCard key={x.id} t={x} />
            ))}
          </div>
        </section>
      )}

      <div className="section-head">
        <h2>{t('home.tournaments')}</h2>
        {list && (
          <span className="muted small">
            {t('home.total', { n: list.length })}
            {live ? t('home.live', { n: live }) : ''}
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
          {t('home.empty')} {isAdmin ? t('home.emptyAdmin') : !user && <Link to="/login">{t('home.emptyLogin')}</Link>}
        </div>
      )}
      <div className="grid">
        {list?.map((x) => (
          <Link key={x.id} to={`/t/${x.id}`} className="panel t-card tilt">
            <div className="t-card-head">
              <span className="t-icon">
                <Icon name={x.champion ? 'trophy' : 'bracket'} size={20} />
              </span>
              <StatusBadge status={x.status} format={x.format} />
            </div>
            <h3>{x.name}</h3>
            <div className="muted small">
              {x.format ? t(`format.${x.format}.short`) : t('home.noStyle')} · {t('home.players', { n: x.players })}
            </div>
            {x.champion && (
              <div className="champ-line">
                <Icon name="trophy" size={15} /> {x.champion}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
