import { useState } from 'react';
import { isPlayed, roundName } from '../lib/engine.js';
import MatchCard from './MatchCard.jsx';

export default function Fixtures({ t, isAdmin, update }) {
  const hasGroup = t.matches.some((m) => m.stage === 'group');
  const hasKo = t.matches.some((m) => m.stage === 'ko');
  const [stage, setStage] = useState(t.status === 'group' || !hasKo ? 'group' : 'ko');
  const [group, setGroup] = useState('all');
  const [pendingOnly, setPendingOnly] = useState(false);
  const curStage = stage === 'ko' && !hasKo ? 'group' : stage === 'group' && !hasGroup ? 'ko' : stage;
  const multiGroup = t.groups.length > 1;

  let ms = t.matches.filter((m) => m.stage === curStage);
  if (curStage === 'group' && group !== 'all') ms = ms.filter((m) => m.group === group);
  if (pendingOnly) ms = ms.filter((m) => !isPlayed(m));

  const sections = [];
  const byKey = {};
  ms.forEach((m) => {
    if (!byKey[m.round]) {
      const title =
        curStage === 'ko'
          ? roundName(m.round, t.bracket.rounds.length)
          : `${t.format === 'swiss_knockout' ? 'Round' : 'Matchday'} ${m.round}`;
      byKey[m.round] = { key: m.round, title, matches: [] };
      sections.push(byKey[m.round]);
    }
    byKey[m.round].matches.push(m);
  });
  sections.sort((a, b) => a.key - b.key);
  if (curStage === 'ko') {
    const tieIdx = (m) => t.bracket.rounds[m.round].findIndex((x) => x.id === m.tieId);
    sections.forEach((s) => s.matches.sort((a, b) => tieIdx(a) - tieIdx(b) || a.leg - b.leg));
  }

  return (
    <div className="stack">
      <div className="filters panel slim">
        {hasGroup && hasKo && (
          <div className="seg">
            <button className={curStage === 'group' ? 'active' : ''} onClick={() => setStage('group')}>
              {t.format === 'groups_knockout' ? 'Groups' : 'League'}
            </button>
            <button className={curStage === 'ko' ? 'active' : ''} onClick={() => setStage('ko')}>
              Knockout
            </button>
          </div>
        )}
        {curStage === 'group' && multiGroup && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Group">
            <option value="all">All groups</option>
            {t.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        <label className="switch-field inline">
          <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
          <span className="switch" />
          <span className="small">Unplayed only</span>
        </label>
      </div>

      {sections.length === 0 && <div className="empty panel">No matches here.</div>}
      {sections.map((s) => (
        <section key={s.key}>
          <h3 className="round-title">
            {s.title}
            <span className="muted tiny">
              {s.matches.filter(isPlayed).length}/{s.matches.length} played
            </span>
          </h3>
          <div className="matches">
            {s.matches.map((m) => (
              <MatchCard
                key={m.id}
                t={t}
                match={m}
                isAdmin={isAdmin}
                update={update}
                label={curStage === 'group' && multiGroup ? `Group ${m.group}` : s.title}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
