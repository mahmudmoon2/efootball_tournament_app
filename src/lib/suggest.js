// Suggest tournament styles based on number of players.
import { isPow2, nextPow2, prevPow2 } from './engine.js';

const rrMatches = (n, legs) => ((n * (n - 1)) / 2) * legs;
const koMatches = (n, legs = 1) => Math.max(0, (n - 1) * legs - (legs > 1 ? legs - 1 : 0)); // final single leg

function bestGroupCount(n) {
  let best = 2;
  let bestScore = Infinity;
  for (let g = 2; g <= Math.floor(n / 3); g++) {
    const size = n / g;
    const score = Math.abs(size - 4) + (isPow2(g) ? 0 : 0.75) + (n % g ? 0.5 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return best;
}

function groupStageMatches(n, g, legs) {
  let total = 0;
  const base = Math.floor(n / g);
  const extra = n % g;
  for (let i = 0; i < g; i++) total += rrMatches(base + (i < extra ? 1 : 0), legs);
  return total;
}

export function suggestFormats(n) {
  if (n < 2) return [];
  const out = [];

  // League
  {
    const legs = n <= 5 ? 2 : 1;
    let score = n <= 4 ? 95 : n <= 6 ? 85 : n <= 8 ? 65 : n <= 12 ? 40 : 15;
    if (n === 2) score = 100;
    out.push({
      format: 'league',
      config: { legs },
      matches: rrMatches(n, legs),
      score,
      reason:
        n <= 6
          ? { key: 'sg.leagueFair', vars: { n, how: { key: legs === 2 ? 'sg.homeAway' : 'sg.once' } } }
          : { key: 'sg.leagueLong', vars: { m: rrMatches(n, legs) } },
    });
  }

  // League + Playoffs
  if (n >= 3) {
    const playoffTeams = n >= 10 ? 8 : n >= 4 ? 4 : 2;
    const legs = n <= 5 ? 2 : 1;
    let score = n >= 5 && n <= 10 ? 88 : n === 4 ? 70 : n <= 14 ? 55 : 25;
    out.push({
      format: 'league_playoff',
      config: { legs, playoffTeams },
      matches: rrMatches(n, legs) + koMatches(playoffTeams),
      score,
      reason: {
        key: 'sg.lp',
        vars: { n: playoffTeams, what: { key: playoffTeams === 2 ? 'sg.aFinal' : playoffTeams === 4 ? 'sg.semisFinal' : 'sg.fromQf' } },
      },
    });
  }

  // Knockout
  {
    const koLegs = n >= 4 && n <= 8 ? 2 : 1;
    let score = isPow2(n) ? (n >= 8 ? 80 : 60) : n >= 6 ? 50 : 30;
    if (n > 32) score = 75;
    const byes = nextPow2(n) - n;
    out.push({
      format: 'knockout',
      config: { koLegs, finalLegs: 1 },
      matches: koMatches(n, koLegs),
      score,
      reason: isPow2(n)
        ? { key: 'sg.koPerfect', vars: { n } }
        : { key: byes === 1 ? 'sg.koBye1' : 'sg.koByes', vars: { b: byes } },
    });
  }

  // World Cup style
  if (n >= 6) {
    const groupCount = bestGroupCount(n);
    const adv = 2;
    const q = groupCount * adv;
    let score = 45;
    if (n >= 8 && n % 4 === 0 && isPow2(n / 4)) score = 95;
    else if (n >= 8 && n <= 40) score = isPow2(q) ? 80 : 65;
    out.push({
      format: 'groups_knockout',
      config: { groupCount, advancePerGroup: adv, legs: 1 },
      matches: groupStageMatches(n, groupCount, 1) + koMatches(q),
      score,
      reason: {
        key: 'sg.wc',
        vars: { g: groupCount, s: Math.round(n / groupCount), a: adv, q, byes: { key: isPow2(q) ? 'empty' : 'sg.withByes' } },
      },
    });
  }

  // Champions League (Swiss)
  if (n >= 6) {
    const swissRounds = Math.min(n - 1, n >= 24 ? 8 : n >= 12 ? 6 : n >= 8 ? 5 : 4);
    const swissQualifiers = Math.min(16, prevPow2(Math.floor(n / 2)) || 2);
    let score = n >= 16 ? 92 : n >= 12 ? 85 : n >= 8 ? 60 : 35;
    if (n % 2) score -= 15;
    out.push({
      format: 'swiss_knockout',
      config: { swissRounds, swissQualifiers, koLegs: n >= 12 ? 2 : 1, finalLegs: 1 },
      matches: Math.floor(n / 2) * swissRounds + koMatches(swissQualifiers, n >= 12 ? 2 : 1),
      score,
      reason: { key: 'sg.swiss', vars: { r: swissRounds, q: swissQualifiers, odd: { key: n % 2 ? 'sg.odd' : 'empty' } } },
    });
  }

  return out.sort((a, b) => b.score - a.score);
}
