// Tournament engine: fixtures, standings, knockout bracket, progression.
// All functions work on a plain tournament object (JSON-serialisable).

export const uid = () => Math.random().toString(36).slice(2, 10);

export const FORMATS = {
  league: {
    name: 'League (Round Robin)',
    short: 'League',
    desc: 'Everyone plays everyone. Most points wins the title.',
  },
  league_playoff: {
    name: 'League + Playoffs',
    short: 'League + Playoffs',
    desc: 'Round-robin league first, then the top players fight it out in knockout playoffs.',
  },
  knockout: {
    name: 'Knockout (Single Elimination)',
    short: 'Knockout',
    desc: 'Lose and you are out. Round of 16 → Quarters → Semis → Final. Quick and dramatic.',
  },
  groups_knockout: {
    name: 'FIFA World Cup Style',
    short: 'World Cup',
    desc: 'Groups of about 4, the top 2 from each group go through to the knockout rounds.',
  },
  swiss_knockout: {
    name: 'Champions League Style (Swiss)',
    short: 'Champions League',
    desc: 'New UCL format: one big league table, everyone plays a fixed number of different opponents, then the top players go to knockout.',
  },
};

export const DEFAULT_CONFIG = {
  legs: 1, // league / group legs (1 = single, 2 = home & away)
  koLegs: 1, // knockout legs
  finalLegs: 1,
  groupCount: 2,
  advancePerGroup: 2,
  playoffTeams: 4,
  swissRounds: 6,
  swissQualifiers: 8,
  pointsWin: 3,
  pointsDraw: 1,
  randomDraw: true,
};

export function newTournament(name) {
  const now = new Date().toISOString();
  return {
    id: uid() + uid(),
    name,
    createdAt: now,
    updatedAt: now,
    version: 0,
    status: 'setup',
    format: null,
    config: { ...DEFAULT_CONFIG },
    players: [],
    groups: [],
    matches: [],
    bracket: null,
    championId: null,
  };
}

export const clone = (o) => JSON.parse(JSON.stringify(o));

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const isPow2 = (n) => n > 0 && (n & (n - 1)) === 0;
export const nextPow2 = (n) => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};
export const prevPow2 = (n) => {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
};

// Circle-method round robin. Returns rounds -> [[home, away], ...]
export function roundRobin(ids, legs = 1) {
  const list = [...ids];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (!a || !b) continue;
      const flip = i === 0 ? r % 2 === 1 : i % 2 === 1;
      pairs.push(flip ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop());
  }
  if (legs === 2) rounds.push(...rounds.map((rd) => rd.map(([h, a]) => [a, h])));
  return rounds;
}

const groupLetter = (i) => String.fromCharCode(65 + i);

function makeMatch(extra) {
  return { id: uid(), hs: null, as: null, ph: null, pa: null, ...extra };
}

function groupMatches(group, rounds) {
  const out = [];
  rounds.forEach((rd, ri) =>
    rd.forEach(([home, away]) => out.push(makeMatch({ stage: 'group', group: group.id, round: ri + 1, home, away })))
  );
  return out;
}

export const isPlayed = (m) => m.hs !== null && m.hs !== '' && m.as !== null && m.as !== '';

// ---------- Validation ----------
// Problems are returned as { key, vars } so the UI can show them in the viewer's language.
function keyedError({ key, vars }) {
  const e = new Error(key);
  e.key = key;
  e.vars = vars;
  return e;
}

export function validateStart(t) {
  const n = t.players.length;
  const c = t.config;
  if (!t.format) return { key: 'v.needFormat' };
  if (n < 2) return { key: 'v.min2' };
  switch (t.format) {
    case 'league_playoff':
      if (n < 3) return { key: 'v.lpMin3' };
      if (c.playoffTeams > n) return { key: 'v.playoffTooMany', vars: { n: c.playoffTeams } };
      break;
    case 'groups_knockout':
      if (c.groupCount < 2) return { key: 'v.min2Groups' };
      if (n < c.groupCount * 2) return { key: 'v.groupPlayers', vars: { g: c.groupCount, n: c.groupCount * 2 } };
      if (c.advancePerGroup < 1 || c.advancePerGroup >= Math.floor(n / c.groupCount))
        return { key: 'v.advance' };
      break;
    case 'swiss_knockout':
      if (n < 4) return { key: 'v.swissMin4' };
      if (c.swissRounds < 1 || c.swissRounds > n - 1) return { key: 'v.swissRounds', vars: { n: n - 1 } };
      if (c.swissQualifiers < 2 || c.swissQualifiers > n) return { key: 'v.swissQ' };
      break;
    default:
  }
  return null;
}

// ---------- Start tournament ----------
export function startTournament(src) {
  const t = clone(src);
  const err = validateStart(t);
  if (err) throw keyedError(err);
  const c = t.config;
  const ids = c.randomDraw ? shuffle(t.players.map((p) => p.id)) : t.players.map((p) => p.id);
  t.matches = [];
  t.groups = [];
  t.bracket = null;
  t.championId = null;

  if (t.format === 'league' || t.format === 'league_playoff') {
    const g = { id: 'L', name: 'League Table', playerIds: ids };
    t.groups = [g];
    t.matches = groupMatches(g, roundRobin(ids, c.legs));
    t.status = 'group';
  } else if (t.format === 'swiss_knockout') {
    const g = { id: 'L', name: 'League Phase', playerIds: ids };
    t.groups = [g];
    const rounds = roundRobin(shuffle(ids), 1).slice(0, c.swissRounds);
    t.matches = groupMatches(g, rounds);
    t.status = 'group';
  } else if (t.format === 'groups_knockout') {
    const groups = Array.from({ length: c.groupCount }, (_, i) => ({
      id: groupLetter(i),
      name: `Group ${groupLetter(i)}`,
      playerIds: [],
    }));
    // snake distribution so the list order works like seeding pots
    ids.forEach((id, i) => {
      const row = Math.floor(i / c.groupCount);
      const col = i % c.groupCount;
      groups[row % 2 ? c.groupCount - 1 - col : col].playerIds.push(id);
    });
    t.groups = groups;
    groups.forEach((g) => t.matches.push(...groupMatches(g, roundRobin(g.playerIds, c.legs))));
    t.status = 'group';
  } else if (t.format === 'knockout') {
    t.bracket = buildBracket(ids);
    t.status = 'knockout';
  }
  return advance(t);
}

export function resetToSetup(src) {
  const t = clone(src);
  t.status = 'setup';
  t.groups = [];
  t.matches = [];
  t.bracket = null;
  t.championId = null;
  return t;
}

// ---------- Standings ----------
export function computeStandings(t, groupId) {
  const g = t.groups.find((x) => x.id === groupId);
  if (!g) return [];
  const { pointsWin = 3, pointsDraw = 1 } = t.config;
  const rows = {};
  g.playerIds.forEach((id) => {
    rows[id] = { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: [] };
  });
  const ms = t.matches
    .filter((m) => m.stage === 'group' && m.group === groupId && isPlayed(m))
    .sort((a, b) => a.round - b.round);
  for (const m of ms) {
    const h = rows[m.home];
    const a = rows[m.away];
    if (!h || !a) continue;
    const hs = Number(m.hs);
    const as = Number(m.as);
    h.p++; a.p++;
    h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
    if (hs > as) {
      h.w++; a.l++; h.pts += pointsWin; h.form.push('W'); a.form.push('L');
    } else if (hs < as) {
      a.w++; h.l++; a.pts += pointsWin; a.form.push('W'); h.form.push('L');
    } else {
      h.d++; a.d++; h.pts += pointsDraw; a.pts += pointsDraw; h.form.push('D'); a.form.push('D');
    }
  }
  const nameOf = (id) => (t.players.find((p) => p.id === id)?.name || '').toLowerCase();
  return Object.values(rows)
    .map((r) => ({ ...r, gd: r.gf - r.ga, form: r.form.slice(-5) }))
    .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || y.w - x.w || nameOf(x.id).localeCompare(nameOf(y.id)));
}

// ---------- Knockout ----------
function seedOrder(size) {
  let order = [1, 2];
  while (order.length < size) {
    const m = order.length * 2;
    order = order.flatMap((x) => [x, m + 1 - x]);
  }
  return order.slice(0, size);
}

function emptyRounds(firstRoundTies) {
  const rounds = [firstRoundTies];
  let count = firstRoundTies.length;
  while (count > 1) {
    count /= 2;
    rounds.push(Array.from({ length: count }, () => ({ id: uid(), home: null, away: null, winner: null })));
  }
  return { rounds };
}

// seeds: ordered list of player ids (best first). Byes go to top seeds.
export function buildBracket(seeds) {
  const size = Math.max(2, nextPow2(seeds.length));
  const order = seedOrder(size);
  const ties = [];
  for (let i = 0; i < size; i += 2) {
    const home = seeds[order[i] - 1] || null;
    const away = seeds[order[i + 1] - 1] || null;
    ties.push({ id: uid(), home, away, bye: !home || !away, winner: null });
  }
  return emptyRounds(ties);
}

export function buildBracketFromPairs(pairs) {
  return emptyRounds(pairs.map(([home, away]) => ({ id: uid(), home, away, bye: !home || !away, winner: null })));
}

export function roundName(idx, total) {
  const left = total - idx;
  if (left === 1) return 'Final';
  if (left === 2) return 'Semi-final';
  if (left === 3) return 'Quarter-final';
  return `Round of ${2 ** left}`;
}

export function tieMatches(t, tieId) {
  return t.matches.filter((m) => m.tieId === tieId).sort((a, b) => a.leg - b.leg);
}

// Returns { winner, aggHome, aggAway, needsPens } for a tie (home/away = tie.home/tie.away)
export function tieResult(tie, legs) {
  if (!legs.length || !legs.every(isPlayed)) return { winner: null, done: false };
  let aggHome = 0;
  let aggAway = 0;
  for (const m of legs) {
    if (m.home === tie.home) {
      aggHome += Number(m.hs); aggAway += Number(m.as);
    } else {
      aggHome += Number(m.as); aggAway += Number(m.hs);
    }
  }
  if (aggHome !== aggAway) return { winner: aggHome > aggAway ? tie.home : tie.away, aggHome, aggAway, done: true };
  const last = legs[legs.length - 1];
  const ph = last.ph === null || last.ph === '' ? null : Number(last.ph);
  const pa = last.pa === null || last.pa === '' ? null : Number(last.pa);
  if (ph === null || pa === null || ph === pa) return { winner: null, aggHome, aggAway, needsPens: true, done: false };
  const lastHomeWon = ph > pa;
  const winner = lastHomeWon ? last.home : last.away;
  return { winner, aggHome, aggAway, needsPens: true, done: true };
}

// Generate knockout from finished group stage
export function startKnockout(src) {
  const t = clone(src);
  const c = t.config;
  if (t.format === 'league_playoff' || t.format === 'swiss_knockout') {
    const n = t.format === 'league_playoff' ? c.playoffTeams : c.swissQualifiers;
    const table = computeStandings(t, 'L');
    t.bracket = buildBracket(table.slice(0, n).map((r) => r.id));
  } else if (t.format === 'groups_knockout') {
    const tables = t.groups.map((g) => computeStandings(t, g.id));
    const adv = c.advancePerGroup;
    const gc = t.groups.length;
    if (adv === 2 && gc % 2 === 0 && isPow2(gc * 2)) {
      // World Cup cross pairing: A1-B2, C1-D2 ... | B1-A2, D1-C2 ...
      const first = [];
      const second = [];
      for (let i = 0; i < gc; i += 2) {
        first.push([tables[i][0].id, tables[i + 1][1].id]);
        second.push([tables[i + 1][0].id, tables[i][1].id]);
      }
      t.bracket = buildBracketFromPairs([...first, ...second]);
    } else {
      const cmp = (x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf;
      const seeds = [];
      for (let pos = 0; pos < adv; pos++) {
        seeds.push(...tables.map((tb) => tb[pos]).filter(Boolean).sort(cmp).map((r) => r.id));
      }
      t.bracket = buildBracket(seeds);
    }
  } else {
    throw keyedError({ key: 'v.noKo' });
  }
  t.status = 'knockout';
  return advance(t);
}

export function backToGroupStage(src) {
  const t = clone(src);
  t.bracket = null;
  t.matches = t.matches.filter((m) => m.stage !== 'ko');
  t.status = 'group';
  t.championId = null;
  return advance(t);
}

// Recompute bracket participants/winners, create knockout matches, set champion.
export function advance(t) {
  const c = t.config;
  if (t.bracket) {
    const rounds = t.bracket.rounds;
    rounds.forEach((ties, r) => {
      const isFinal = r === rounds.length - 1;
      ties.forEach((tie, i) => {
        if (r > 0) {
          tie.home = rounds[r - 1][2 * i].winner || null;
          tie.away = rounds[r - 1][2 * i + 1].winner || null;
        }
        let legs = tieMatches(t, tie.id);
        if (r === 0 && tie.bye) {
          tie.winner = tie.home || tie.away;
          if (legs.length) t.matches = t.matches.filter((m) => m.tieId !== tie.id);
          return;
        }
        if (!tie.home || !tie.away) {
          tie.winner = null;
          if (legs.length) t.matches = t.matches.filter((m) => m.tieId !== tie.id);
          return;
        }
        const wantLegs = isFinal ? c.finalLegs : c.koLegs;
        const valid =
          legs.length === wantLegs &&
          legs[0].home === tie.home &&
          legs[0].away === tie.away;
        if (!valid) {
          t.matches = t.matches.filter((m) => m.tieId !== tie.id);
          legs = [];
          for (let l = 1; l <= wantLegs; l++) {
            const m = makeMatch({
              stage: 'ko',
              round: r,
              tieId: tie.id,
              leg: l,
              home: l % 2 ? tie.home : tie.away,
              away: l % 2 ? tie.away : tie.home,
            });
            legs.push(m);
            t.matches.push(m);
          }
        }
        tie.winner = tieResult(tie, legs).winner;
      });
    });
    const final = rounds[rounds.length - 1][0];
    t.championId = final.winner || null;
    t.status = t.championId ? 'finished' : 'knockout';
  } else if (t.format === 'league' && (t.status === 'group' || t.status === 'finished')) {
    const all = t.matches.length > 0 && t.matches.every(isPlayed);
    if (all) {
      t.championId = computeStandings(t, 'L')[0]?.id || null;
      t.status = 'finished';
    } else {
      t.championId = null;
      t.status = 'group';
    }
  }
  return t;
}

export function groupStageComplete(t) {
  const gm = t.matches.filter((m) => m.stage === 'group');
  return gm.length > 0 && gm.every(isPlayed);
}

// Champion, runner-up and 3rd place of a finished tournament.
// League: top 3 of the table. Knockout: final loser is 2nd; the better semi-final loser is 3rd
// (by group/league stage record when there was one, otherwise by semi-final goal difference, then goals).
export function podium(t) {
  if (!t.championId) return null;
  let runnerUpId = null;
  let thirdId = null;
  if (t.bracket) {
    const rounds = t.bracket.rounds;
    const loser = (tie) => (tie.winner ? (tie.winner === tie.home ? tie.away : tie.home) : null);
    runnerUpId = loser(rounds[rounds.length - 1][0]);
    if (rounds.length >= 2) {
      const semiLosers = rounds[rounds.length - 2]
        .map((tie) => {
          const id = loser(tie);
          if (!id) return null;
          let gf = 0;
          let ga = 0;
          for (const m of tieMatches(t, tie.id)) {
            const home = m.home === id;
            gf += Number(home ? m.hs : m.as) || 0;
            ga += Number(home ? m.as : m.hs) || 0;
          }
          return { id, gd: gf - ga, gf };
        })
        .filter(Boolean);
      const stage = {};
      t.groups.forEach((g) => computeStandings(t, g.id).forEach((r) => (stage[r.id] = r)));
      const zero = { pts: 0, gd: 0, gf: 0 };
      semiLosers.sort((a, b) => {
        const sa = stage[a.id] || zero;
        const sb = stage[b.id] || zero;
        return sb.pts - sa.pts || sb.gd - sa.gd || sb.gf - sa.gf || b.gd - a.gd || b.gf - a.gf;
      });
      thirdId = semiLosers[0]?.id || null;
    }
    // Final-only playoffs: take the best remaining player from the league table
    if (!thirdId && t.groups.length === 1) {
      thirdId = computeStandings(t, t.groups[0].id).find((r) => r.id !== t.championId && r.id !== runnerUpId)?.id || null;
    }
  } else if (t.groups.length) {
    const table = computeStandings(t, t.groups[0].id);
    runnerUpId = table[1]?.id || null;
    thirdId = table[2]?.id || null;
  }
  return { championId: t.championId, runnerUpId, thirdId };
}

export function progress(t) {
  const ms = t.matches;
  return { played: ms.filter(isPlayed).length, total: ms.length };
}

export const playerName = (t, id) => {
  if (!id) return 'TBD';
  const p = t.players.find((x) => x.id === id);
  return p ? p.name : 'Unknown';
};
export const playerTeam = (t, id) => t.players.find((x) => x.id === id)?.team || '';
