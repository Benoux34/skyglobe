interface FactProps {
  readonly label: string;
  readonly value: string;
  readonly detail?: string | undefined;
}

/** One cell of the grid of key figures at the top of a details panel. */
export function Fact({ label, value, detail }: FactProps) {
  return (
    <div className="bg-surface px-4 py-3">
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 font-mono text-base font-medium text-fg tabular-nums">{value}</dd>
      <dd className="h-4 font-mono text-xs text-subtle tabular-nums">{detail}</dd>
    </div>
  );
}

interface RowProps {
  readonly label: string;
  /** `null` when the fact is unknown: the line is then left out. */
  readonly value: string | null;
}

/** One line of the list of secondary facts under the key figures. */
export function Row({ label, value }: RowProps) {
  if (value === null) return null;
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="truncate font-mono text-fg tabular-nums">{value}</dd>
    </div>
  );
}
