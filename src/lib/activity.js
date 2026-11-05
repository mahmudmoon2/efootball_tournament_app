// Recent changes log. Every saved edit is compared with the previous state, and what changed is
// appended to tournament.log as { at, type, vars, match }. Text is built at display time (see
// ActivityLog.jsx), so the log follows the viewer's language. Names are stored as they were then.
import { isPlayed, playerName } from './engine.js';

const MAX_ENTRIES = 50;

function scoreText(m) {
  const pens = m.ph !== null && m.ph !== undefined && m.ph !== '' ? ` (${m.ph}-${m.pa})` : '';
  return `${m.hs}-${m.as}${pens}`;
}

function matchInfo(t, m) {
  return {
    stage: m.stage,
    round: m.round,
    group: m.group || null,
    leg: m.leg || null,
    legs: m.tieId ? t.matches.filter((x) => x.tieId === m.tieId).length : 1,
    rounds: t.bracket ? t.bracket.rounds.length : 0,
  };
}

export function diffChanges(prev, next) {
  const out = [];
  const add = (type, vars, match) => out.push({ type, vars: vars || {}, ...(match ? { match } : {}) });

  if (prev.status === 'setup' && next.status !== 'setup') add('started');
  else if (prev.status !== 'setup' && next.status === 'setup') add('reset');
  else if (prev.status === 'group' && next.status === 'knockout') add('koStarted');
  else if ((prev.status === 'knockout' || prev.status === 'finished') && next.status === 'group' && prev.bracket && !next.bracket) add('backGroup');

  if (prev.name !== next.name) add('renamed', { to: next.name });
  if (prev.format !== next.format && next.format && next.status === 'setup') add('style', { format: { key: `format.${next.format}.name` } });

  const before = new Map(prev.players.map((p) => [p.id, p]));
  const after = new Map(next.players.map((p) => [p.id, p]));
  const added = next.players.filter((p) => !before.has(p.id));
  if (added.length === 1) add('playerAdded', { name: added[0].name });
  else if (added.length > 1) add('playersAdded', { n: added.length });
  prev.players.filter((p) => !after.has(p.id)).forEach((p) => add('playerRemoved', { name: p.name }));
  next.players.forEach((p) => {
    const old = before.get(p.id);
    if (old && old.name !== p.name) add('playerRenamed', { from: old.name, to: p.name });
  });

  const oldMatches = new Map(prev.matches.map((m) => [m.id, m]));
  next.matches.forEach((m) => {
    const old = oldMatches.get(m.id);
    if (!old) return;
    const names = { home: playerName(next, m.home), away: playerName(next, m.away) };
    const was = isPlayed(old);
    const now = isPlayed(m);
    if (!was && now) add('score', { ...names, score: scoreText(m) }, matchInfo(next, m));
    else if (was && !now) add('scoreClear', names, matchInfo(next, m));
    else if (was && now && scoreText(old) !== scoreText(m)) add('scoreEdit', { ...names, old: scoreText(old), score: scoreText(m) }, matchInfo(next, m));
  });

  if (next.championId && next.championId !== prev.championId) add('champion', { name: playerName(next, next.championId) });
  return out;
}

// Returns the next state with any new changes added to its log (newest last, capped).
export function withChanges(prev, next, now = new Date().toISOString()) {
  const fresh = diffChanges(prev, next).map((e) => ({ at: now, ...e }));
  const log = prev.log || [];
  return { ...next, log: fresh.length ? [...log, ...fresh].slice(-MAX_ENTRIES) : log };
}
