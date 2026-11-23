// Downloadable Hall of Fame posters, drawn on a canvas (1440×1920, saved as JPG).
// Style: deep navy background, a cream paint-splash, a huge chunky headline ("WINNER") and the
// player's photo in a navy/cream duotone that fades into the headline and the background.
//  - playerCard: one podium finisher (WINNER / RUNNER-UP / 3RD PLACE) with name, stats and match results
//  - podiumCard: champion, runner-up and 3rd place as clear framed photos under "WINNERS", with key results
import { computeStandings, isPlayed, playerName, playerTeam } from './engine.js';
import { roundLabel } from './prefs.jsx';

const W = 1440;
const H = 1920;
const NAVY = [14, 15, 58];
const NAVY_CSS = '#0e0f3a';

// light colour of the duotone and the splash, per finishing place
const PLACES = {
  1: { headline: 'card.wWinner', short: 'card.p1', light: [252, 211, 141], css: '#fcd38d' },
  2: { headline: 'card.wRunner', short: 'card.p2', light: [222, 228, 238], css: '#dee4ee' },
  3: { headline: 'card.wThird', short: 'card.p3', light: [246, 187, 138], css: '#f6bb8a' },
};

function fontsFor(lang) {
  return lang === 'bn'
    ? { heavy: '"Baloo Da 2", sans-serif', body: '"Anek Bangla", "Outfit", sans-serif' }
    : { heavy: '"Baloo Da 2", "Outfit", sans-serif', body: '"Outfit", "Anek Bangla", sans-serif' };
}

async function ensureFonts() {
  const specs = ['800 40px "Baloo Da 2"', '700 40px "Baloo Da 2"', '400 40px Outfit', '500 40px Outfit', '600 40px Outfit', '700 40px Outfit', '500 40px "Anek Bangla"', '600 40px "Anek Bangla"'];
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

// Small seeded random so a poster always comes out the same
function rng(seed) {
  let s = 0;
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
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

function spaced(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

function newCanvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ---------- scenery ----------
function drawBackground(ctx) {
  ctx.fillStyle = NAVY_CSS;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W);
  g.addColorStop(0, 'rgba(40,42,110,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Cream paint splash: a rough-edged block, brush drips, a dark diagonal stroke and splatter dots
function drawSplash(ctx, rand, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const pts = [];
  const step = 26;
  const jag = () => (rand() - 0.5) * 22;
  for (let px = x; px <= x + w; px += step) pts.push([px, y + jag()]);
  for (let py = y; py <= y + h; py += step) pts.push([x + w + jag() + (rand() < 0.08 ? 40 * rand() : 0), py]);
  for (let px = x + w; px >= x; px -= step) pts.push([px, y + h + jag() + (rand() < 0.1 ? 50 * rand() : 0)]);
  for (let py = y + h; py >= y; py -= step) pts.push([x + jag() - (rand() < 0.1 ? 60 * rand() : 0), py]);
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.fill();

  // brush sweeps spilling out on the left and right edges
  for (let i = 0; i < 5; i++) {
    const side = i % 2 ? x + w : x;
    const sy = y + h * (0.35 + rand() * 0.55);
    ctx.beginPath();
    ctx.ellipse(side + (side === x ? -30 : 30) * rand(), sy, 50 + rand() * 80, 10 + rand() * 18, (rand() - 0.5) * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // cream splatter outside the block
  for (let i = 0; i < 60; i++) {
    const a = rand() * Math.PI * 2;
    const d = 0.55 + rand() * 0.25;
    const sx = x + w / 2 + Math.cos(a) * w * d;
    const sy = y + h / 2 + Math.sin(a) * h * d;
    if (sy > y + h + 30) continue; // keep the area under the splash clear for names
    ctx.beginPath();
    ctx.arc(sx, sy, 3 + rand() * 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // dark splatter inside, mostly on the left like flicked paint
  ctx.fillStyle = NAVY_CSS;
  for (let i = 0; i < 70; i++) {
    const sx = x + w * (0.02 + rand() * 0.38);
    const sy = y + h * (0.15 + rand() * 0.6);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4 + rand() * 22, 4 + rand() * 16, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // a bold dark brush stroke on the right
  ctx.translate(x + w * 0.8, y + h * 0.5);
  ctx.rotate(0.32);
  ctx.beginPath();
  ctx.moveTo(-34, -h * 0.55);
  ctx.quadraticCurveTo(46, -h * 0.58, 52, -h * 0.4);
  ctx.lineTo(70, h * 0.62);
  ctx.quadraticCurveTo(10, h * 0.7, -40, h * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Navy/cream duotone of the photo, faded at the top (into the headline) and bottom (into the
// background). Without a photo, a soft head-and-shoulders silhouette stands in.
function duotonePhoto(img, size, light, { fadeTop = 0.32, fadeBottom = 0.22, fadeSides = 0 } = {}) {
  const c = newCanvas(size, size);
  const ctx = c.getContext('2d');
  if (img) {
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) * 0.3, s, s, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      let l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      l = Math.min(1, Math.max(0, (l - 0.1) * 1.32)); // more contrast so the player stands out
      d[i] = NAVY[0] + (light[0] - NAVY[0]) * l;
      d[i + 1] = NAVY[1] + (light[1] - NAVY[1]) * l;
      d[i + 2] = NAVY[2] + (light[2] - NAVY[2]) * l;
    }
    ctx.putImageData(data, 0, 0);
  } else {
    const col = `rgb(${light.map((v) => Math.round(v * 0.55 + NAVY[0] * 0.45)).join(',')})`;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.38, size * 0.17, size * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 1.02, size * 0.42, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // fade edges with alpha masks: a soft oval around the head and shoulders (hides the photo's own
  // background so the splash shows around the player), then the top/bottom/side fades
  ctx.globalCompositeOperation = 'destination-in';
  ctx.save();
  ctx.translate(size / 2, size * 0.5);
  ctx.scale(0.96, 1.2);
  const oval = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
  oval.addColorStop(0, 'rgba(0,0,0,1)');
  oval.addColorStop(0.7, 'rgba(0,0,0,1)');
  oval.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = oval;
  ctx.fillRect(-size, -size, size * 2, size * 2);
  ctx.restore();
  const v = ctx.createLinearGradient(0, 0, 0, size);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(fadeTop, 'rgba(0,0,0,1)');
  v.addColorStop(1 - fadeBottom, 'rgba(0,0,0,1)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, size, size);
  if (fadeSides) {
    const hgr = ctx.createLinearGradient(0, 0, size, 0);
    hgr.addColorStop(0, 'rgba(0,0,0,0)');
    hgr.addColorStop(fadeSides, 'rgba(0,0,0,1)');
    hgr.addColorStop(1 - fadeSides, 'rgba(0,0,0,1)');
    hgr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hgr;
    ctx.fillRect(0, 0, size, size);
  }
  return c;
}

function drawTagline(ctx, f, tour, lang) {
  const year = new Date(tour.updatedAt || Date.now()).getFullYear();
  const text = `${tour.name} ${String(tour.name).includes(String(year)) ? '' : year}`.trim();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  spaced(ctx, lang === 'bn' ? 2 : 9);
  ctx.fillText(fitText(ctx, lang === 'bn' ? text : text.toUpperCase(), W - 240, 50, 500, f.body, 24), W / 2, 150);
  spaced(ctx, 0);
}

function drawHeadline(ctx, f, text, y, maxSize = 360) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(fitText(ctx, text, W - 150, maxSize, 800, f.heavy, 120), W / 2, y);
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

// ---------- match results ----------
function hasPens(m) {
  return m.ph !== null && m.ph !== '' && m.ph !== undefined;
}

// A match seen from one player's side: goals for/against, penalties and W/D/L
function perspective(m, id) {
  const home = m.home === id;
  const gf = Number(home ? m.hs : m.as);
  const ga = Number(home ? m.as : m.hs);
  const pens = hasPens(m) && gf === ga;
  const pf = pens ? Number(home ? m.ph : m.pa) : null;
  const pa = pens ? Number(home ? m.pa : m.ph) : null;
  let res = gf > ga ? 'W' : gf < ga ? 'L' : 'D';
  if (pens) res = pf > pa ? 'W' : 'L';
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

const matchOrder = (m) => (m.stage === 'ko' ? 1000 : 0) + m.round * 10 + (m.leg || 0);

function playerStats(tour, id) {
  const st = { p: 0, w: 0, g: 0 };
  tour.matches.forEach((m) => {
    if (!isPlayed(m) || (m.home !== id && m.away !== id)) return;
    const r = perspective(m, id);
    st.p++;
    st.g += r.gf;
    if (r.res === 'W') st.w++;
  });
  return st;
}

const RESULT_COLORS = { W: '#16a34a', D: '#64748b', L: '#dc2626' };

// Semi-transparent navy panel with a cream title
function drawPanel(ctx, f, x, y, w, h, title, color) {
  ctx.fillStyle = 'rgba(8,9,40,0.82)';
  rr(ctx, x, y, w, h, 26);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = `700 30px ${f.heavy}`;
  spaced(ctx, 3);
  ctx.fillText(title, x + w / 2, y + 40);
  spaced(ctx, 0);
}

// One result row: [label]  opponent/players  score  [W/D/L]
function drawResultRow(ctx, f, tx, x, y, w, label, text, score, res) {
  const mid = y + 23;
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  rr(ctx, x, y, w, 46, 12);
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(252,211,141,0.85)';
  const labelW = Math.min(230, w * 0.33);
  ctx.fillText(fitText(ctx, label, labelW, 22, 500, f.body, 14), x + 16, mid);
  ctx.fillStyle = '#ffffff';
  const chipW = res ? 46 : 0;
  ctx.fillText(fitText(ctx, text, w - labelW - 150 - chipW, 25, 600, f.body, 15), x + 26 + labelW, mid);
  ctx.textAlign = 'right';
  ctx.font = `800 26px ${f.heavy}`;
  ctx.fillText(score, x + w - 14 - chipW - (res ? 10 : 0), mid + 1);
  if (res) {
    ctx.fillStyle = RESULT_COLORS[res];
    rr(ctx, x + w - 14 - chipW, mid - 16, chipW, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = `800 18px ${f.heavy}`;
    ctx.fillText(tx(`form.${res}`), x + w - 14 - chipW / 2, mid + 1);
  }
}

// ---------- single poster ----------
export async function playerCard({ tour, playerId, place, photo, tx, lang }) {
  await ensureFonts();
  const f = fontsFor(lang);
  const img = await loadImage(photo);
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  const rand = rng(`${tour.id}-${playerId}-poster`);
  const p = PLACES[place];
  const name = playerName(tour, playerId);
  const club = playerTeam(tour, playerId);

  drawBackground(ctx);
  drawSplash(ctx, rand, 150, 540, W - 300, 840, p.css);
  drawTagline(ctx, f, tour, lang);
  const head = tx(p.headline);
  // Bangla letters are much taller, so the Bangla headline is smaller and sits lower
  drawHeadline(ctx, f, lang === 'bn' ? head : head.toUpperCase(), lang === 'bn' ? 400 : 345, lang === 'bn' ? 230 : 360);

  // the photo overlaps the lower half of the headline and fades into it
  const size = 1080;
  const photo2 = duotonePhoto(img, size, p.light, { fadeTop: 0.22, fadeBottom: 0.22 });
  ctx.drawImage(photo2, (W - size) / 2, 320);

  // name, club and a short stats line
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(fitText(ctx, name, W - 220, 120, 800, f.heavy, 56), W / 2, 1360);
  ctx.restore();
  let y = 1436;
  if (club) {
    ctx.fillStyle = p.css;
    spaced(ctx, lang === 'bn' ? 0 : 6);
    ctx.fillText(fitText(ctx, lang === 'bn' ? club : club.toUpperCase(), W - 300, 34, 600, f.body, 20), W / 2, y);
    spaced(ctx, 0);
    y += 50;
  }
  const st = playerStats(tour, playerId);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `500 30px ${f.body}`;
  ctx.fillText(tx('card.statsLine', { p: st.p, w: st.w, g: st.g }), W / 2, y);

  // match results: two columns when there are many
  const ms = tour.matches.filter((m) => isPlayed(m) && (m.home === playerId || m.away === playerId)).sort((a, b) => matchOrder(a) - matchOrder(b));
  // match results, in one or two columns; the panel is sized to its rows
  const area = y + 44;
  const rowH = 54;
  const maxRows = Math.floor((H - 50 - 16 - (area + 74)) / rowH);
  const cols = ms.length > maxRows ? 2 : 1;
  let rows = ms;
  if (ms.length > maxRows * cols) {
    const limit = maxRows * cols - 1; // one line for "+N more"
    const ko = ms.filter((m) => m.stage === 'ko').slice(-limit);
    const room = limit - ko.length;
    rows = [...(room > 0 ? ms.filter((m) => m.stage !== 'ko').slice(-room) : []), ...ko];
  }
  const perCol = cols === 2 ? Math.ceil(rows.length / 2) : rows.length;
  const hidden = ms.length - rows.length;
  const panelH = 74 + Math.max(1, perCol + (hidden ? 1 : 0)) * rowH + 16;
  const top = area + Math.max(0, (H - 50 - area - panelH) / 2); // centred in the space left
  const title = tx(place === 1 ? 'card.road' : 'card.history');
  drawPanel(ctx, f, 90, top, W - 180, panelH, lang === 'bn' ? title : title.toUpperCase(), p.css);
  const startY = top + 74;
  const colW = cols === 2 ? (W - 180 - 60) / 2 : W - 300;
  const colX = cols === 2 ? [110, 110 + colW + 20] : [150];
  rows.forEach((m, i) => {
    const r = perspective(m, playerId);
    const c = cols === 2 ? Math.floor(i / perCol) : 0;
    const score = `${r.gf}-${r.ga}${r.pf !== null ? ` (${r.pf}-${r.pa})` : ''}`;
    drawResultRow(ctx, f, tx, colX[c], startY + (i % perCol) * rowH, colW, matchLabel(tx, tour, m), `${tx('card.vs')} ${playerName(tour, r.opp)}`, score, r.res);
  });
  if (hidden > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `500 22px ${f.body}`;
    ctx.fillText(tx('card.more', { n: hidden }), W / 2, startY + perCol * rowH + 20);
  }
  return canvas;
}

// ---------- podium poster: clear photos in frames + key results ----------
function drawPhotoFrame(ctx, f, img, name, x, y, w, h, place) {
  const p = PLACES[place];
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = p.css;
  rr(ctx, x - 10, y - 10, w + 20, h + 20, 34);
  ctx.fill();
  ctx.restore();
  ctx.save();
  rr(ctx, x, y, w, h, 26);
  ctx.clip();
  if (img) {
    const fr = w / h;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (sw / sh > fr) sw = sh * fr;
    else sh = sw / fr;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * 0.3, sw, sh, x, y, w, h);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#2a2c7a');
    g.addColorStop(1, NAVY_CSS);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = p.css;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(w * 0.38)}px ${f.heavy}`;
    const ini = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
    ctx.fillText(ini, x + w / 2, y + h / 2 + 8);
  }
  ctx.restore();
}

// Knockout matches from the final backwards, topped up with the podium players' group games
function keyResults(tx, tour, pod, max) {
  if (tour.bracket) {
    const ko = tour.matches.filter((m) => m.stage === 'ko' && isPlayed(m)).sort((a, b) => matchOrder(b) - matchOrder(a));
    const ids = [pod.championId, pod.runnerUpId, pod.thirdId].filter(Boolean);
    const group = tour.matches
      .filter((m) => m.stage !== 'ko' && isPlayed(m) && (ids.includes(m.home) || ids.includes(m.away)))
      .sort((a, b) => matchOrder(b) - matchOrder(a));
    return [...ko, ...group].slice(0, max).map((m) => ({
      label: matchLabel(tx, tour, m),
      text: `${playerName(tour, m.home)}  ${tx('card.vs')}  ${playerName(tour, m.away)}`,
      score: `${m.hs}-${m.as}${hasPens(m) ? ` (${m.ph}-${m.pa})` : ''}`,
    }));
  }
  // league formats: the final table's top rows
  const g = tour.groups[0];
  return computeStandings(tour, g.id)
    .slice(0, max)
    .map((r, i) => ({
      label: `#${i + 1}`,
      text: `${playerName(tour, r.id)}  ·  ${r.w}-${r.d}-${r.l}`,
      score: tx('card.pts', { n: r.pts }),
    }));
}

export async function podiumCard({ tour, pod, photos, tx, lang }) {
  await ensureFonts();
  const f = fontsFor(lang);
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  const rand = rng(`${tour.id}-podium-poster`);

  drawBackground(ctx);
  drawSplash(ctx, rand, 120, 560, W - 240, 660, PLACES[1].css);
  drawTagline(ctx, f, tour, lang);
  const head = tx('card.winners');
  drawHeadline(ctx, f, lang === 'bn' ? head : head.toUpperCase(), lang === 'bn' ? 400 : 345, lang === 'bn' ? 230 : 360);

  const slots = [
    { place: 2, id: pod.runnerUpId, x: 64, y: 680, w: 400, h: 500 },
    { place: 3, id: pod.thirdId, x: W - 64 - 400, y: 720, w: 400, h: 500 },
    { place: 1, id: pod.championId, x: (W - 560) / 2, y: 560, w: 560, h: 680 },
  ].filter((s) => s.id);
  const imgs = await Promise.all(slots.map((s) => loadImage(photos[s.id])));
  slots.forEach((s, i) => drawPhotoFrame(ctx, f, imgs[i], playerName(tour, s.id), s.x, s.y, s.w, s.h, s.place));

  // place tag on top of each frame, name below
  slots.forEach((s) => {
    const p = PLACES[s.place];
    const cx = s.x + s.w / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${s.place === 1 ? 44 : 36}px ${f.heavy}`;
    const tag = tx(p.short);
    const tw = ctx.measureText(tag).width + 48;
    const th = s.place === 1 ? 62 : 52;
    const ty = s.y - 4;
    ctx.fillStyle = NAVY_CSS;
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2 + 14, ty - th / 2);
    ctx.lineTo(cx + tw / 2, ty - th / 2);
    ctx.lineTo(cx + tw / 2 - 14, ty + th / 2);
    ctx.lineTo(cx - tw / 2, ty + th / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.css;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = p.css;
    ctx.fillText(tag, cx, ty + 3);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fitText(ctx, playerName(tour, s.id), s.w + 30, s.place === 1 ? 72 : 54, 800, f.heavy, 28), cx, s.y + s.h + (s.place === 1 ? 62 : 54));
    ctx.restore();
    const club = playerTeam(tour, s.id);
    if (club) {
      ctx.fillStyle = p.css;
      ctx.font = `600 26px ${f.body}`;
      ctx.fillText(fitText(ctx, club, s.w, 26, 600, f.body, 16), cx, s.y + s.h + (s.place === 1 ? 116 : 100));
    }
  });

  // key results
  // the panel is sized to its rows and sits at the bottom
  const rowH = 56;
  const results = keyResults(tx, tour, pod, 6);
  const bottom = H - 50;
  const top = Math.max(1400, bottom - (80 + results.length * rowH + 14));
  const title = tx(tour.bracket ? 'card.keyResults' : 'card.finalTable');
  drawPanel(ctx, f, 90, top, W - 180, bottom - top, lang === 'bn' ? title : title.toUpperCase(), PLACES[1].css);
  results.forEach((r, i) => drawResultRow(ctx, f, tx, 120, top + 76 + i * rowH, W - 240, r.label, r.text, r.score, null));
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
