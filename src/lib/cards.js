// Downloadable Hall of Fame posters, drawn on a canvas (1440×1920, saved as JPG).
// Style: deep navy background, a cream paint-splash, a huge chunky headline ("WINNER") and the
// player's photo in a navy/cream duotone that fades into the headline and the background.
//  - playerCard: one podium finisher (WINNER / RUNNER-UP / 3RD PLACE) with name and a stats line
//  - podiumCard: champion, runner-up and 3rd place together under "WINNERS"
import { isPlayed, playerName, playerTeam } from './engine.js';

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

function drawFooter(ctx, f, lang) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `500 34px ${f.body}`;
  spaced(ctx, 4);
  ctx.fillText(`${location.host}  |  eFootball Arena`, W / 2, H - 78);
  spaced(ctx, 0);
}

function playerStats(tour, id) {
  const st = { p: 0, w: 0, g: 0 };
  tour.matches.forEach((m) => {
    if (!isPlayed(m) || (m.home !== id && m.away !== id)) return;
    const home = m.home === id;
    const gf = Number(home ? m.hs : m.as);
    const ga = Number(home ? m.as : m.hs);
    st.p++;
    st.g += gf;
    if (gf > ga) st.w++;
    else if (gf === ga && m.ph !== null && m.ph !== '' && m.ph !== undefined) {
      const pf = Number(home ? m.ph : m.pa);
      const pa = Number(home ? m.pa : m.ph);
      if (pf > pa) st.w++;
    }
  });
  return st;
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
  drawSplash(ctx, rand, 150, 560, W - 300, 1020, p.css);
  drawTagline(ctx, f, tour, lang);
  const head = tx(p.headline);
  // Bangla letters are much taller, so the Bangla headline is smaller and sits lower
  drawHeadline(ctx, f, lang === 'bn' ? head : head.toUpperCase(), lang === 'bn' ? 400 : 345, lang === 'bn' ? 230 : 360);

  // the photo overlaps the lower half of the headline and fades into it
  const size = 1240;
  const photo2 = duotonePhoto(img, size, p.light, { fadeTop: 0.22, fadeBottom: 0.24 });
  ctx.drawImage(photo2, (W - size) / 2, 300);

  // name, club and a short stats line
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(fitText(ctx, name, W - 220, 132, 800, f.heavy, 56), W / 2, 1600);
  ctx.restore();
  let y = 1690;
  if (club) {
    ctx.fillStyle = p.css;
    spaced(ctx, lang === 'bn' ? 0 : 6);
    ctx.fillText(fitText(ctx, lang === 'bn' ? club : club.toUpperCase(), W - 300, 38, 600, f.body, 20), W / 2, y);
    spaced(ctx, 0);
    y += 64;
  }
  const st = playerStats(tour, playerId);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `500 32px ${f.body}`;
  ctx.fillText(tx('card.statsLine', { p: st.p, w: st.w, g: st.g }), W / 2, y);

  drawFooter(ctx, f, lang);
  return canvas;
}

// ---------- podium poster ----------
export async function podiumCard({ tour, pod, photos, tx, lang }) {
  await ensureFonts();
  const f = fontsFor(lang);
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  const rand = rng(`${tour.id}-podium-poster`);

  drawBackground(ctx);
  drawSplash(ctx, rand, 110, 560, W - 220, 980, PLACES[1].css);
  drawTagline(ctx, f, tour, lang);
  const head = tx('card.winners');
  // Bangla letters are much taller, so the Bangla headline is smaller and sits lower
  drawHeadline(ctx, f, lang === 'bn' ? head : head.toUpperCase(), lang === 'bn' ? 400 : 345, lang === 'bn' ? 230 : 360);

  const slots = [
    { place: 2, id: pod.runnerUpId, cx: 330, top: 620, size: 700 },
    { place: 3, id: pod.thirdId, cx: W - 330, top: 650, size: 680 },
    { place: 1, id: pod.championId, cx: W / 2, top: 400, size: 960 },
  ].filter((s) => s.id);
  const imgs = await Promise.all(slots.map((s) => loadImage(photos[s.id])));

  // side players first, champion in front
  slots.forEach((s, i) => {
    const pic = duotonePhoto(imgs[i], s.size, PLACES[s.place].light, {
      fadeTop: s.place === 1 ? 0.3 : 0.22,
      fadeBottom: 0.24,
      fadeSides: s.place === 1 ? 0.12 : 0.2,
    });
    ctx.drawImage(pic, s.cx - s.size / 2, s.top);
  });

  // name plates: place tag + name under each photo
  const labelY = { 1: 1440, 2: 1390, 3: 1400 };
  [...slots].sort((a, b) => a.place - b.place).forEach((s) => {
    const p = PLACES[s.place];
    const y = labelY[s.place];
    const x = s.place === 1 ? W / 2 : s.cx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // place tag
    ctx.font = `800 ${s.place === 1 ? 46 : 38}px ${f.heavy}`;
    const tag = tx(p.short);
    const tw = ctx.measureText(tag).width + 44;
    const th = s.place === 1 ? 64 : 54;
    ctx.fillStyle = NAVY_CSS;
    ctx.beginPath();
    ctx.moveTo(x - tw / 2 + 14, y - th / 2);
    ctx.lineTo(x + tw / 2, y - th / 2);
    ctx.lineTo(x + tw / 2 - 14, y + th / 2);
    ctx.lineTo(x - tw / 2, y + th / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.css;
    ctx.fillText(tag, x, y + 3);
    // name
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    const nameMax = s.place === 1 ? 620 : 420;
    ctx.fillText(fitText(ctx, playerName(tour, s.id), nameMax, s.place === 1 ? 96 : 64, 800, f.heavy, 30), x, y + (s.place === 1 ? 92 : 76));
    ctx.restore();
  });

  // tournament details line
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `500 32px ${f.body}`;
  const sub = [tour.format ? tx(`format.${tour.format}.name`) : '', tx('card.playersCount', { n: tour.players.length })].filter(Boolean).join('  ·  ');
  ctx.fillText(sub, W / 2, 1700);

  drawFooter(ctx, f, lang);
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
