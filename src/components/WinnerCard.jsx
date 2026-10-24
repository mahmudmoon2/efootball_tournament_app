import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { FORMATS } from '../lib/engine.js';
import { fileToAvatar } from '../lib/image.js';
import Icon from './Icon.jsx';
import { Avatar, PhotoCtx, useUI } from './ui.jsx';

const PLACES = {
  1: { cls: 'gold', badge: '🏆', role: 'Champion', size: 112 },
  2: { cls: 'silver', badge: '🥈', role: 'Runner-up', size: 84 },
  3: { cls: 'bronze', badge: '🥉', role: '3rd place', size: 76 },
};

// Uses the tournament's photo context when available (tournament page), otherwise loads just this one photo.
function usePhoto(tournamentId, playerId) {
  const photos = useContext(PhotoCtx);
  const hasCtx = Object.keys(photos).length > 0;
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    if (!playerId || hasCtx) return undefined;
    return api.subscribePhoto(tournamentId, playerId, setPhoto);
  }, [tournamentId, playerId, hasCtx]);
  return (playerId && photos[playerId]) || photo;
}

function Slot({ tournamentId, playerId, name, place }) {
  const { isAdmin } = useAuth();
  const { toast, confirm } = useUI();
  const photo = usePhoto(tournamentId, playerId);
  const [busy, setBusy] = useState(false);
  const p = PLACES[place];

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await api.savePhoto(tournamentId, playerId, await fileToAvatar(file));
      toast(`Photo saved for ${name}`, 'ok');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: `Remove ${name}'s photo?`, confirmText: 'Remove', danger: true }))) return;
    try {
      await api.removePhoto(tournamentId, playerId);
    } catch (err) {
      toast(err.message);
    }
  };

  return (
    <div className={`wc-slot ${p.cls}`}>
      <div className={`wc-frame ${busy ? 'busy' : ''}`}>
        <Avatar src={photo} name={name || '?'} size={p.size} />
        <span className="wc-badge">{p.badge}</span>
        {isAdmin && (
          <label className="wc-upload" title={photo ? 'Change photo' : 'Add photo'}>
            <Icon name="camera" size={14} stroke={2.4} />
            <input type="file" accept="image/*" onChange={pick} disabled={busy} aria-label={`Photo for ${name}`} />
          </label>
        )}
        {isAdmin && photo && (
          <button className="wc-remove" onClick={remove} aria-label={`Remove ${name}'s photo`}>
            <Icon name="x" size={10} stroke={3} />
          </button>
        )}
      </div>
      <b className="wc-name">{name}</b>
      <small className="wc-role">{p.role}</small>
    </div>
  );
}

export default function WinnerCard({ t, link = true }) {
  const { isAdmin } = useAuth();
  const date = t.updatedAt ? new Date(t.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return (
    <div className="winner-card">
      <div className="wc-rays" aria-hidden="true" />
      <div className="wc-head">
        <span className="wc-tag">
          <Icon name="trophy" size={14} /> Hall of Fame
        </span>
        {date && <span className="wc-date">{date}</span>}
      </div>
      <h3 className="wc-title">{t.name}</h3>
      {t.format && <div className="wc-format">{FORMATS[t.format]?.name}</div>}
      <div className="wc-podium">
        {t.runnerUpId && <Slot tournamentId={t.id} playerId={t.runnerUpId} name={t.runnerUp} place={2} />}
        <Slot tournamentId={t.id} playerId={t.championId} name={t.champion} place={1} />
        {t.thirdId && <Slot tournamentId={t.id} playerId={t.thirdId} name={t.third} place={3} />}
      </div>
      {isAdmin && <div className="wc-admin-hint">Tap 📷 to add the winners' photos</div>}
      {link && (
        <Link to={`/t/${t.id}`} className="wc-link">
          View tournament →
        </Link>
      )}
    </div>
  );
}
