import type { Verdict } from '../../lib/specs';

const labels: Record<string, [string, string]> = {
  rec: ['rec', 'Runs great'],
  min: ['min', 'Meets minimum'],
  below: ['below', 'Below minimum'],
  unknown: ['unknown', 'Specs unknown'],
  nodata: ['unknown', 'No spec data'],
};

export function VerdictBadge({ verdict }: { verdict: Verdict | string }) {
  const [cls, label] = labels[verdict] || labels.unknown;
  return <span className={`badge ${cls}`}>{label}</span>;
}