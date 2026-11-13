"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDashboardDays } from "./actions";

const DAY_OPTIONS = [7, 15, 30];

export function PeriodPills({ days }: { days: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="period-pills">
      {DAY_OPTIONS.map((d) => (
        <button
          key={d}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setDashboardDays(d);
              router.refresh();
            })
          }
          className={`pill${d === days ? " active" : ""}`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}
