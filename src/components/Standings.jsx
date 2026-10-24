import { computeStandings, playerName, playerTeam } from '../lib/engine.js';
import { Avatar } from './ui.jsx';

export function qualifyCount(t) {
  if (t.format === 'groups_knockout') return t.config.advancePerGroup;
  if (t.format === 'league_playoff') return t.config.playoffTeams;
  if (t.format === 'swiss_knockout') return t.config.swissQualifiers;
  if (t.format === 'league') return 1;
  return 0;
}

// Full table on every screen size; on narrow screens it scrolls sideways while # and Player stay pinned.
export function StandingsTable({ t, groupId }) {
  const rows = computeStandings(t, groupId);
  const q = qualifyCount(t);
  return (
    <>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th className="pin pin-1">#</th>
              <th className="pin pin-2 left">Player</th>
              <th title="Played">P</th>
              <th title="Won">W</th>
              <th title="Drawn">D</th>
              <th title="Lost">L</th>
              <th title="Goals for - against">Goals</th>
              <th title="Goal difference">GD</th>
              <th title="Points">Pts</th>
              <th className="left">Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={i < q ? 'qualify' : ''}>
                <td className="pin pin-1">
                  <span className="pos">{i + 1}</span>
                </td>
                <td className="pin pin-2 left">
                  <div className="st-player">
                    <Avatar id={r.id} name={playerName(t, r.id)} size={30} />
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
                <td>{r.w}</td>
                <td>{r.d}</td>
                <td>{r.l}</td>
                <td className="goals">
                  {r.gf}-{r.ga}
                </td>
                <td className={r.gd > 0 ? 'pos-gd' : r.gd < 0 ? 'neg-gd' : ''}>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="pts">{r.pts}</td>
                <td className="left">
                  <span className="form">
                    {r.form.length === 0 && <span className="muted">–</span>}
                    {r.form.map((f, k) => (
                      <i key={k} className={`f-${f}`}>
                        {f}
                      </i>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-hint muted tiny">← Swipe the table to see all columns →</div>
    </>
  );
}

export default function Standings({ t }) {
  const q = qualifyCount(t);
  return (
    <div className="stack">
      <div className={t.groups.length > 1 ? 'groups-grid' : ''}>
        {t.groups.map((g) => (
          <div key={g.id} className="panel table-panel">
            <h3 className="panel-title">{g.name}</h3>
            <StandingsTable t={t} groupId={g.id} />
          </div>
        ))}
      </div>
      <div className="legend muted tiny">
        {q > 0 && (
          <span>
            <i className="legend-dot" /> {t.format === 'league' ? 'Champion' : 'Qualifies for knockout'}
          </span>
        )}
        <span>Form: most recent on the right</span>
        <span>Tie-break: Points → Goal difference → Goals scored → Wins</span>
      </div>
    </div>
  );
}
