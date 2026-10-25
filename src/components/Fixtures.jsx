import { useState } from 'react';
import { isPlayed, playerName, playerTeam } from '../lib/engine.js';
import { groupLabel, roundLabel, usePrefs } from '../lib/prefs.jsx';
import Icon from './Icon.jsx';
import MatchCard from './MatchCard.jsx';

const norm = (s) => (s || '').toLocaleLowerCase().normalize('NFC');

// Every word of the query must match a name or club of either side, so "rahim karim" finds their head-to-head.
function matchesQuery(t, m, words) {
  const hay = norm([playerName(t, m.home), playerTeam(t, m.home), playerName(t, m.away), playerTeam(t, m.away)].join(' '));
  return words.every((w) => hay.includes(w));
}

export default function Fixtures({ t, isAdmin, update }) {
  const { t: tx } = usePrefs();
  const hasGroup = t.matches.some((m) => m.stage === 'group');
  const hasKo = t.matches.some((m) => m.stage === 'ko');
  const [stage, setStage] = useState(t.status === 'group' || !hasKo ? 'group' : 'ko');
  const [group, setGroup] = useState('all');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [query, setQuery] = useState('');
  const curStage = stage === 'ko' && !hasKo ? 'group' : stage === 'group' && !hasGroup ? 'ko' : stage;
  const multiGroup = t.groups.length > 1;
  const words = norm(query).split(/\s+/).filter(Boolean);
  const searching = words.length > 0;

  // While searching, look through every stage and group; otherwise use the stage/group filters.
  let ms = searching ? t.matches.filter((m) => m.home && m.away && matchesQuery(t, m, words)) : t.matches.filter((m) => m.stage === curStage);
  if (!searching && curStage === 'group' && group !== 'all') ms = ms.filter((m) => m.group === group);
  if (pendingOnly) ms = ms.filter((m) => !isPlayed(m));

  const sectionTitle = (m) =>
    m.stage === 'ko'
      ? roundLabel(tx, m.round, t.bracket.rounds.length)
      : tx(t.format === 'swiss_knockout' ? 'roundN' : 'matchday', { n: m.round });

  const sections = [];
  const byKey = {};
  ms.forEach((m) => {
    const key = `${m.stage === 'ko' ? 1 : 0}-${String(m.round).padStart(3, '0')}`;
    if (!byKey[key]) {
      byKey[key] = { key, title: sectionTitle(m), matches: [] };
      sections.push(byKey[key]);
    }
    byKey[key].matches.push(m);
  });
  sections.sort((a, b) => a.key.localeCompare(b.key));
  sections.forEach((s) => {
    if (s.matches[0].stage !== 'ko') return;
    const tieIdx = (m) => t.bracket.rounds[m.round].findIndex((x) => x.id === m.tieId);
    s.matches.sort((a, b) => tieIdx(a) - tieIdx(b) || a.leg - b.leg);
  });

  const cardLabel = (m, s) => (m.stage === 'group' && multiGroup ? tx('group', { id: m.group }) : s.title);

  return (
    <div className="stack">
      <div className="filters panel slim">
        <label className="search-box">
          <Icon name="search" size={17} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tx('fx.search')}
            aria-label={tx('fx.search')}
            enterKeyHint="search"
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label={tx('fx.clear')}>
              <Icon name="x" size={13} stroke={2.6} />
            </button>
          )}
        </label>
        {!searching && hasGroup && hasKo && (
          <div className="seg">
            <button className={curStage === 'group' ? 'active' : ''} onClick={() => setStage('group')}>
              {t.format === 'groups_knockout' ? tx('fx.groups') : tx('fx.league')}
            </button>
            <button className={curStage === 'ko' ? 'active' : ''} onClick={() => setStage('ko')}>
              {tx('fx.knockout')}
            </button>
          </div>
        )}
        {!searching && curStage === 'group' && multiGroup && (
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

      {searching && ms.length > 0 && <div className="search-count muted small">{tx('fx.results', { n: ms.length })}</div>}
      {sections.length === 0 && <div className="empty panel">{searching ? tx('fx.noResults', { q: query.trim() }) : tx('fx.none')}</div>}
      {sections.map((s) => (
        <section key={s.key}>
          <h3 className="round-title">
            {s.title}
            <span className="muted tiny">{tx('fx.played', { p: s.matches.filter(isPlayed).length, n: s.matches.length })}</span>
          </h3>
          <div className="matches">
            {s.matches.map((m) => (
              <MatchCard key={m.id} t={t} match={m} isAdmin={isAdmin} update={update} label={cardLabel(m, s)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
