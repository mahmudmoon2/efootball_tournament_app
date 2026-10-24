import { usePrefs } from '../lib/prefs.jsx';

const COLORS = { setup: 'gray', group: 'blue', knockout: 'orange', finished: 'green' };

export default function StatusBadge({ status, format }) {
  const { t } = usePrefs();
  let key = `status.${status}`;
  if (status === 'group' && (format === 'league' || format === 'league_playoff')) key = 'status.league';
  if (status === 'group' && format === 'swiss_knockout') key = 'status.leaguePhase';
  return (
    <span className={`badge ${COLORS[status] || 'gray'}`}>
      {(status === 'group' || status === 'knockout') && <i className="live-dot" />}
      {t(key)}
    </span>
  );
}
