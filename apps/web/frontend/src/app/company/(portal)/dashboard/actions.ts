"use server";

import { cookies } from "next/headers";

const DAYS_COOKIE = "crm_dashboard_days";
const DAY_OPTIONS = [7, 15, 30];

export async function setDashboardDays(days: number) {
  if (!DAY_OPTIONS.includes(days)) return;
  const store = await cookies();
  store.set(DAYS_COOKIE, String(days), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 3600,
  });
}
