import { useState } from 'react';
import {
  backToGroupStage,
  groupStageComplete,
  isPlayed,
  playerName,
  podium,
  progress,
  resetToSetup,
  startKnockout,
} from '../lib/engine.js';
import { groupLabel, roundLabel, usePrefs } from '../lib/prefs.jsx';
import { StandingsTable } from './Standings.jsx';
import WinnerCard from './WinnerCard.jsx';
import Icon from './Icon.jsx';
import { useUI } from './ui.jsx';

function matchLabel(tx, t, m) {
  if (m.stage === 'ko') {
    const legs = t.matches.filter((x) => x.tieId === m.tieId).length;
    return `${roundLabel(tx, m.round, t.bracket.rounds.length)}${legs > 1 ? ` · ${tx('leg', { n: m.leg })}` : ''}`;
  }
  if (t.groups.length > 1) return `${tx('group', { id: m.group })} · ${tx('mdShort', { n: m.round })}`;
  return tx(t.format === 'swiss_knockout' ? 'roundN' : 'matchday', { n: m.round });
}

function MiniMatch({ t, m }) {
  const { t: tx } = usePrefs();
  const played = isPlayed(m);
  const hw = played && (Number(m.hs) > Number(m.as) || (m.hs === m.as && Number(m.ph) > Number(m.pa)));
  const aw = played && (Number(m.as) > Number(m.hs) || (m.hs === m.as && Number(m.pa) > Number(m.ph)));
  return (
    <div className="mini-match">
      <span className="tiny muted">{matchLabel(tx, t, m)}</span>
      <div className="mini-row">
        <span className={hw ? 'w' : ''}>{playerName(t, m.home)}</span>
        <b className={played ? 'done' : ''}>{played ? `${m.hs} - ${m.as}` : 'vs'}</b>
        <span className={aw ? 'w' : ''}>{playerName(t, m.away)}</span>
      </div>
      {played && m.ph !== null && m.ph !== '' && <span className="tiny muted">{tx('ov.pens', { h: m.ph, a: m.pa })}</span>}
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
  const { t: tx } = usePrefs();
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
      ? tx('stage.finished')
      : t.status === 'knockout'
        ? roundLabel(tx, Math.max(0, t.bracket.rounds.findIndex((r) => r.some((x) => !x.winner))), t.bracket.rounds.length)
        : t.groups.length > 1
          ? tx('stage.groups')
          : tx('stage.league');

  const doStartKo = async () => {
    if (
      !groupStageComplete(t) &&
      !(await confirm({ title: tx('admin.unplayedTitle'), message: tx('admin.unplayedMsg'), confirmText: tx('admin.startKo') }))
    )
      return;
    if (update((d) => startKnockout(d))) goTab('bracket');
  };

  const admin = isAdmin && (
    <div className="panel admin-panel">
      <h3 className="panel-title">
        <Icon name="shield" /> {tx('admin.title')}
      </h3>
      <div className="admin-actions">
        {t.status === 'group' && koFormat && (
          <button className="btn" onClick={doStartKo}>
            <Icon name="play" size={15} /> {tx('admin.startKo')}
          </button>
        )}
        {(t.status === 'knockout' || t.status === 'finished') && koFormat && (
          <button
            className="btn ghost"
            onClick={async () =>
              (await confirm({
                title: tx('admin.backGroupTitle'),
                message: tx('admin.backGroupMsg'),
                confirmText: tx('admin.goBack'),
                danger: true,
              })) && update((d) => backToGroupStage(d))
            }
          >
            <Icon name="undo" size={15} /> {tx('admin.backGroup')}
          </button>
        )}
        {t.status !== 'setup' && (
          <button
            className="btn ghost"
            onClick={async () =>
              (await confirm({
                title: tx('admin.resetTitle'),
                message: tx('admin.resetMsg'),
                confirmText: tx('admin.resetBtn'),
                danger: true,
              })) && update((d) => resetToSetup(d))
            }
          >
            <Icon name="reset" size={15} /> {tx('admin.reset')}
          </button>
        )}
        {rename === null ? (
          <button className="btn ghost" onClick={() => setRename(t.name)}>
            <Icon name="edit" size={15} /> {tx('admin.rename')}
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
            <button className="btn sm">{tx('save')}</button>
          </form>
        )}
        <button
          className="btn danger"
          onClick={async () =>
            (await confirm({
              title: tx('admin.deleteTitle', { name: t.name }),
              message: tx('admin.deleteMsg'),
              confirmText: tx('admin.delete'),
              danger: true,
            })) && onDelete()
          }
        >
          <Icon name="trash" size={15} /> {tx('admin.delete')}
        </button>
      </div>
    </div>
  );

  if (t.status === 'setup') {
    const steps = [
      { done: t.players.length >= 2, text: tx('ov.addPlayers'), sub: tx('ov.added', { n: t.players.length }), tab: 'players' },
      { done: !!t.format, text: tx('ov.chooseStyle'), sub: t.format ? tx(`format.${t.format}.name`) : tx('ov.smart'), tab: 'format' },
      { done: false, text: tx('ov.start'), sub: tx('ov.startSub'), tab: 'format' },
    ];
    return (
      <div className="stack">
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="sliders" /> {tx('ov.getStarted')}
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
            <div className="muted">{tx('ov.notStarted')}</div>
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
          tour={t}
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
            <small>{tx('ov.complete')}</small>
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <small>{tx('ov.matches')}</small>
            <b>
              {played}
              <span>/{total}</span>
            </b>
          </div>
          <div className="stat">
            <small>{tx('ov.goals')}</small>
            <b>{goals}</b>
          </div>
          <div className="stat">
            <small>{tx('ov.players')}</small>
            <b>{t.players.length}</b>
          </div>
          <div className="stat">
            <small>{tx('ov.stage')}</small>
            <b className="stage-txt">{stageName}</b>
          </div>
        </div>
      </div>

      {t.status === 'group' && koFormat && (
        <div className={`alert ${groupStageComplete(t) ? 'success' : 'info'}`}>
          {groupStageComplete(t) ? tx('ov.groupDone') : tx('ov.groupRunning')}
        </div>
      )}

      <div className="two-col">
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="calendar" /> {tx('ov.upNext')}
          </h3>
          {upcoming.length === 0 && <div className="muted small">{tx('ov.noWaiting')}</div>}
          {upcoming.map((m) => (
            <MiniMatch key={m.id} t={t} m={m} />
          ))}
          {ready.length > 0 && (
            <button className="link-btn small" onClick={() => goTab('fixtures')}>
              {tx('ov.allMatches')}
            </button>
          )}
        </div>
        <div className="panel">
          <h3 className="panel-title">
            <Icon name="check" /> {tx('ov.latest')}
          </h3>
          {recent.length === 0 && <div className="muted small">{tx('ov.noResults')}</div>}
          {recent.map((m) => (
            <MiniMatch key={m.id} t={t} m={m} />
          ))}
        </div>
      </div>

      {t.groups.length === 1 && (
        <div className="panel table-panel">
          <h3 className="panel-title">
            <Icon name="table" /> {groupLabel(tx, t, t.groups[0])}
          </h3>
          <StandingsTable t={t} groupId="L" />
        </div>
      )}

      {admin}
    </div>
  );
}
