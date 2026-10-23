import { FORMATS, startTournament, validateStart } from '../lib/engine.js';
import { suggestFormats } from '../lib/suggest.js';
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
        <button type="button" onClick={() => set(value - 1)} aria-label={`Decrease ${label}`}>−</button>
        <input type="number" inputMode="numeric" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value) || min)} />
        <button type="button" onClick={() => set(value + 1)} aria-label={`Increase ${label}`}>+</button>
      </div>
      {hint && <small className="muted">{hint}</small>}
    </div>
  );
}

function LegsField({ label, value, onChange }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="seg full">
        <button type="button" className={value === 1 ? 'active' : ''} onClick={() => onChange(1)}>Single match</button>
        <button type="button" className={value === 2 ? 'active' : ''} onClick={() => onChange(2)}>Home & away</button>
      </div>
    </div>
  );
}

export default function FormatSetup({ t, update, onStarted }) {
  const { confirm } = useUI();
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
    const ok = await confirm({
      title: 'Start the tournament?',
      message: 'Fixtures will be generated. After this, players cannot be added or removed.',
      confirmText: 'Start',
    });
    if (ok && update((d) => startTournament(d))) onStarted();
  };

  const err = validateStart(t);
  const hasKo = ['league_playoff', 'knockout', 'groups_knockout', 'swiss_knockout'].includes(t.format);
  const hasLeague = ['league', 'league_playoff', 'groups_knockout'].includes(t.format);

  return (
    <div className="stack">
      <div className="panel">
        <h3 className="panel-title">
          <Icon name="sparkle" /> Smart suggestion <span className="count">{n} players</span>
        </h3>
        {n < 2 && <div className="muted small">Add at least 2 players to get suggestions.</div>}
        <div className="suggest-list">
          {suggestions.slice(0, 3).map((s, i) => (
            <div key={s.format} className={`suggest ${t.format === s.format ? 'selected' : ''} ${i === 0 ? 'best' : ''}`}>
              <div className="suggest-head">
                <span className="f-icon">
                  <Icon name={FORMAT_ICON[s.format]} size={18} />
                </span>
                <b>{FORMATS[s.format].name}</b>
              </div>
              <div className="meter">
                <div style={{ width: `${s.score}%` }} />
              </div>
              <div className="meter-label">
                <span>{i === 0 ? 'Best match' : 'Good fit'}</span>
                <b>{s.score}%</b>
              </div>
              <p className="small">{s.reason}</p>
              <div className="suggest-foot">
                <span className="muted small">≈ {s.matches} matches</span>
                <button className={`btn sm ${t.format === s.format ? 'ghost' : ''}`} onClick={() => choose(s.format, s.config)}>
                  {t.format === s.format ? (
                    <>
                      <Icon name="check" size={14} /> Selected
                    </>
                  ) : (
                    'Use this'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">
          <Icon name="trophy" /> All styles
        </h3>
        <div className="format-grid">
          {Object.entries(FORMATS).map(([key, f]) => {
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
                <b>{f.name}</b>
                <span className="small muted">{f.desc}</span>
                {top?.format === key && <span className="badge green">Recommended</span>}
                {!s && n >= 2 && <span className="badge gray">Needs more players</span>}
              </button>
            );
          })}
        </div>
      </div>

      {t.format && (
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="sliders" /> Settings
          </h3>
          <div className="fields">
            {hasLeague && (
              <LegsField
                label={t.format === 'groups_knockout' ? 'Group matches' : 'League matches'}
                value={c.legs}
                onChange={(v) => setCfg({ legs: v })}
              />
            )}
            {t.format === 'league_playoff' && (
              <div className="field">
                <span>Playoff spots</span>
                <div className="seg full">
                  {[2, 4, 8, 16]
                    .filter((x) => x <= Math.max(2, n))
                    .map((x) => (
                      <button type="button" key={x} className={c.playoffTeams === x ? 'active' : ''} onClick={() => setCfg({ playoffTeams: x })}>
                        Top {x}
                      </button>
                    ))}
                </div>
              </div>
            )}
            {t.format === 'groups_knockout' && (
              <>
                <NumField
                  label="Number of groups"
                  value={c.groupCount}
                  min={2}
                  max={16}
                  onChange={(v) => setCfg({ groupCount: v })}
                  hint={n ? `About ${(n / Math.max(1, c.groupCount)).toFixed(1)} players per group` : ''}
                />
                <NumField label="Qualify from each group" value={c.advancePerGroup} min={1} max={4} onChange={(v) => setCfg({ advancePerGroup: v })} />
              </>
            )}
            {t.format === 'swiss_knockout' && (
              <>
                <NumField
                  label="League phase matches per player"
                  value={c.swissRounds}
                  min={1}
                  max={Math.max(1, n - 1)}
                  onChange={(v) => setCfg({ swissRounds: v })}
                />
                <NumField
                  label="Players to knockout"
                  value={c.swissQualifiers}
                  min={2}
                  max={Math.max(2, n)}
                  onChange={(v) => setCfg({ swissQualifiers: v })}
                  hint="2, 4, 8 or 16 makes a perfect bracket; otherwise top seeds get byes"
                />
              </>
            )}
            {hasKo && (
              <>
                <LegsField label="Knockout ties" value={c.koLegs} onChange={(v) => setCfg({ koLegs: v })} />
                <LegsField label="Final" value={c.finalLegs} onChange={(v) => setCfg({ finalLegs: v })} />
              </>
            )}
            <NumField label="Points for a win" value={c.pointsWin} min={0} max={10} onChange={(v) => setCfg({ pointsWin: v })} />
            <NumField label="Points for a draw" value={c.pointsDraw} min={0} max={10} onChange={(v) => setCfg({ pointsDraw: v })} />
            <label className="switch-field">
              <input type="checkbox" checked={c.randomDraw} onChange={(e) => setCfg({ randomDraw: e.target.checked })} />
              <span className="switch" />
              <span>
                <b>Random draw</b>
                <small className="muted">Turn off to seed players in the order of the player list.</small>
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="panel start-bar">
        {err ? <span className="error-text">{err}</span> : <span className="muted small">All set. Fixtures will be generated automatically.</span>}
        <button className="btn big" disabled={!!err} onClick={start}>
          <Icon name="play" size={16} /> Start tournament
        </button>
      </div>
    </div>
  );
}
