const LABELS = {
  setup: ['Setup', 'gray'],
  group: ['Group stage', 'blue'],
  knockout: ['Knockout', 'orange'],
  finished: ['Finished', 'green'],
};

export default function StatusBadge({ status, format }) {
  let [label, color] = LABELS[status] || [status, 'gray'];
  if (status === 'group' && (format === 'league' || format === 'league_playoff')) label = 'League stage';
  if (status === 'group' && format === 'swiss_knockout') label = 'League phase';
  return (
    <span className={`badge ${color}`}>
      {(status === 'group' || status === 'knockout') && <i className="live-dot" />}
      {label}
    </span>
  );
}
