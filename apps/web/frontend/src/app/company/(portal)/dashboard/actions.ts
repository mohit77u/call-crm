"use server";

import { cookies } from "next/headers";

const PERIOD_COOKIE = "crm_dashboard_days";
const PERIODS = ["today", "7", "15", "30"];

export async function setDashboardPeriod(period: string) {
  if (!PERIODS.includes(period)) return;
  const store = await cookies();
  store.set(PERIOD_COOKIE, period, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 3600,
  });
}
