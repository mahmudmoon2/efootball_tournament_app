import { useState } from 'react';
import {
  FORMATS,
  backToGroupStage,
  groupStageComplete,
  isPlayed,
  playerName,
  podium,
  progress,
  resetToSetup,
  roundName,
  startKnockout,
} from '../lib/engine.js';
import { StandingsTable } from './Standings.jsx';
import WinnerCard from './WinnerCard.jsx';
import Icon from './Icon.jsx';
import { useUI } from './ui.jsx';

function matchLabel(t, m) {
  if (m.stage === 'ko') {
    const legs = t.matches.filter((x) => x.tieId === m.tieId).length;
    return `${roundName(m.round, t.bracket.rounds.length)}${legs > 1 ? ` · Leg ${m.leg}` : ''}`;
  }
  return t.groups.length > 1 ? `Group ${m.group} · MD ${m.round}` : `${t.format === 'swiss_knockout' ? 'Round' : 'Matchday'} ${m.round}`;
}

function MiniMatch({ t, m }) {
  const played = isPlayed(m);
  const hw = played && (Number(m.hs) > Number(m.as) || (m.hs === m.as && Number(m.ph) > Number(m.pa)));
  const aw = played && (Number(m.as) > Number(m.hs) || (m.hs === m.as && Number(m.pa) > Number(m.ph)));
  return (
    <div className="mini-match">
      <span className="tiny muted">{matchLabel(t, m)}</span>
      <div className="mini-row">
        <span className={hw ? 'w' : ''}>{playerName(t, m.home)}</span>
        <b className={played ? 'done' : ''}>{played ? `${m.hs} - ${m.as}` : 'vs'}</b>
        <span className={aw ? 'w' : ''}>{playerName(t, m.away)}</span>
      </div>
      {played && m.ph !== null && m.ph !== '' && (
        <span className="tiny muted">
          Penalties {m.ph}-{m.pa}
        </span>
      )}
    </div>
  );
}

function Ring({ pct }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3cf29a" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={r} className="ring-bg" />
      <circle cx="50" cy="50" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

export default function Overview({ t, isAdmin, update, onDelete, goTab }) {
  const { confirm } = useUI();
  const [rename, setRename] = useState(null);
  const { played, total } = progress(t);
  const pod = podium(t);
  const pct = total ? Math.round((played / total) * 100) : 0;
  const goals = t.matches.filter(isPlayed).reduce((s, m) => s + Number(m.hs) + Number(m.as), 0);
  const ready = t.matches
    .filter((m) => !isPlayed(m) && m.home && m.away)
    .sort((a, b) => (a.stage === b.stage ? a.round - b.round || (a.leg || 0) - (b.leg || 0) : a.stage === 'group' ? -1 : 1));
  const upcoming = ready.slice(0, 5);
  const recent = t.matches.filter(isPlayed).slice(-5).reverse();
  const koFormat = ['league_playoff', 'groups_knockout', 'swiss_knockout'].includes(t.format);
  const stageName =
    t.status === 'finished'
      ? 'Finished'
      : t.status === 'knockout'
        ? roundName(Math.max(0, t.bracket.rounds.findIndex((r) => r.some((x) => !x.winner))), t.bracket.rounds.length)
        : t.groups.length > 1
        ? 'Groups'
        : 'League';

  const doStartKo = async () => {
    if (
      !groupStageComplete(t) &&
      !(await confirm({ title: 'Some matches are still unplayed', message: 'Start the knockout stage anyway? Current standings will be used.', confirmText: 'Start knockout' }))
    )
      return;
    if (update((d) => startKnockout(d))) goTab('bracket');
  };

  const admin = isAdmin && (
    <div className="panel admin-panel">
      <h3 className="panel-title">
        <Icon name="shield" /> Admin controls
      </h3>
      <div className="admin-actions">
        {t.status === 'group' && koFormat && (
          <button className="btn" onClick={doStartKo}>
            <Icon name="play" size={15} /> Start knockout stage
          </button>
        )}
        {(t.status === 'knockout' || t.status === 'finished') && koFormat && (
          <button
            className="btn ghost"
            onClick={async () =>
              (await confirm({
                title: 'Back to the group stage?',
                message: 'The knockout bracket and all knockout scores will be deleted.',
                confirmText: 'Go back',
                danger: true,
              })) && update((d) => backToGroupStage(d))
            }
          >
            <Icon name="undo" size={15} /> Back to group stage
          </button>
        )}
        {t.status !== 'setup' && (
          <button
            className="btn ghost"
            onClick={async () =>
              (await confirm({
                title: 'Reset to setup?',
                message: 'All fixtures and scores will be deleted. Players are kept.',
                confirmText: 'Reset',
                danger: true,
              })) && update((d) => resetToSetup(d))
            }
          >
            <Icon name="reset" size={15} /> Reset to setup
          </button>
        )}
        {rename === null ? (
          <button className="btn ghost" onClick={() => setRename(t.name)}>
            <Icon name="edit" size={15} /> Rename
          </button>
        ) : (
          <form
            className="rename-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (rename.trim()) update((d) => ({ ...d, name: rename.trim() }));
              setRename(null);
            }}
          >
            <input value={rename} onChange={(e) => setRename(e.target.value)} autoFocus />
            <button className="btn sm">Save</button>
          </form>
        )}
        <button
          className="btn danger"
          onClick={async () =>
            (await confirm({
              title: `Delete "${t.name}"?`,
              message: 'This removes the whole tournament for everyone. It cannot be undone.',
              confirmText: 'Delete',
              danger: true,
            })) && onDelete()
          }
        >
          <Icon name="trash" size={15} /> Delete
        </button>
      </div>
    </div>
  );

  if (t.status === 'setup') {
    const steps = [
      { done: t.players.length >= 2, text: `Add players`, sub: `${t.players.length} added`, tab: 'players' },
      { done: !!t.format, text: 'Choose a style', sub: t.format ? FORMATS[t.format].name : 'Get a smart suggestion', tab: 'format' },
      { done: false, text: 'Start the tournament', sub: 'Fixtures are generated automatically', tab: 'format' },
    ];
    return (
      <div className="stack">
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="sliders" /> Get started
          </h3>
          {isAdmin ? (
            <div className="steps">
              {steps.map((s, i) => (
                <button key={i} className={`step ${s.done ? 'done' : ''}`} onClick={() => goTab(s.tab)}>
                  <span className="step-num">{s.done ? <Icon name="check" size={16} /> : i + 1}</span>
                  <span>
                    <b>{s.text}</b>
                    <small className="muted">{s.sub}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="muted">This tournament has not started yet. Check back soon.</div>
          )}
        </div>
        {admin}
      </div>
    );
  }

  return (
    <div className="stack">
      {pod && (
        <WinnerCard
          link={false}
          t={{
            id: t.id,
            name: t.name,
            format: t.format,
            updatedAt: t.updatedAt,
            championId: pod.championId,
            champion: playerName(t, pod.championId),
            runnerUpId: pod.runnerUpId,
            runnerUp: pod.runnerUpId ? playerName(t, pod.runnerUpId) : null,
            thirdId: pod.thirdId,
            third: pod.thirdId ? playerName(t, pod.thirdId) : null,
          }}
        />
      )}

      <div className="panel progress-panel">
        <div className="ring-wrap">
          <Ring pct={pct} />
          <div className="ring-label">
            <b>{pct}%</b>
            <small>complete</small>
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <small>Matches</small>
            <b>
              {played}
              <span>/{total}</span>
            </b>
          </div>
          <div className="stat">
            <small>Goals</small>
            <b>{goals}</b>
          </div>
          <div className="stat">
            <small>Players</small>
            <b>{t.players.length}</b>
          </div>
          <div className="stat">
            <small>Stage</small>
            <b className="stage-txt">{stageName}</b>
          </div>
        </div>
      </div>

      {t.status === 'group' && koFormat && (
        <div className={`alert ${groupStageComplete(t) ? 'success' : 'info'}`}>
          {groupStageComplete(t)
            ? 'The group stage is finished. The knockout stage can start now.'
            : 'Group stage in progress. The knockout stage starts once all matches are played.'}
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="calendar" /> Up next
          </h3>
          {upcoming.length === 0 && <div className="muted small">No matches waiting.</div>}
          {upcoming.map((m) => (
            <MiniMatch key={m.id} t={t} m={m} />
          ))}
          {ready.length > 0 && (
            <button className="link-btn small" onClick={() => goTab('fixtures')}>
              All matches →
            </button>
          )}
        </div>
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="check" /> Latest results
          </h3>
          {recent.length === 0 && <div className="muted small">No results yet.</div>}
          {recent.map((m) => (
            <MiniMatch key={m.id} t={t} m={m} />
          ))}
        </div>
      </div>

      {t.groups.length === 1 && (
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="table" /> {t.groups[0].name}
          </h3>
          <StandingsTable t={t} groupId="L" compact />
        </div>
      )}

      {admin}
    </div>
  );
}
