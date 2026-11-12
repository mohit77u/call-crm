// Server-side client for the Call CRM API (apps/web/backend).
// Only use from server components, route handlers and server actions — never from client components.

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

type FetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: {
      "content-type": "application/json",
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error ?? `API error (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

// For CSV/file downloads — returns the raw upstream Response.
export async function apiFetchRaw(path: string, token?: string | null): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
}
