import { useEffect, useState } from 'react';
import { roundLabel, usePrefs } from '../lib/prefs.jsx';
import Icon from './Icon.jsx';

const SHOWN = 6;

const ICONS = {
  score: 'check',
  scoreEdit: 'edit',
  scoreClear: 'x',
  started: 'play',
  koStarted: 'bracket',
  backGroup: 'undo',
  reset: 'reset',
  champion: 'trophy',
  renamed: 'edit',
  style: 'sliders',
  playerAdded: 'plus',
  playersAdded: 'plus',
  playerRemoved: 'trash',
  playerRenamed: 'edit',
};

function timeAgo(iso, now, locale, tx) {
  const secs = Math.round((now - new Date(iso).getTime()) / 1000);
  if (secs < 60) return tx('log.justNow');
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (secs < 3600) return rtf.format(-Math.floor(secs / 60), 'minute');
  if (secs < 86400) return rtf.format(-Math.floor(secs / 3600), 'hour');
  if (secs < 604800) return rtf.format(-Math.floor(secs / 86400), 'day');
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function matchLabel(tx, format, m) {
  if (m.stage === 'ko') return `${roundLabel(tx, m.round, m.rounds)}${m.legs > 1 ? ` · ${tx('leg', { n: m.leg })}` : ''}`;
  if (m.group && m.group !== 'L') return `${tx('group', { id: m.group })} · ${tx('mdShort', { n: m.round })}`;
  return tx(format === 'swiss_knockout' ? 'roundN' : 'matchday', { n: m.round });
}

export default function ActivityLog({ t }) {
  const { t: tx, locale } = usePrefs();
  const [all, setAll] = useState(false);
  const [now, setNow] = useState(Date.now());

  // keep "5 minutes ago" current
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);

  const log = [...(t.log || [])].reverse();
  const items = all ? log : log.slice(0, SHOWN);

  return (
    <div className="panel activity">
      <h3 className="panel-title">
        <Icon name="list" /> {tx('log.title')}
      </h3>
      {log.length === 0 && <div className="muted small">{tx('log.empty')}</div>}
      <ul className="activity-list">
        {items.map((e, i) => (
          <li key={`${e.at}-${i}`} className={`activity-item ${e.type}`}>
            <span className="activity-icon">
              <Icon name={ICONS[e.type] || 'list'} size={14} stroke={2.4} />
            </span>
            <div className="activity-body">
              <span className="activity-text">{tx(`log.${e.type}`, e.vars)}</span>
              <small className="muted">
                {e.match ? `${matchLabel(tx, t.format, e.match)} · ` : ''}
                {timeAgo(e.at, now, locale, tx)}
              </small>
            </div>
          </li>
        ))}
      </ul>
      {log.length > SHOWN && (
        <button className="link-btn small" onClick={() => setAll(!all)}>
          {all ? tx('log.less') : tx('log.more', { n: log.length - SHOWN })}
        </button>
      )}
    </div>
  );
}
