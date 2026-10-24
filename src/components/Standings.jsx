import { computeStandings, playerName, playerTeam } from '../lib/engine.js';
import { Avatar } from './ui.jsx';
import { groupLabel, usePrefs } from '../lib/prefs.jsx';

export function qualifyCount(t) {
  if (t.format === 'groups_knockout') return t.config.advancePerGroup;
  if (t.format === 'league_playoff') return t.config.playoffTeams;
  if (t.format === 'swiss_knockout') return t.config.swissQualifiers;
  if (t.format === 'league') return 1;
  return 0;
}

// Full table on every screen size; on narrow screens it scrolls sideways while # and Player stay pinned.
export function StandingsTable({ t, groupId }) {
  const { t: tx } = usePrefs();
  const rows = computeStandings(t, groupId);
  const q = qualifyCount(t);
  return (
    <>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th className="pin pin-1">#</th>
              <th className="pin pin-2 left">{tx('st.player')}</th>
              <th title={tx('st.pT')}>{tx('st.p')}</th>
              <th title={tx('st.wT')}>{tx('st.w')}</th>
              <th title={tx('st.dT')}>{tx('st.d')}</th>
              <th title={tx('st.lT')}>{tx('st.l')}</th>
              <th title={tx('st.goalsT')}>{tx('st.goals')}</th>
              <th title={tx('st.gdT')}>{tx('st.gd')}</th>
              <th title={tx('st.ptsT')}>{tx('st.pts')}</th>
              <th className="left">{tx('st.form')}</th>
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
                        {tx(`form.${f}`)}
                      </i>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-hint muted tiny">{tx('st.hint')}</div>
    </>
  );
}

export default function Standings({ t }) {
  const { t: tx } = usePrefs();
  const q = qualifyCount(t);
  return (
    <div className="stack">
      <div className={t.groups.length > 1 ? 'groups-grid' : ''}>
        {t.groups.map((g) => (
          <div key={g.id} className="panel table-panel">
            <h3 className="panel-title">{groupLabel(tx, t, g)}</h3>
            <StandingsTable t={t} groupId={g.id} />
          </div>
        ))}
      </div>
      <div className="legend muted tiny">
        {q > 0 && (
          <span>
            <i className="legend-dot" /> {t.format === 'league' ? tx('st.champion') : tx('st.qualifies')}
          </span>
        )}
        <span>{tx('st.formNote')}</span>
        <span>{tx('st.tiebreak')}</span>
      </div>
    </div>
  );
}
