import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { FORMATS, advance, clone } from '../lib/engine.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Icon from '../components/Icon.jsx';
import { PhotoCtx, useUI } from '../components/ui.jsx';
import Overview from '../components/Overview.jsx';
import Players from '../components/Players.jsx';
import FormatSetup from '../components/FormatSetup.jsx';
import Standings from '../components/Standings.jsx';
import Fixtures from '../components/Fixtures.jsx';
import Bracket from '../components/Bracket.jsx';

const TABS = {
  overview: { label: 'Overview', icon: 'home' },
  players: { label: 'Players', icon: 'users' },
  format: { label: 'Setup', icon: 'sliders' },
  table: { label: 'Table', icon: 'table' },
  fixtures: { label: 'Matches', icon: 'calendar' },
  bracket: { label: 'Bracket', icon: 'bracket' },
};

function tabsFor(t, isAdmin) {
  if (t.status === 'setup') return ['overview', 'players', ...(isAdmin ? ['format'] : [])];
  const tabs = ['overview'];
  if (t.groups.length) tabs.push('table');
  tabs.push('fixtures');
  if (t.bracket) tabs.push('bracket');
  tabs.push('players');
  return tabs;
}

export default function Tournament() {
  const { id } = useParams();
  const nav = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useUI();
  const [t, setT] = useState(null);
  const tRef = useRef(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(null);
  const running = useRef(false);
  const pending = useRef(false);
  const [photos, setPhotos] = useState({});

  useEffect(() => api.subscribePhotos(id, setPhotos), [id]);

  const accept = (d) => {
    tRef.current = d;
    setT(d);
  };

  // Live updates: take any newer version from the server unless we are mid-save.
  useEffect(() => {
    setT(null);
    tRef.current = null;
    return api.subscribeTournament(
      id,
      (d) => {
        if (!d) {
          if (!tRef.current) setError('Tournament not found.');
          return;
        }
        const cur = tRef.current;
        if (!cur || (!running.current && d.version > cur.version)) accept(d);
      },
      (e) => setError(e.message)
    );
  }, [id]);

  const flush = async () => {
    if (running.current) {
      pending.current = true;
      return;
    }
    running.current = true;
    setSaving(true);
    try {
      do {
        pending.current = false;
        const r = await api.save(tRef.current);
        accept({ ...tRef.current, version: r.version, updatedAt: r.updatedAt });
      } while (pending.current);
    } catch (e) {
      toast(e.message);
      try {
        accept(await api.get(id));
      } catch {
        /* keep local copy */
      }
    } finally {
      running.current = false;
      setSaving(false);
    }
  };

  // fn receives a deep copy and returns the next state; progression is recomputed after every change
  const update = (fn) => {
    try {
      accept(advance(fn(clone(tRef.current))));
      flush();
      return true;
    } catch (e) {
      toast(e.message);
      return false;
    }
  };

  const remove = async () => {
    try {
      await api.remove(t.id);
      nav('/');
    } catch (e) {
      toast(e.message);
    }
  };

  if (error)
    return (
      <div className="empty panel">
        {error} <Link to="/">Back to tournaments</Link>
      </div>
    );
  if (!t)
    return (
      <div className="stack">
        <div className="panel skeleton tall" />
        <div className="panel skeleton" />
      </div>
    );

  const tabs = tabsFor(t, isAdmin);
  const active = tabs.includes(tab) ? tab : t.status === 'setup' && isAdmin ? 'players' : 'overview';
  const go = (k) => {
    setTab(k);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PhotoCtx.Provider value={photos}>
    <div className="t-page">
      <div className="t-header">
        <Link to="/" className="back-link">
          <Icon name="back" size={16} /> Tournaments
        </Link>
        <div className="t-title-row">
          <h1>{t.name}</h1>
          {isAdmin && (
            <span className={`save-state ${saving ? 'busy' : ''}`}>
              {saving ? 'Saving…' : (
                <>
                  <Icon name="check" size={14} /> Saved
                </>
              )}
            </span>
          )}
        </div>
        <div className="t-meta">
          <StatusBadge status={t.status} format={t.format} />
          {t.format && <span className="chip">{FORMATS[t.format].name}</span>}
          <span className="chip">
            <Icon name="users" size={13} /> {t.players.length}
          </span>
        </div>
      </div>

      <nav className="tabs" aria-label="Tournament sections">
        {tabs.map((k) => (
          <button key={k} className={`tab ${active === k ? 'active' : ''}`} onClick={() => go(k)}>
            <Icon name={TABS[k].icon} size={19} />
            <span>{TABS[k].label}</span>
          </button>
        ))}
      </nav>

      <div className="t-body" key={active}>
        {active === 'overview' && <Overview t={t} isAdmin={isAdmin} update={update} onDelete={remove} goTab={go} />}
        {active === 'players' && <Players t={t} isAdmin={isAdmin} update={update} />}
        {active === 'format' && <FormatSetup t={t} update={update} onStarted={() => go('overview')} />}
        {active === 'table' && <Standings t={t} />}
        {active === 'fixtures' && <Fixtures t={t} isAdmin={isAdmin} update={update} />}
        {active === 'bracket' && <Bracket t={t} />}
      </div>
    </div>
    </PhotoCtx.Provider>
  );
}
