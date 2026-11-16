import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  rowClassName?: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  minHeight?: number;
  footer?: ReactNode;
};

export function DataTable<T>({ columns, rows, rowKey, rowClassName, loading = false, emptyMessage = "No records.", minHeight = 420, footer }: DataTableProps<T>) {
  const colCount = columns.length;
  return (
    <div className="mb-1.5 w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight }}>
          <span className="inline-flex flex-col items-center justify-center gap-3 text-sm text-slate-500">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-300 border-t-[var(--primary)]" />
            Loading…
          </span>
        </div>
      ) : (
      <table className="w-full min-w-max border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((c, i) => (
              <th key={i} className={c.className}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-3 py-16 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className={rowClassName?.(row)}>
                {columns.map((c, i) => (
                  <td key={i} className={c.className}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      )}
      {footer}
    </div>
  );
}
