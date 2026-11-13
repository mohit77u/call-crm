import { NextRequest, NextResponse } from "next/server";

// Renews expired access tokens via the backend refresh endpoint before any
// portal page/API route runs, so users stay logged in for the refresh-token
// lifetime (6 months) without re-entering credentials.

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

const PORTALS = {
  admin: { access: "crm_platform", refresh: "crm_platform_refresh" },
  company: { access: "crm_session", refresh: "crm_session_refresh" },
} as const;

type Portal = keyof typeof PORTALS;

function portalFor(pathname: string): Portal | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/company") || pathname.startsWith("/api/crm") || pathname.startsWith("/api/calls")) {
    return "company";
  }
  if (pathname.startsWith("/api/admin")) return "admin";
  return null;
}

function jwtExpMs(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

const isApi = (pathname: string) => pathname.startsWith("/api/");
const loginPath = (portal: Portal) => (portal === "admin" ? "/admin/login" : "/company/login");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const portal = portalFor(pathname);
  if (!portal) return NextResponse.next();

  const names = PORTALS[portal];
  const access = req.cookies.get(names.access)?.value;
  // Refresh a bit early so in-flight requests never race the expiry.
  if (access && jwtExpMs(access) > Date.now() + 10_000) return NextResponse.next();

  const refreshToken = req.cookies.get(names.refresh)?.value;
  if (!refreshToken) return NextResponse.next(); // guards/login page handle the rest

  let renewed: { token: string; refreshToken: string } | null = null;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (res.ok) renewed = (await res.json()) as { token: string; refreshToken: string };
  } catch {
    renewed = null;
  }

  if (!renewed) {
    // Refresh token revoked/expired — drop cookies; pages redirect to login,
    // API routes get a clean 401.
    const res = isApi(pathname)
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL(loginPath(portal), req.url));
    res.cookies.delete(names.access);
    res.cookies.delete(names.refresh);
    return res;
  }

  // Forward the NEW tokens to the downstream handler by rewriting the Cookie
  // request header, and persist them on the browser via Set-Cookie.
  const headers = new Headers(req.headers);
  const jar = new Map<string, string>();
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) jar.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  jar.set(names.access, renewed.token);
  jar.set(names.refresh, renewed.refreshToken);
  headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));

  const res = NextResponse.next({ request: { headers } });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(names.access, renewed.token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 30 * 60 });
  res.cookies.set(names.refresh, renewed.refreshToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 180 * 24 * 3600 });
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/company/:path*", "/api/admin/:path*", "/api/crm/:path*", "/api/calls/:path*"],
};
