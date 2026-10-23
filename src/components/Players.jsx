import { useState } from 'react';
import { uid } from '../lib/engine.js';
import Icon from './Icon.jsx';
import { Avatar, useUI } from './ui.jsx';

export default function Players({ t, isAdmin, update }) {
  const { confirm, toast } = useUI();
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [editing, setEditing] = useState(null);
  const canAddRemove = isAdmin && t.status === 'setup';

  const exists = (n, exceptId) =>
    t.players.some((p) => p.id !== exceptId && p.name.trim().toLowerCase() === n.trim().toLowerCase());

  const add = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (exists(n)) return toast(`"${n}" is already in the list.`);
    update((d) => {
      d.players.push({ id: uid(), name: n, team: team.trim() });
      return d;
    });
    setName('');
    setTeam('');
  };

  const addBulk = () => {
    const lines = bulk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    let added = 0;
    update((d) => {
      for (const line of lines) {
        const [n, tm = ''] = line.split(/\s*[-,|]\s*/);
        if (!n || d.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) continue;
        d.players.push({ id: uid(), name: n, team: tm });
        added++;
      }
      return d;
    });
    toast(`${added} player${added === 1 ? '' : 's'} added`, 'ok');
    setBulk('');
    setShowBulk(false);
  };

  const del = async (p) => {
    if (!(await confirm({ title: `Remove ${p.name}?`, confirmText: 'Remove', danger: true }))) return;
    update((d) => {
      d.players = d.players.filter((x) => x.id !== p.id);
      return d;
    });
  };

  const saveEdit = () => {
    const n = editing.name.trim();
    if (!n) return;
    if (exists(n, editing.id)) return toast(`"${n}" is already in the list.`);
    update((d) => {
      const p = d.players.find((x) => x.id === editing.id);
      p.name = n;
      p.team = editing.team.trim();
      return d;
    });
    setEditing(null);
  };

  return (
    <div className="stack">
      {canAddRemove && (
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="plus" /> Add players
          </h3>
          <form className="player-form" onSubmit={add}>
            <input placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Club (optional)" value={team} onChange={(e) => setTeam(e.target.value)} />
            <button className="btn" disabled={!name.trim()}>
              <Icon name="plus" size={16} /> Add
            </button>
          </form>
          <button className="link-btn small" onClick={() => setShowBulk(!showBulk)}>
            <Icon name="list" size={14} /> {showBulk ? 'Hide bulk add' : 'Add many at once'}
          </button>
          {showBulk && (
            <div className="bulk">
              <textarea
                rows={6}
                placeholder={'One player per line:\nRahim - Real Madrid\nKarim - Barcelona\nSakib'}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
              />
              <button className="btn sm" onClick={addBulk} disabled={!bulk.trim()}>
                Add all
              </button>
            </div>
          )}
        </div>
      )}
      {isAdmin && t.status !== 'setup' && (
        <div className="alert info">The tournament has started, so players can no longer be added or removed. You can still edit names.</div>
      )}

      <div className="panel">
        <h3 className="panel-title">
          <Icon name="users" /> Players <span className="count">{t.players.length}</span>
        </h3>
        {t.players.length === 0 && <div className="muted small">No players yet.</div>}
        <ul className="player-list">
          {t.players.map((p, i) => (
            <li key={p.id}>
              {editing?.id === p.id ? (
                <div className="player-edit">
                  <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus />
                  <input value={editing.team} placeholder="Club" onChange={(e) => setEditing({ ...editing, team: e.target.value })} />
                  <div className="row">
                    <button className="btn sm" onClick={saveEdit}>
                      Save
                    </button>
                    <button className="btn ghost sm" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="p-num">{i + 1}</span>
                  <Avatar name={p.name} />
                  <span className="p-name">
                    <b>
                      {p.name} {t.championId === p.id && '🏆'}
                    </b>
                    {p.team && <small className="muted">{p.team}</small>}
                  </span>
                  {isAdmin && (
                    <span className="p-actions">
                      <button
                        className="icon-btn"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditing({ id: p.id, name: p.name, team: p.team || '' })}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      {canAddRemove && (
                        <button className="icon-btn danger" aria-label={`Remove ${p.name}`} onClick={() => del(p)}>
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
