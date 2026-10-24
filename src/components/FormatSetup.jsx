import { FORMATS, startTournament, validateStart } from '../lib/engine.js';
import { suggestFormats } from '../lib/suggest.js';
import { usePrefs } from '../lib/prefs.jsx';
import Icon from './Icon.jsx';
import { useUI } from './ui.jsx';

const FORMAT_ICON = {
  league: 'table',
  league_playoff: 'list',
  knockout: 'bracket',
  groups_knockout: 'users',
  swiss_knockout: 'trophy',
};

function NumField({ label, value, onChange, min = 1, max = 64, hint }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="field">
      <span>{label}</span>
      <div className="stepper">
        <button type="button" onClick={() => set(value - 1)} aria-label={`${label} −`}>
          −
        </button>
        <input type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value) || min)} aria-label={label} />
        <button type="button" onClick={() => set(value + 1)} aria-label={`${label} +`}>
          +
        </button>
      </div>
      {hint && <small className="muted">{hint}</small>}
    </div>
  );
}

function LegsField({ label, value, onChange }) {
  const { t: tx } = usePrefs();
  return (
    <div className="field">
      <span>{label}</span>
      <div className="seg full">
        <button type="button" className={value === 1 ? 'active' : ''} onClick={() => onChange(1)}>
          {tx('fs.single')}
        </button>
        <button type="button" className={value === 2 ? 'active' : ''} onClick={() => onChange(2)}>
          {tx('fs.homeAway')}
        </button>
      </div>
    </div>
  );
}

export default function FormatSetup({ t, update, onStarted }) {
  const { confirm } = useUI();
  const { t: tx, tr } = usePrefs();
  const n = t.players.length;
  const suggestions = suggestFormats(n);
  const c = t.config;
  const top = suggestions[0];

  const setCfg = (patch) =>
    update((d) => {
      d.config = { ...d.config, ...patch };
      return d;
    });

  const choose = (format, config = {}) =>
    update((d) => {
      d.format = format;
      d.config = { ...d.config, ...config };
      return d;
    });

  const start = async () => {
    const ok = await confirm({ title: tx('fs.startTitle'), message: tx('fs.startMsg'), confirmText: tx('fs.startBtn') });
    if (ok && update((d) => startTournament(d))) onStarted();
  };

  const err = validateStart(t);
  const hasKo = ['league_playoff', 'knockout', 'groups_knockout', 'swiss_knockout'].includes(t.format);
  const hasLeague = ['league', 'league_playoff', 'groups_knockout'].includes(t.format);

  return (
    <div className="stack">
      <div className="panel">
        <h3 className="panel-title">
          <Icon name="sparkle" /> {tx('fs.smart')} <span className="count">{tx('fs.nPlayers', { n })}</span>
        </h3>
        {n < 2 && <div className="muted small">{tx('fs.needPlayers')}</div>}
        <div className="suggest-list">
          {suggestions.slice(0, 3).map((s, i) => (
            <div key={s.format} className={`suggest ${t.format === s.format ? 'selected' : ''} ${i === 0 ? 'best' : ''}`}>
              <div className="suggest-head">
                <span className="f-icon">
                  <Icon name={FORMAT_ICON[s.format]} size={18} />
                </span>
                <b>{tx(`format.${s.format}.name`)}</b>
              </div>
              <div className="meter">
                <div style={{ width: `${s.score}%` }} />
              </div>
              <div className="meter-label">
                <span>{i === 0 ? tx('fs.best') : tx('fs.good')}</span>
                <b>{s.score}%</b>
              </div>
              <p className="small">{tr(s.reason)}</p>
              <div className="suggest-foot">
                <span className="muted small">{tx('fs.approx', { n: s.matches })}</span>
                <button className={`btn sm ${t.format === s.format ? 'ghost' : ''}`} onClick={() => choose(s.format, s.config)}>
                  {t.format === s.format ? (
                    <>
                      <Icon name="check" size={14} /> {tx('fs.selected')}
                    </>
                  ) : (
                    tx('fs.use')
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">
          <Icon name="trophy" /> {tx('fs.all')}
        </h3>
        <div className="format-grid">
          {Object.keys(FORMATS).map((key) => {
            const s = suggestions.find((x) => x.format === key);
            return (
              <button
                key={key}
                className={`format-opt ${t.format === key ? 'selected' : ''}`}
                onClick={() => choose(key, t.format === key ? {} : s?.config || {})}
              >
                <span className="f-icon">
                  <Icon name={FORMAT_ICON[key]} size={20} />
                </span>
                <b>{tx(`format.${key}.name`)}</b>
                <span className="small muted">{tx(`format.${key}.desc`)}</span>
                {top?.format === key && <span className="badge green">{tx('fs.recommended')}</span>}
                {!s && n >= 2 && <span className="badge gray">{tx('fs.needMore')}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {t.format && (
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="sliders" /> {tx('fs.settings')}
          </h3>
          <div className="fields">
            {hasLeague && (
              <LegsField
                label={t.format === 'groups_knockout' ? tx('fs.groupMatches') : tx('fs.leagueMatches')}
                value={c.legs}
                onChange={(v) => setCfg({ legs: v })}
              />
            )}
            {t.format === 'league_playoff' && (
              <div className="field">
                <span>{tx('fs.playoffSpots')}</span>
                <div className="seg full">
                  {[2, 4, 8, 16]
                    .filter((x) => x <= Math.max(2, n))
                    .map((x) => (
                      <button type="button" key={x} className={c.playoffTeams === x ? 'active' : ''} onClick={() => setCfg({ playoffTeams: x })}>
                        {tx('fs.top', { n: x })}
                      </button>
                    ))}
                </div>
              </div>
            )}
            {t.format === 'groups_knockout' && (
              <>
                <NumField
                  label={tx('fs.groups')}
                  value={c.groupCount}
                  min={2}
                  max={16}
                  onChange={(v) => setCfg({ groupCount: v })}
                  hint={n ? tx('fs.perGroup', { n: Number((n / Math.max(1, c.groupCount)).toFixed(1)) }) : ''}
                />
                <NumField label={tx('fs.qualify')} value={c.advancePerGroup} min={1} max={4} onChange={(v) => setCfg({ advancePerGroup: v })} />
              </>
            )}
            {t.format === 'swiss_knockout' && (
              <>
                <NumField label={tx('fs.swissRounds')} value={c.swissRounds} min={1} max={Math.max(1, n - 1)} onChange={(v) => setCfg({ swissRounds: v })} />
                <NumField
                  label={tx('fs.swissQ')}
                  value={c.swissQualifiers}
                  min={2}
                  max={Math.max(2, n)}
                  onChange={(v) => setCfg({ swissQualifiers: v })}
                  hint={tx('fs.swissHint')}
                />
              </>
            )}
            {hasKo && (
              <>
                <LegsField label={tx('fs.koTies')} value={c.koLegs} onChange={(v) => setCfg({ koLegs: v })} />
                <LegsField label={tx('fs.final')} value={c.finalLegs} onChange={(v) => setCfg({ finalLegs: v })} />
              </>
            )}
            <NumField label={tx('fs.winPts')} value={c.pointsWin} min={0} max={10} onChange={(v) => setCfg({ pointsWin: v })} />
            <NumField label={tx('fs.drawPts')} value={c.pointsDraw} min={0} max={10} onChange={(v) => setCfg({ pointsDraw: v })} />
            <label className="switch-field">
              <input type="checkbox" checked={c.randomDraw} onChange={(e) => setCfg({ randomDraw: e.target.checked })} />
              <span className="switch" />
              <span>
                <b>{tx('fs.random')}</b>
                <small className="muted">{tx('fs.randomSub')}</small>
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="panel start-bar">
        {err ? <span className="error-text">{tr(err)}</span> : <span className="muted small">{tx('fs.ready')}</span>}
        <button className="btn big" disabled={!!err} onClick={start}>
          <Icon name="play" size={16} /> {tx('fs.start')}
        </button>
      </div>
    </div>
  );
}
