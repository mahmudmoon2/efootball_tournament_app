import { isPlayed, playerName, roundName, tieMatches } from '../lib/engine.js';
import { Avatar } from './ui.jsx';

function legScore(m, forId) {
  if (!isPlayed(m)) return null;
  return m.home === forId ? Number(m.hs) : Number(m.as);
}

function Tie({ t, tie, isFirst, isFinal }) {
  const legs = tieMatches(t, tie.id);
  const row = (id) => {
    const scores = legs.map((m) => legScore(m, id));
    const last = legs[legs.length - 1];
    const pens = last && isPlayed(last) && last.ph !== null && last.ph !== '' ? (last.home === id ? last.ph : last.pa) : null;
    const bye = isFirst && tie.bye && !id;
    return (
      <div className={`b-row ${tie.winner && tie.winner === id ? 'win' : ''} ${tie.winner && id && tie.winner !== id ? 'lose' : ''} ${!id ? 'tbd' : ''}`}>
        {id ? <Avatar name={playerName(t, id)} size={22} /> : <span className="avatar ghost" style={{ width: 22, height: 22 }} />}
        <span className="b-name">{bye ? 'Bye' : id ? playerName(t, id) : 'TBD'}</span>
        <span className="b-scores">
          {pens !== null && <small>({pens})</small>}
          {scores.map((s, i) => (
            <b key={i}>{s === null ? '' : s}</b>
          ))}
        </span>
      </div>
    );
  };
  return (
    <div className={`b-tie ${isFinal ? 'final' : ''}`}>
      {row(tie.home)}
      {row(tie.away)}
    </div>
  );
}

export default function Bracket({ t }) {
  if (!t.bracket) return <div className="empty panel">The knockout stage has not started yet.</div>;
  const rounds = t.bracket.rounds;
  return (
    <div className="stack">
      {t.championId && (
        <div className="champion-banner slim">
          <span className="trophy-sm">🏆</span>
          <div>
            <small>Champion</small>
            <b>{playerName(t, t.championId)}</b>
          </div>
        </div>
      )}
      <div className="panel bracket-panel">
        <div className="bracket">
          {rounds.map((ties, r) => (
            <div key={r} className="b-col">
              <div className="b-title">{roundName(r, rounds.length)}</div>
              <div className="b-ties">
                {ties.map((tie) => (
                  <Tie key={tie.id} t={t} tie={tie} isFirst={r === 0} isFinal={r === rounds.length - 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
        {rounds.length > 1 && <div className="muted tiny swipe-hint">Swipe to see all rounds →</div>}
      </div>
    </div>
  );
}
