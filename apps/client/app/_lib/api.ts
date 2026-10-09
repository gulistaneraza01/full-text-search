export const API_URL = process.env.API_URL ?? "http://localhost:8000";

type Envelope<T> = { success: boolean; data: T | null; error: string | null };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

// Server-side call to the Express API; unwraps the { success, data, error } envelope.
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
    });
  } catch {
    return { ok: false, status: 503, error: `Can't reach the API at ${API_URL}. Is the server running?` };
  }
  if (res.status === 204) return { ok: true, data: undefined as T };

  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body?.success) {
    return { ok: false, status: res.status, error: body?.error ?? `Request failed (HTTP ${res.status})` };
  }
  return { ok: true, data: body.data as T };
}
