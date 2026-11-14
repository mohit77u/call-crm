"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppSelect } from "@/components/app-select";
import { setDashboardPeriod } from "./actions";

const OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "15", label: "Last 15 days" },
  { value: "30", label: "Last 30 days" },
];

export function PeriodSelect({ period }: { period: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <AppSelect
      className="w-36"
      data={OPTIONS}
      value={period}
      disabled={pending}
      onChange={(value) => {
        if (!value) return;
        startTransition(async () => {
          await setDashboardPeriod(value);
          router.refresh();
        });
      }}
    />
  );
}
