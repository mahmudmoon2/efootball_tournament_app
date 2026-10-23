import { computeStandings, playerName, playerTeam } from '../lib/engine.js';
import { Avatar } from './ui.jsx';

export function qualifyCount(t) {
  if (t.format === 'groups_knockout') return t.config.advancePerGroup;
  if (t.format === 'league_playoff') return t.config.playoffTeams;
  if (t.format === 'swiss_knockout') return t.config.swissQualifiers;
  if (t.format === 'league') return 1;
  return 0;
}

export function StandingsTable({ t, groupId, compact = false }) {
  const rows = computeStandings(t, groupId);
  const q = qualifyCount(t);
  return (
    <div className="table-wrap">
      <table className="standings">
        <thead>
          <tr>
            <th>#</th>
            <th className="left">Player</th>
            <th>P</th>
            <th className="hide-sm">W</th>
            <th className="hide-sm">D</th>
            <th className="hide-sm">L</th>
            {!compact && <th className="hide-sm">GF</th>}
            {!compact && <th className="hide-sm">GA</th>}
            <th>GD</th>
            <th>Pts</th>
            {!compact && <th className="hide-md">Form</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={i < q ? 'qualify' : ''}>
              <td>
                <span className="pos">{i + 1}</span>
              </td>
              <td className="left">
                <div className="st-player">
                  <Avatar name={playerName(t, r.id)} size={28} />
                  <div>
                    <b>
                      {playerName(t, r.id)}
                      {t.championId === r.id && ' 🏆'}
                    </b>
                    {playerTeam(t, r.id) && <small className="muted">{playerTeam(t, r.id)}</small>}
                  </div>
                </div>
              </td>
              <td>{r.p}</td>
              <td className="hide-sm">{r.w}</td>
              <td className="hide-sm">{r.d}</td>
              <td className="hide-sm">{r.l}</td>
              {!compact && <td className="hide-sm">{r.gf}</td>}
              {!compact && <td className="hide-sm">{r.ga}</td>}
              <td className={r.gd > 0 ? 'pos-gd' : r.gd < 0 ? 'neg-gd' : ''}>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className="pts">{r.pts}</td>
              {!compact && (
                <td className="hide-md">
                  <span className="form">
                    {r.form.map((f, k) => (
                      <i key={k} className={`f-${f}`}>
                        {f}
                      </i>
                    ))}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Standings({ t }) {
  const q = qualifyCount(t);
  return (
    <div className="stack">
      <div className={t.groups.length > 1 ? 'groups-grid' : ''}>
        {t.groups.map((g) => (
          <div key={g.id} className="panel">
            <h3 className="panel-title">{g.name}</h3>
            <StandingsTable t={t} groupId={g.id} compact={t.groups.length > 1} />
          </div>
        ))}
      </div>
      <div className="legend muted tiny">
        {q > 0 && (
          <span>
            <i className="legend-dot" /> {t.format === 'league' ? 'Champion' : 'Qualifies for knockout'}
          </span>
        )}
        <span>Tie-break: Points → Goal difference → Goals scored → Wins</span>
      </div>
    </div>
  );
}
