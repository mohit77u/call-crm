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

export function DataTable<T>({ columns, rows, rowKey, rowClassName, loading = false, emptyMessage = "No records.", minHeight, footer }: DataTableProps<T>) {
  const colCount = columns.length;
  return (
    <div
      className="mb-3.5 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm"
      style={minHeight ? { minHeight } : undefined}
    >
      <table className="w-full border-collapse">
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
          {loading ? (
            <tr>
              <td colSpan={colCount} className="px-3 py-20 text-center">
                <span className="inline-flex items-center justify-center gap-2 text-sm text-slate-500">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--primary)]" />
                  Loading…
                </span>
              </td>
            </tr>
          ) : rows.length === 0 ? (
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
      {footer}
    </div>
  );
}
