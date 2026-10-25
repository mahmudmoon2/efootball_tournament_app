// Downloadable Hall of Fame photo cards, drawn on a canvas (1440×1800, saved as JPG).
//  - playerCard: one podium finisher, big portrait photo, stats and match history
//  - podiumCard: champion, runner-up and 3rd place together on a 3D podium
// Both use a celebration look: "Congratulations" headline, spotlights, confetti and sparkles.
import { isPlayed, playerName, playerTeam } from './engine.js';
import { roundLabel } from './prefs.jsx';

const W = 1440;
const H = 1800;

const PLACES = {
  1: {
    key: 'card.champion',
    metal: ['#fff6cc', '#f5b81c', '#fde68a', '#b7791f', '#fff1b8'],
    text: '#fcd34d',
    deep: '#7a4b06',
    medal: '🏆',
    block: ['#fde68a', '#e09a12', '#8a5a0a'],
  },
  2: {
    key: 'card.runnerUp',
    metal: ['#ffffff', '#a7b4c8', '#eef2f7', '#5b6b82', '#f8fafc'],
    text: '#e2e8f0',
    deep: '#334155',
    medal: '🥈',
    block: ['#f1f5f9', '#9aa8bd', '#4b5a70'],
  },
  3: {
    key: 'card.third',
    metal: ['#ffe4c7', '#cf7a35', '#f6c08f', '#7c3f12', '#ffe0bd'],
    text: '#f6c08f',
    deep: '#5a2a0b',
    medal: '🥉',
    block: ['#fbd5b0', '#c2702e', '#6b3410'],
  },
};

const CONFETTI = ['#fbbf24', '#fde68a', '#3cf29a', '#38bdf8', '#f472b6', '#ffffff', '#a78bfa', '#fb7185', '#facc15'];
const AVATAR_HUES = [152, 199, 262, 330, 28, 48, 180, 290];

function fontsFor(lang) {
  return lang === 'bn'
    ? { display: '"Baloo Da 2", "Oxanium", sans-serif', body: '"Anek Bangla", "Outfit", sans-serif' }
    : { display: '"Oxanium", "Baloo Da 2", sans-serif', body: '"Outfit", "Anek Bangla", sans-serif' };
}

async function ensureFonts() {
  const specs = ['700 40px Oxanium', '600 40px Oxanium', '400 40px Outfit', '600 40px Outfit', '700 40px Outfit', '700 40px "Baloo Da 2"', '800 40px "Baloo Da 2"', '400 40px "Anek Bangla"', '600 40px "Anek Bangla"'];
  await Promise.all(specs.map((s) => document.fonts.load(s).catch(() => null)));
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Small seeded random so a tournament always gets the same confetti
function rng(seed) {
  let s = 0;
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxW, size, weight, family, min = 22) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > min) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  let out = text;
  while (ctx.measureText(out).width > maxW && out.length > 1) out = out.slice(0, -2) + '…';
  return out;
}

function metalGradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

function sparkle(ctx, x, y, size, color = '#fff7d6') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.12, -size * 0.12, size, 0);
  ctx.quadraticCurveTo(size * 0.12, size * 0.12, 0, size);
  ctx.quadraticCurveTo(-size * 0.12, size * 0.12, -size, 0);
  ctx.quadraticCurveTo(-size * 0.12, -size * 0.12, 0, -size);
  ctx.fill();
  ctx.restore();
}

// ---------- shared scenery ----------
function drawStage(ctx, rand, accent) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a0f3d');
  bg.addColorStop(0.45, '#0f0b2a');
  bg.addColorStop(1, '#05040f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // coloured haze
  const haze = [
    [220, 300, 700, 'rgba(168,85,247,0.28)'],
    [1240, 420, 700, 'rgba(56,189,248,0.20)'],
    [W / 2, 900, 900, accent],
  ];
  haze.forEach(([x, y, r, c]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });

  // spotlights from the top
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  [
    [W * 0.18, -40, W * 0.42, 1500, 0.1],
    [W * 0.82, -40, W * 0.58, 1500, 0.1],
    [W * 0.5, -60, W * 0.5, 1400, 0.08],
  ].forEach(([x1, y1, x2, y2, a]) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, `rgba(255,248,220,${a * 2.4})`);
    g.addColorStop(1, 'rgba(255,248,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x1 - 40, y1);
    ctx.lineTo(x1 + 40, y1);
    ctx.lineTo(x2 + 330, y2);
    ctx.lineTo(x2 - 330, y2);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  // bokeh
  for (let i = 0; i < 26; i++) {
    const x = rand() * W;
    const y = rand() * H * 0.9;
    const r = 10 + rand() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = CONFETTI[Math.floor(rand() * CONFETTI.length)];
    g.addColorStop(0, `${c}55`);
    g.addColorStop(1, `${c}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function insideAny(x, y, rects, pad = 0) {
  return rects.some(([rx, ry, rw, rh]) => x > rx - pad && x < rx + rw + pad && y > ry - pad && y < ry + rh + pad);
}

function drawConfetti(ctx, rand, count, avoid = [], yMax = H) {
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * yMax;
    if (insideAny(x, y, avoid, 10)) continue;
    const c = CONFETTI[Math.floor(rand() * CONFETTI.length)];
    const kind = rand();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI * 2);
    ctx.fillStyle = c;
    ctx.strokeStyle = c;
    ctx.globalAlpha = 0.65 + rand() * 0.35;
    if (kind < 0.5) {
      const w = 12 + rand() * 16;
      ctx.fillRect(-w / 2, -4, w, 8 + rand() * 6);
    } else if (kind < 0.75) {
      ctx.beginPath();
      ctx.arc(0, 0, 4 + rand() * 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.bezierCurveTo(-8, -16, 8, 16, 20, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawFrame(ctx) {
  const g = metalGradient(ctx, 0, 0, W, H, ['#fde68a', '#b45309', '#fff1b8', '#b45309', '#fde68a']);
  ctx.strokeStyle = g;
  ctx.lineWidth = 8;
  rr(ctx, 26, 26, W - 52, H - 52, 46);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(253,230,138,0.25)';
  ctx.lineWidth = 2;
  rr(ctx, 46, 46, W - 92, H - 92, 34);
  ctx.stroke();
}

// Big gold "CONGRATULATIONS" + tournament ribbon
function drawHeadline(ctx, f, tx, tour, lang, dateStr, top = 110) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const word = tx('card.congrats');
  const text = lang === 'bn' ? word : word.toUpperCase();
  const size = lang === 'bn' ? 120 : 104;
  ctx.font = `800 ${size}px ${f.display}`;
  const fitted = fitText(ctx, text, W - 200, size, 800, f.display, 60);
  const tw = ctx.measureText(fitted).width;
  ctx.save();
  ctx.shadowColor = 'rgba(251,191,36,0.75)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = metalGradient(ctx, W / 2 - tw / 2, top - 50, tw, 100, ['#fff6cc', '#fbbf24', '#fff1b8', '#d97706']);
  ctx.fillText(fitted, W / 2, top);
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(122,75,6,0.6)';
  ctx.strokeText(fitted, W / 2, top);
  sparkle(ctx, W / 2 - tw / 2 - 46, top - 30, 22);
  sparkle(ctx, W / 2 + tw / 2 + 40, top + 18, 16);
  sparkle(ctx, W / 2 + tw / 2 + 74, top - 34, 10);

  // tournament ribbon
  const ry = top + 112;
  ctx.font = `700 44px ${f.display}`;
  const name = fitText(ctx, tour.name, W - 420, 44, 700, f.display, 26);
  const nw = Math.max(ctx.measureText(name).width + 120, 520);
  const rx = W / 2 - nw / 2;
  // tails
  ctx.fillStyle = '#7a1f2b';
  [
    [rx - 70, rx + 10],
    [rx + nw + 70, rx + nw - 10],
  ].forEach(([outer, inner]) => {
    ctx.beginPath();
    ctx.moveTo(inner, ry - 26);
    ctx.lineTo(outer, ry - 26);
    ctx.lineTo(outer + (outer < inner ? 26 : -26), ry + 8);
    ctx.lineTo(outer, ry + 42);
    ctx.lineTo(inner, ry + 42);
    ctx.closePath();
    ctx.fill();
  });
  const rg = ctx.createLinearGradient(0, ry - 40, 0, ry + 40);
  rg.addColorStop(0, '#e11d48');
  rg.addColorStop(1, '#9f1239');
  ctx.fillStyle = rg;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  rr(ctx, rx, ry - 38, nw, 76, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(253,230,138,0.7)';
  ctx.lineWidth = 3;
  rr(ctx, rx + 8, ry - 30, nw - 16, 60, 7);
  ctx.stroke();
  ctx.fillStyle = '#fff7e0';
  ctx.fillText(name, W / 2, ry + 1);

  // format · date
  ctx.font = `500 30px ${f.body}`;
  ctx.fillStyle = '#d6c79a';
  const sub = [tour.format ? tx(`format.${tour.format}.name`) : '', dateStr].filter(Boolean).join('  ·  ');
  ctx.fillText(sub, W / 2, ry + 82);
  return ry + 82;
}

function drawFooter(ctx, f) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 28px ${f.display}`;
  ctx.fillStyle = 'rgba(253,230,138,0.7)';
  ctx.fillText(`⚽  eFootball Arena  ·  ${location.host}`, W / 2, H - 82);
}

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// Rounded portrait photo in a metallic frame with a glow; initials on a gradient when there is no photo.
function drawPortraitRect(ctx, f, img, name, x, y, w, h, place, radius = 42) {
  const p = PLACES[place];
  const b = Math.max(10, Math.round(w * 0.014));
  ctx.save();
  ctx.shadowColor = place === 1 ? 'rgba(251,191,36,0.7)' : 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = place === 1 ? 70 : 50;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = metalGradient(ctx, x, y, w, h, p.metal);
  rr(ctx, x - b, y - b, w + b * 2, h + b * 2, radius + b);
  ctx.fill();
  ctx.restore();

  ctx.save();
  rr(ctx, x, y, w, h, radius);
  ctx.clip();
  if (img) {
    const ir = img.naturalWidth / img.naturalHeight;
    const fr = w / h;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (ir > fr) sw = sh * fr;
    else sh = sw / fr;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2.6, sw, sh, x, y, w, h);
  } else {
    let hh = 0;
    for (const c of name || '?') hh = (hh * 31 + c.charCodeAt(0)) >>> 0;
    const hue = AVATAR_HUES[hh % AVATAR_HUES.length];
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, `hsl(${hue} 80% 60%)`);
    g.addColorStop(1, `hsl(${hue} 70% 22%)`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(w * 0.36)}px ${f.display}`;
    ctx.fillText(initials(name), x + w / 2, y + h * 0.48);
  }
  // soft vignette at the bottom so the ribbon reads well
  const v = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(x, y, w, h);
  // glossy edge
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  rr(ctx, x + 1, y + 1, w - 2, h - 2, radius);
  ctx.stroke();
  ctx.restore();
}

// Ribbon banner across the bottom of a photo with the finishing position
function drawPlaceRibbon(ctx, f, tx, cx, cy, w, place, lang) {
  const p = PLACES[place];
  const h = Math.round(w * 0.14);
  const x = cx - w / 2;
  ctx.fillStyle = p.deep;
  [
    [x - h * 0.7, x + 6],
    [x + w + h * 0.7, x + w - 6],
  ].forEach(([outer, inner]) => {
    ctx.beginPath();
    ctx.moveTo(inner, cy - h * 0.32);
    ctx.lineTo(outer, cy - h * 0.32);
    ctx.lineTo(outer + (outer < inner ? h * 0.32 : -h * 0.32), cy + h * 0.1);
    ctx.lineTo(outer, cy + h * 0.52);
    ctx.lineTo(inner, cy + h * 0.52);
    ctx.closePath();
    ctx.fill();
  });
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = metalGradient(ctx, x, cy - h / 2, w, h, p.metal);
  rr(ctx, x, cy - h / 2, w, h, 12);
  ctx.fill();
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = tx(p.key);
  const text = lang === 'bn' ? label : label.toUpperCase().split('').join(' ');
  ctx.fillStyle = p.deep;
  ctx.fillText(fitText(ctx, `${p.medal}  ${text}  ${p.medal}`, w - 50, Math.round(h * 0.5), 800, f.display, 18), cx, cy + 3);
}

function dateText(tour, locale) {
  return tour.updatedAt ? new Date(tour.updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function newCanvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

// ---------- player card ----------
function playerMatches(tour, id) {
  const order = (m) => (m.stage === 'ko' ? 1000 : 0) + m.round * 10 + (m.leg || 0);
  return tour.matches.filter((m) => isPlayed(m) && (m.home === id || m.away === id)).sort((a, b) => order(a) - order(b));
}

function perspective(m, id) {
  const home = m.home === id;
  const gf = Number(home ? m.hs : m.as);
  const ga = Number(home ? m.as : m.hs);
  const hasPens = m.ph !== null && m.ph !== '' && m.ph !== undefined && gf === ga;
  const pf = hasPens ? Number(home ? m.ph : m.pa) : null;
  const pa = hasPens ? Number(home ? m.pa : m.ph) : null;
  let res = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  if (hasPens) res = pf > pa ? 'W' : 'L';
  return { opp: home ? m.away : m.home, gf, ga, pf, pa, res };
}

function matchLabel(tx, tour, m) {
  if (m.stage === 'ko') {
    const legs = tour.matches.filter((x) => x.tieId === m.tieId).length;
    return `${roundLabel(tx, m.round, tour.bracket.rounds.length)}${legs > 1 ? ` ${m.leg}` : ''}`;
  }
  if (tour.groups.length > 1) return `${tx('group', { id: m.group })} · ${tx('mdShort', { n: m.round })}`;
  return tx(tour.format === 'swiss_knockout' ? 'roundN' : 'matchday', { n: m.round });
}

export async function playerCard({ tour, playerId, place, photo, tx, lang, locale }) {
  await ensureFonts();
  const f = fontsFor(lang);
  const img = await loadImage(photo);
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  const rand = rng(`${tour.id}-${playerId}`);
  const p = PLACES[place];
  const name = playerName(tour, playerId);
  const club = playerTeam(tour, playerId);
  const accent = place === 1 ? 'rgba(251,191,36,0.30)' : place === 2 ? 'rgba(203,213,225,0.22)' : 'rgba(234,140,70,0.26)';

  // photo box
  const pw = 860;
  const ph = 730;
  const px = (W - pw) / 2;
  const py = 360;

  drawStage(ctx, rand, accent);
  drawConfetti(ctx, rand, 150, [[px - 40, py - 40, pw + 80, ph + 80]], py + ph);
  const headBottom = drawHeadline(ctx, f, tx, tour, lang, dateText(tour, locale));

  drawPortraitRect(ctx, f, img, name, px, Math.max(py, headBottom + 50), pw, ph, place);
  const photoTop = Math.max(py, headBottom + 50);
  // trophy / medal badge on the corner
  ctx.save();
  ctx.translate(px + pw - 40, photoTop + 30);
  ctx.rotate(0.18);
  ctx.font = '150px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 30;
  ctx.fillText(p.medal, 0, 0);
  ctx.restore();
  sparkle(ctx, px + 30, photoTop + 40, 26);
  sparkle(ctx, px + pw - 120, photoTop + ph - 160, 18);

  const ribbonY = photoTop + ph - 6;
  drawPlaceRibbon(ctx, f, tx, W / 2, ribbonY, 760, place, lang);

  // name + club
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.fillStyle = place === 1 ? metalGradient(ctx, 300, ribbonY + 80, 840, 120, ['#fff6cc', '#fbbf24', '#fde68a']) : '#ffffff';
  ctx.shadowColor = place === 1 ? 'rgba(251,191,36,0.6)' : 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 30;
  const nameY = ribbonY + 118;
  ctx.fillText(fitText(ctx, name, W - 240, 100, 700, f.display, 48), W / 2, nameY);
  ctx.restore();
  let y = nameY + 58;
  if (club) {
    ctx.font = `500 32px ${f.body}`;
    ctx.fillStyle = '#d6c79a';
    ctx.fillText(fitText(ctx, club, W - 300, 32, 500, f.body), W / 2, y);
    y += 50;
  } else {
    y += 10;
  }

  // compact stats line
  const ms = playerMatches(tour, playerId);
  const st = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
  ms.forEach((m) => {
    const r = perspective(m, playerId);
    st.p++;
    st.gf += r.gf;
    st.ga += r.ga;
    if (r.gf > r.ga) st.w++;
    else if (r.gf < r.ga) st.l++;
    else st.d++;
  });
  const stats = [
    [st.p, 'st.p'],
    [st.w, 'st.w'],
    [st.d, 'st.d'],
    [st.l, 'st.l'],
    [st.gf, 'card.gf'],
    [st.ga, 'card.ga'],
  ];
  const chipW = 176;
  const gap = 14;
  const totalW = stats.length * chipW + (stats.length - 1) * gap;
  stats.forEach(([v, k], i) => {
    const cx = (W - totalW) / 2 + i * (chipW + gap);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    rr(ctx, cx, y, chipW, 76, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(253,230,138,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 40px ${f.display}`;
    ctx.fillText(String(v), cx + chipW / 2, y + 28);
    ctx.fillStyle = '#d6c79a';
    ctx.font = `600 20px ${f.body}`;
    ctx.fillText(fitText(ctx, tx(k).toUpperCase(), chipW - 16, 19, 600, f.body, 14), cx + chipW / 2, y + 58);
  });
  y += 98;

  // match history: two compact columns
  const bottom = H - 120;
  ctx.textAlign = 'center';
  ctx.fillStyle = p.text;
  ctx.font = `700 28px ${f.display}`;
  const title = tx(place === 1 ? 'card.road' : 'card.history');
  ctx.fillText(`—  ${lang === 'bn' ? title : title.toUpperCase()}  —`, W / 2, y + 6);
  y += 36;
  const rowH = 52;
  const perCol = Math.max(1, Math.floor((bottom - y) / rowH));
  const cols = ms.length > perCol ? 2 : 1;
  const maxRows = perCol * cols;
  let rows = ms;
  if (ms.length > maxRows) {
    const limit = maxRows - 1;
    const ko = ms.filter((m) => m.stage === 'ko').slice(-limit);
    const groupRoom = limit - ko.length;
    const group = groupRoom > 0 ? ms.filter((m) => m.stage !== 'ko').slice(-groupRoom) : [];
    rows = [...group, ...ko];
  }
  const hidden = ms.length - rows.length;
  const colW = cols === 2 ? 600 : 860;
  const colX = cols === 2 ? [W / 2 - colW - 14, W / 2 + 14] : [(W - colW) / 2];
  rows.forEach((m, i) => {
    const r = perspective(m, playerId);
    const c = cols === 2 ? Math.floor(i / perCol) : 0;
    const ry = y + (i % perCol) * rowH;
    const x = colX[c];
    ctx.fillStyle = 'rgba(10,8,30,0.55)';
    rr(ctx, x, ry, colW, rowH - 8, 14);
    ctx.fill();
    const mid = ry + (rowH - 8) / 2;
    ctx.textAlign = 'left';
    ctx.font = `500 21px ${f.body}`;
    ctx.fillStyle = '#d6c79a';
    const labelW = cols === 2 ? 180 : 240;
    ctx.fillText(fitText(ctx, matchLabel(tx, tour, m), labelW, 21, 500, f.body, 14), x + 18, mid);
    ctx.font = `600 25px ${f.body}`;
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(fitText(ctx, playerName(tour, r.opp), colW - labelW - 210, 25, 600, f.body, 16), x + 26 + labelW, mid);
    // score + result
    const chip = { W: '#16a34a', D: '#64748b', L: '#dc2626' }[r.res];
    ctx.fillStyle = chip;
    rr(ctx, x + colW - 58, mid - 17, 42, 34, 9);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `700 19px ${f.display}`;
    ctx.fillText(tx(`form.${r.res}`), x + colW - 37, mid + 1);
    ctx.textAlign = 'right';
    ctx.font = `700 28px ${f.display}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${r.gf}-${r.ga}${r.pf !== null ? ` (${r.pf}-${r.pa})` : ''}`, x + colW - 72, mid + 1);
  });
  if (hidden > 0) {
    ctx.textAlign = 'center';
    ctx.font = `500 22px ${f.body}`;
    ctx.fillStyle = '#a8a29e';
    ctx.fillText(tx('card.more', { n: hidden }), W / 2, y + perCol * rowH + 8);
  }

  // a few more pieces in the side margins only, so names and results stay clean
  drawConfetti(ctx, rand, 60, [[150, photoTop - 60, W - 300, H]], H - 60);
  drawFrame(ctx);
  drawFooter(ctx, f);
  return canvas;
}

// ---------- podium card ----------
export async function podiumCard({ tour, pod, photos, tx, lang, locale }) {
  await ensureFonts();
  const f = fontsFor(lang);
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  const rand = rng(`${tour.id}-podium`);

  const slots = [
    { place: 2, id: pod.runnerUpId, cx: 300, w: 360, h: 430, blockTop: 1250 },
    { place: 1, id: pod.championId, cx: W / 2, w: 450, h: 520, blockTop: 1150 },
    { place: 3, id: pod.thirdId, cx: W - 300, w: 340, h: 405, blockTop: 1310 },
  ].filter((s) => s.id);
  slots.forEach((s) => {
    s.x = s.cx - s.w / 2;
    s.y = s.blockTop - 215 - s.h;
  });
  const imgs = await Promise.all(slots.map((s) => loadImage(photos[s.id])));

  drawStage(ctx, rand, 'rgba(251,191,36,0.28)');
  drawConfetti(
    ctx,
    rand,
    170,
    slots.map((s) => [s.x - 30, s.y - 30, s.w + 60, s.h + 200]),
    1250
  );
  drawHeadline(ctx, f, tx, tour, lang, dateText(tour, locale));

  // 3D podium blocks
  const baseY = 1600;
  const bw = 400;
  slots.forEach((s) => {
    const p = PLACES[s.place];
    const x = s.cx - bw / 2;
    const depth = 50;
    ctx.beginPath();
    ctx.moveTo(x, s.blockTop);
    ctx.lineTo(x + bw, s.blockTop);
    ctx.lineTo(x + bw - 34, s.blockTop - depth);
    ctx.lineTo(x + 34, s.blockTop - depth);
    ctx.closePath();
    ctx.fillStyle = p.block[0];
    ctx.fill();
    const fg = ctx.createLinearGradient(0, s.blockTop, 0, baseY);
    fg.addColorStop(0, p.block[1]);
    fg.addColorStop(1, p.block[2]);
    ctx.fillStyle = fg;
    ctx.fillRect(x, s.blockTop, bw, baseY - s.blockTop);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x, s.blockTop, bw, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + bw - 30, s.blockTop, 30, baseY - s.blockTop);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${s.place === 1 ? 180 : 140}px ${f.display}`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 20;
    ctx.fillText(String(s.place), s.cx, s.blockTop + (baseY - s.blockTop) / 2 + 8);
    ctx.shadowBlur = 0;
  });
  const fl = ctx.createLinearGradient(0, baseY, 0, baseY + 70);
  fl.addColorStop(0, 'rgba(0,0,0,0.6)');
  fl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fl;
  ctx.fillRect(80, baseY, W - 160, 70);

  // portraits standing on the blocks, with name plates
  slots.forEach((s, i) => {
    const name = playerName(tour, s.id);
    drawPortraitRect(ctx, f, imgs[i], name, s.x, s.y, s.w, s.h, s.place, 34);
    drawPlaceRibbon(ctx, f, tx, s.cx, s.y + s.h - 4, s.w + 30, s.place, lang);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = s.place === 1 ? metalGradient(ctx, s.x, s.y + s.h + 40, s.w, 80, ['#fff6cc', '#fbbf24', '#fde68a']) : '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    ctx.fillText(fitText(ctx, name, s.w + 40, s.place === 1 ? 62 : 46, 700, f.display, 24), s.cx, s.y + s.h + 96);
    ctx.restore();
  });
  // a crown of sparkles above the champion
  const champ = slots.find((s) => s.place === 1);
  if (champ) {
    sparkle(ctx, champ.cx, champ.y - 60, 30);
    sparkle(ctx, champ.cx - 120, champ.y - 30, 18);
    sparkle(ctx, champ.cx + 120, champ.y - 30, 18);
  }

  drawConfetti(ctx, rand, 30, slots.map((s) => [s.x - 40, s.y - 80, s.w + 80, H]), H);
  drawFrame(ctx);
  drawFooter(ctx, f);
  return canvas;
}

const safeName = (s) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 80);

export function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName(filename)}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        resolve(blob);
      },
      'image/jpeg',
      0.94
    );
  });
}
