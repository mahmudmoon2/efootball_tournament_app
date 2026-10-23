import { useEffect, useState } from 'react';
import { isPlayed, playerName, playerTeam, tieMatches, tieResult } from '../lib/engine.js';
import Icon from './Icon.jsx';
import { Avatar, useUI } from './ui.jsx';

const val = (v) => (v === null || v === undefined ? '' : String(v));
const num = (v) => (v === '' ? null : Math.max(0, Math.min(99, Number(v))));
const digits = (s) => s.replace(/\D/g, '').slice(0, 2);
const has = (v) => v !== null && v !== undefined && v !== '';

export default function MatchCard({ t, match, isAdmin, update, label }) {
  const { confirm, toast } = useUI();
  const [hs, setHs] = useState(val(match.hs));
  const [as, setAs] = useState(val(match.as));
  const [ph, setPh] = useState(val(match.ph));
  const [pa, setPa] = useState(val(match.pa));

  useEffect(() => {
    setHs(val(match.hs));
    setAs(val(match.as));
    setPh(val(match.ph));
    setPa(val(match.pa));
  }, [match.hs, match.as, match.ph, match.pa]);

  // Penalties are needed on the last leg of a knockout tie when the aggregate is level
  let tie = null;
  let legs = [];
  if (match.stage === 'ko' && t.bracket) {
    tie = t.bracket.rounds[match.round]?.find((x) => x.id === match.tieId);
    legs = tie ? tieMatches(t, tie.id) : [];
  }
  const isLastLeg = tie && legs.length && legs[legs.length - 1].id === match.id;
  let needPens = false;
  let agg = null;
  if (isLastLeg && hs !== '' && as !== '') {
    const preview = legs.map((m) => (m.id === match.id ? { ...m, hs: Number(hs), as: Number(as), ph: null, pa: null } : m));
    const r = tieResult(tie, preview);
    needPens = !!r.needsPens;
    if (legs.length > 1 && r.aggHome !== undefined) agg = r;
  }

  const dirty = hs !== val(match.hs) || as !== val(match.as) || (needPens && (ph !== val(match.ph) || pa !== val(match.pa)));
  const played = isPlayed(match);
  const winnerId = (() => {
    if (!played) return null;
    if (Number(match.hs) > Number(match.as)) return match.home;
    if (Number(match.hs) < Number(match.as)) return match.away;
    if (has(match.ph) && has(match.pa) && Number(match.ph) !== Number(match.pa))
      return Number(match.ph) > Number(match.pa) ? match.home : match.away;
    return null;
  })();

  const save = () => {
    if ((hs === '') !== (as === '')) return toast('Enter both scores.');
    if (needPens && (ph === '' || pa === '' || ph === pa)) return toast('It is level: enter the penalty shootout result (it cannot be a draw).');
    update((d) => {
      const m = d.matches.find((x) => x.id === match.id);
      m.hs = num(hs);
      m.as = num(as);
      m.ph = needPens ? num(ph) : null;
      m.pa = needPens ? num(pa) : null;
      return d;
    });
  };

  const clear = async () => {
    if (!(await confirm({ title: 'Clear this score?', confirmText: 'Clear', danger: true }))) return;
    update((d) => {
      const m = d.matches.find((x) => x.id === match.id);
      m.hs = m.as = m.ph = m.pa = null;
      return d;
    });
  };

  const onKey = (e) => e.key === 'Enter' && dirty && save();

  const row = (id, value, setValue, pens) => (
    <div className={`m-row ${winnerId === id ? 'win' : ''} ${winnerId && winnerId !== id ? 'lose' : ''}`}>
      <Avatar name={playerName(t, id)} size={32} />
      <div className="m-name">
        <b>{playerName(t, id)}</b>
        {playerTeam(t, id) && <small>{playerTeam(t, id)}</small>}
      </div>
      {!isAdmin && played && has(match.ph) && <span className="pen-score">({pens})</span>}
      {isAdmin ? (
        <input
          className="score-box"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`${playerName(t, id)} goals`}
          value={value}
          onChange={(e) => setValue(digits(e.target.value))}
          onKeyDown={onKey}
          onFocus={(e) => e.target.select()}
        />
      ) : (
        <span className="score-box ro">{played ? value : '–'}</span>
      )}
    </div>
  );

  return (
    <div className={`match ${played ? 'played' : ''} ${dirty ? 'dirty' : ''}`}>
      <div className="m-top">
        <span className="m-label">
          {label}
          {match.leg && legs.length > 1 ? ` · Leg ${match.leg}` : ''}
        </span>
        <span className={`m-state ${played ? 'ft' : ''}`}>{played ? 'FT' : 'Upcoming'}</span>
      </div>
      {row(match.home, hs, setHs, match.ph)}
      {row(match.away, as, setAs, match.pa)}
      {(agg || (needPens && isAdmin) || (isAdmin && (dirty || played))) && (
        <div className="m-foot">
          {agg && (
            <span className="tiny muted">
              Aggregate {agg.aggHome}–{agg.aggAway}
            </span>
          )}
          {needPens && isAdmin && (
            <span className="pens">
              Pens
              <input className="score-box sm" inputMode="numeric" aria-label="Home penalties" value={ph} onChange={(e) => setPh(digits(e.target.value))} onKeyDown={onKey} />
              <input className="score-box sm" inputMode="numeric" aria-label="Away penalties" value={pa} onChange={(e) => setPa(digits(e.target.value))} onKeyDown={onKey} />
            </span>
          )}
          <span className="spacer" />
          {isAdmin && dirty && (
            <button className="btn sm" onClick={save}>
              <Icon name="check" size={14} /> Save
            </button>
          )}
          {isAdmin && !dirty && played && (
            <button className="link-btn tiny" onClick={clear}>
              Clear score
            </button>
          )}
        </div>
      )}
    </div>
  );
}
