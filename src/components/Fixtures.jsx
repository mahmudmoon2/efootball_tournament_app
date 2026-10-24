import { useState } from 'react';
import { isPlayed } from '../lib/engine.js';
import { groupLabel, roundLabel, usePrefs } from '../lib/prefs.jsx';
import MatchCard from './MatchCard.jsx';

export default function Fixtures({ t, isAdmin, update }) {
  const { t: tx } = usePrefs();
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
          ? roundLabel(tx, m.round, t.bracket.rounds.length)
          : tx(t.format === 'swiss_knockout' ? 'roundN' : 'matchday', { n: m.round });
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
              {t.format === 'groups_knockout' ? tx('fx.groups') : tx('fx.league')}
            </button>
            <button className={curStage === 'ko' ? 'active' : ''} onClick={() => setStage('ko')}>
              {tx('fx.knockout')}
            </button>
          </div>
        )}
        {curStage === 'group' && multiGroup && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Group">
            <option value="all">{tx('fx.allGroups')}</option>
            {t.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {groupLabel(tx, t, g)}
              </option>
            ))}
          </select>
        )}
        <label className="switch-field inline">
          <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
          <span className="switch" />
          <span className="small">{tx('fx.unplayed')}</span>
        </label>
      </div>

      {sections.length === 0 && <div className="empty panel">{tx('fx.none')}</div>}
      {sections.map((s) => (
        <section key={s.key}>
          <h3 className="round-title">
            {s.title}
            <span className="muted tiny">
              {tx('fx.played', { p: s.matches.filter(isPlayed).length, n: s.matches.length })}
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
                label={curStage === 'group' && multiGroup ? tx('group', { id: m.group }) : s.title}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
