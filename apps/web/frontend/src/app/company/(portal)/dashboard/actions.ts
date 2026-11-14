"use server";

import { cookies } from "next/headers";

const PERIOD_COOKIE = "crm_dashboard_days";
export const DASHBOARD_PERIODS = ["today", "7", "15", "30"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export async function setDashboardPeriod(period: string) {
  if (!DASHBOARD_PERIODS.includes(period as DashboardPeriod)) return;
  const store = await cookies();
  store.set(PERIOD_COOKIE, period, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 3600,
  });
}
