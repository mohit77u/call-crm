"use client";

import { ChevronDown } from "lucide-react";

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

type PaginationProps = {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
  onPerPageChange?: (n: number) => void;
};

function pageWindow(cur: number, pages: number) {
  const start = Math.max(1, Math.min(cur - 2, pages - 4));
  const nums: number[] = [];
  for (let i = start; i <= Math.min(pages, start + 4); i++) nums.push(i);
  return nums;
}

const btnBase =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors";
const btnIdle = "border-slate-300 bg-white text-slate-600 hover:bg-slate-50";
const btnActive = "border-[var(--primary)] bg-[var(--primary)] text-white";

export function Pagination({ page, pages, total, perPage, onPage, onPerPageChange }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-2">
      <span className="text-[13px] text-slate-500">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        {onPerPageChange && (
          <label className="flex items-center gap-1.5 text-[13px] text-slate-500">
            Per page
            <span className="relative inline-flex h-8 items-center">
              <select
                value={perPage}
                onChange={(e) => onPerPageChange(Number(e.target.value))}
                className="h-8 appearance-none rounded-md border border-slate-300 bg-white py-0 pl-2.5 pr-8 text-[13px] leading-8 text-slate-700 focus:border-[var(--primary)] focus:outline-none"
              >
                {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </span>
          </label>
        )}
        <div className="flex items-center gap-1">
          <button type="button" className={`${btnBase} ${btnIdle} disabled:opacity-40`} disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
          {pageWindow(page, pages).map((n) => (
            <button key={n} type="button" className={`${btnBase} ${n === page ? btnActive : btnIdle}`} onClick={() => onPage(n)}>{n}</button>
          ))}
          <button type="button" className={`${btnBase} ${btnIdle} disabled:opacity-40`} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}
