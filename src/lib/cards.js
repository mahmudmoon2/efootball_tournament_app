// Downloadable Hall of Fame photo cards, drawn on a canvas (1440×1800, saved as JPG).
//  - playerCard: one podium finisher with photo, stats and their match history
//  - podiumCard: champion, runner-up and 3rd place together on a 3D podium
import { isPlayed, playerName, playerTeam } from './engine.js';
import { roundLabel } from './prefs.jsx';

const W = 1440;
const H = 1800;

const PLACES = {
  1: { key: 'card.champion', ring: ['#fff1b8', '#f59e0b', '#fde68a', '#b45309', '#fff1b8'], color: '#fbbf24', medal: '🏆', block: ['#fde68a', '#d97706', '#92400e'] },
  2: { key: 'card.runnerUp', ring: ['#f8fafc', '#94a3b8', '#e2e8f0', '#475569', '#f8fafc'], color: '#e2e8f0', medal: '🥈', block: ['#f1f5f9', '#94a3b8', '#475569'] },
  3: { key: 'card.third', ring: ['#fde2c4', '#c2702e', '#f3b98a', '#7c3f12', '#fde2c4'], color: '#f3b98a', medal: '🥉', block: ['#fbd5b0', '#c2702e', '#7c3f12'] },
};

const AVATAR_HUES = [152, 199, 262, 330, 28, 48, 180, 290];

function fontsFor(lang) {
  return lang === 'bn'
    ? { display: '"Baloo Da 2", "Oxanium", sans-serif', body: '"Anek Bangla", "Outfit", sans-serif' }
    : { display: '"Oxanium", "Baloo Da 2", sans-serif', body: '"Outfit", "Anek Bangla", sans-serif' };
}

async function ensureFonts() {
  const specs = ['700 40px Oxanium', '600 40px Oxanium', '400 40px Outfit', '600 40px Outfit', '700 40px "Baloo Da 2"', '800 40px "Baloo Da 2"', '400 40px "Anek Bangla"', '600 40px "Anek Bangla"'];
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

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Largest font size (down to min) at which text fits; ellipsises if it still does not fit.
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

function drawBackground(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2c2210');
  bg.addColorStop(0.42, '#151109');
  bg.addColorStop(1, '#07080f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // sun rays behind the hero
  const cx = W / 2;
  const cy = 600;
  const rays = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1000);
  rays.addColorStop(0, 'rgba(251,191,36,0.16)');
  rays.addColorStop(1, 'rgba(251,191,36,0)');
  ctx.fillStyle = rays;
  for (let a = 0; a < 360; a += 12) {
    const r1 = (a * Math.PI) / 180;
    const r2 = ((a + 5) * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(r1) * 1400, cy + Math.sin(r1) * 1400);
    ctx.lineTo(cx + Math.cos(r2) * 1400, cy + Math.sin(r2) * 1400);
    ctx.closePath();
    ctx.fill();
  }
  const glow = ctx.createRadialGradient(cx, 520, 0, cx, 520, 760);
  glow.addColorStop(0, 'rgba(251,191,36,0.30)');
  glow.addColorStop(1, 'rgba(251,191,36,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // faint pitch lines at the bottom
  ctx.save();
  ctx.strokeStyle = 'rgba(60,242,154,0.07)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = 1480 + i * i * 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 60, 1480);
    ctx.lineTo(cx + i * 260, H);
    ctx.stroke();
  }
  ctx.restore();

  // gold frame
  const frame = ctx.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, '#fde68a');
  frame.addColorStop(0.5, '#b45309');
  frame.addColorStop(1, '#fde68a');
  ctx.strokeStyle = frame;
  ctx.lineWidth = 6;
  rr(ctx, 28, 28, W - 56, H - 56, 44);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(253,230,138,0.22)';
  ctx.lineWidth = 2;
  rr(ctx, 46, 46, W - 92, H - 92, 32);
  ctx.stroke();
}

function drawHeader(ctx, f, tx, tour, dateStr) {
  // pill
  ctx.font = `700 30px ${f.display}`;
  const label = `🏆  ${tx('card.hof').toUpperCase()}`;
  const pw = ctx.measureText(label).width + 56;
  ctx.fillStyle = 'rgba(251,191,36,0.14)';
  rr(ctx, 90, 92, pw, 62, 31);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251,191,36,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fcd34d';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(label, 118, 124);
  // date
  ctx.font = `500 30px ${f.body}`;
  ctx.fillStyle = '#c8b27a';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - 90, 124);
  // tournament name + format
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff7e0';
  const name = fitText(ctx, tour.name, W - 220, 88, 700, f.display, 40);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.fillText(name, W / 2, 238);
  ctx.shadowBlur = 0;
  if (tour.format) {
    ctx.font = `500 36px ${f.body}`;
    ctx.fillStyle = '#c8b27a';
    ctx.fillText(tx(`format.${tour.format}.name`), W / 2, 306);
  }
}

function drawFooter(ctx, f) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 30px ${f.display}`;
  ctx.fillStyle = 'rgba(253,230,138,0.75)';
  ctx.fillText(`⚽  eFootball Arena  ·  ${location.host}`, W / 2, H - 96);
}

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function drawPortrait(ctx, f, img, name, cx, cy, r, place) {
  const p = PLACES[place];
  // drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0c14';
  ctx.fill();
  ctx.restore();
  // metallic ring
  let ring;
  if (ctx.createConicGradient) {
    ring = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    p.ring.forEach((c, i) => ring.addColorStop(i / (p.ring.length - 1), c));
  } else {
    ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    p.ring.forEach((c, i) => ring.addColorStop(i / (p.ring.length - 1), c));
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0c14';
  ctx.fill();
  // photo or initials
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, cx - r, cy - r, r * 2, r * 2);
  } else {
    let h = 0;
    for (const c of name || '?') h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const hue = AVATAR_HUES[h % AVATAR_HUES.length];
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, `hsl(${hue} 90% 72%)`);
    g.addColorStop(0.55, `hsl(${hue} 70% 42%)`);
    g.addColorStop(1, `hsl(${hue} 70% 22%)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(r * 0.8)}px ${f.display}`;
    ctx.fillText(initials(name), cx, cy + r * 0.04);
  }
  ctx.restore();
  // medal badge
  const br = Math.max(34, r * 0.26);
  const bx = cx + r * 0.74;
  const by = cy + r * 0.74;
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fillStyle = '#14110b';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = p.color;
  ctx.stroke();
  ctx.font = `${Math.round(br * 1.1)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.medal, bx, by + 2);
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
    return `${roundLabel(tx, m.round, tour.bracket.rounds.length)}${legs > 1 ? ` · ${tx('leg', { n: m.leg })}` : ''}`;
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
  const p = PLACES[place];
  const name = playerName(tour, playerId);
  const club = playerTeam(tour, playerId);

  drawBackground(ctx);
  drawHeader(ctx, f, tx, tour, dateText(tour, locale));
  drawPortrait(ctx, f, img, name, W / 2, 545, 185, place);

  // place + name
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 40px ${f.display}`;
  ctx.fillStyle = p.color;
  const role = tx(p.key).toUpperCase();
  ctx.fillText(lang === 'bn' ? role : role.split('').join(' '), W / 2, 812);
  ctx.fillStyle = place === 1 ? '#fbbf24' : '#ffffff';
  ctx.shadowColor = place === 1 ? 'rgba(251,191,36,0.5)' : 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 30;
  ctx.fillText(fitText(ctx, name, W - 260, 104, 700, f.display, 48), W / 2, 892);
  ctx.shadowBlur = 0;
  if (club) {
    ctx.font = `500 34px ${f.body}`;
    ctx.fillStyle = '#c8b27a';
    ctx.fillText(fitText(ctx, club, W - 300, 34, 500, f.body), W / 2, 958);
  }

  // stats
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
    ['st.p', st.p],
    ['st.w', st.w],
    ['st.d', st.d],
    ['st.l', st.l],
    ['card.gf', st.gf],
    ['card.ga', st.ga],
  ];
  const sx = 110;
  const sw = (W - 220 - 5 * 20) / 6;
  stats.forEach(([k, v], i) => {
    const x = sx + i * (sw + 20);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    rr(ctx, x, 1010, sw, 118, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(253,230,138,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 54px ${f.display}`;
    ctx.fillText(String(v), x + sw / 2, 1056);
    ctx.fillStyle = '#c8b27a';
    ctx.font = `600 24px ${f.body}`;
    ctx.fillText(tx(k).toUpperCase(), x + sw / 2, 1104);
  });

  // match history panel
  const top = 1160;
  const bottom = H - 150;
  ctx.fillStyle = 'rgba(8,8,14,0.55)';
  rr(ctx, 90, top, W - 180, bottom - top, 30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(253,230,138,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fcd34d';
  ctx.font = `700 32px ${f.display}`;
  ctx.fillText(tx(place === 1 ? 'card.road' : 'card.history').toUpperCase(), 130, top + 48);

  const rowH = 56;
  const maxRows = Math.floor((bottom - top - 90) / rowH);
  // Everything fits for small tournaments; otherwise keep the knockout run and the latest group games,
  // leaving one line for "+N more matches".
  let rows = ms;
  if (ms.length > maxRows) {
    const limit = maxRows - 1;
    const ko = ms.filter((m) => m.stage === 'ko').slice(-limit);
    const groupRoom = limit - ko.length;
    const group = groupRoom > 0 ? ms.filter((m) => m.stage !== 'ko').slice(-groupRoom) : [];
    rows = [...group, ...ko];
  }
  const hidden = ms.length - rows.length;

  let y = top + 100;
  rows.forEach((m, i) => {
    const r = perspective(m, playerId);
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      rr(ctx, 110, y - rowH / 2 + 4, W - 220, rowH - 8, 14);
      ctx.fill();
    }
    ctx.textAlign = 'left';
    ctx.font = `500 26px ${f.body}`;
    ctx.fillStyle = '#c8b27a';
    ctx.fillText(fitText(ctx, matchLabel(tx, tour, m), 330, 26, 500, f.body, 18), 136, y);
    ctx.font = `600 32px ${f.body}`;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(fitText(ctx, `${tx('card.vs')} ${playerName(tour, r.opp)}`, 560, 32, 600, f.body, 20), 490, y);
    // score + result chip
    const chip = { W: '#16a34a', D: '#64748b', L: '#dc2626' }[r.res];
    const score = `${r.gf} - ${r.ga}`;
    ctx.textAlign = 'right';
    ctx.font = `700 36px ${f.display}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(score, W - 210, y);
    if (r.pf !== null) {
      ctx.font = `600 22px ${f.body}`;
      ctx.fillStyle = '#fb923c';
      ctx.fillText(`(${tx('mc.pens')} ${r.pf}-${r.pa})`, W - 210 - ctx.measureText(score).width - 120, y);
    }
    ctx.fillStyle = chip;
    rr(ctx, W - 186, y - 22, 52, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = `700 24px ${f.display}`;
    ctx.fillText(tx(`form.${r.res}`), W - 160, y + 1);
    y += rowH;
  });
  if (hidden > 0) {
    ctx.textAlign = 'center';
    ctx.font = `500 26px ${f.body}`;
    ctx.fillStyle = '#a8a29e';
    ctx.fillText(tx('card.more', { n: hidden }), W / 2, y);
  }
  if (!ms.length) {
    ctx.textAlign = 'center';
    ctx.font = `500 28px ${f.body}`;
    ctx.fillStyle = '#a8a29e';
    ctx.fillText('—', W / 2, top + 140);
  }

  drawFooter(ctx, f);
  return canvas;
}

// ---------- podium card ----------
export async function podiumCard({ tour, pod, photos, tx, lang, locale }) {
  await ensureFonts();
  const f = fontsFor(lang);
  const canvas = newCanvas();
  const ctx = canvas.getContext('2d');
  drawBackground(ctx);
  drawHeader(ctx, f, tx, tour, dateText(tour, locale));

  const slots = [
    { place: 2, id: pod.runnerUpId, cx: 330, cy: 790, r: 150, blockTop: 1170 },
    { place: 1, id: pod.championId, cx: W / 2, cy: 640, r: 205, blockTop: 1060 },
    { place: 3, id: pod.thirdId, cx: W - 330, cy: 820, r: 138, blockTop: 1240 },
  ].filter((s) => s.id);
  const imgs = await Promise.all(slots.map((s) => loadImage(photos[s.id])));

  // 3D podium blocks
  const baseY = 1560;
  const bw = 360;
  slots.forEach((s) => {
    const p = PLACES[s.place];
    const x = s.cx - bw / 2;
    const depth = 46;
    // top face
    ctx.beginPath();
    ctx.moveTo(x, s.blockTop);
    ctx.lineTo(x + bw, s.blockTop);
    ctx.lineTo(x + bw - 30, s.blockTop - depth);
    ctx.lineTo(x + 30, s.blockTop - depth);
    ctx.closePath();
    ctx.fillStyle = p.block[0];
    ctx.fill();
    // front face
    const fg = ctx.createLinearGradient(0, s.blockTop, 0, baseY);
    fg.addColorStop(0, p.block[1]);
    fg.addColorStop(1, p.block[2]);
    ctx.fillStyle = fg;
    ctx.fillRect(x, s.blockTop, bw, baseY - s.blockTop);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, s.blockTop, bw, 6);
    // number
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${s.place === 1 ? 170 : 140}px ${f.display}`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 20;
    ctx.fillText(String(s.place), s.cx, s.blockTop + (baseY - s.blockTop) / 2 + 6);
    ctx.shadowBlur = 0;
  });
  // floor shadow under the podium
  const fl = ctx.createLinearGradient(0, baseY, 0, baseY + 60);
  fl.addColorStop(0, 'rgba(0,0,0,0.55)');
  fl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fl;
  ctx.fillRect(100, baseY, W - 200, 60);

  // portraits, names and roles above each block
  slots.forEach((s, i) => {
    const p = PLACES[s.place];
    const name = playerName(tour, s.id);
    drawPortrait(ctx, f, imgs[i], name, s.cx, s.cy, s.r, s.place);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameY = s.cy + s.r + 70;
    ctx.fillStyle = s.place === 1 ? '#fbbf24' : '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    ctx.fillText(fitText(ctx, name, s.place === 1 ? 460 : 360, s.place === 1 ? 64 : 48, 700, f.display, 26), s.cx, nameY);
    ctx.shadowBlur = 0;
    ctx.font = `700 ${s.place === 1 ? 30 : 26}px ${f.display}`;
    ctx.fillStyle = p.color;
    ctx.fillText(tx(p.key).toUpperCase(), s.cx, nameY + (s.place === 1 ? 52 : 44));
  });

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
