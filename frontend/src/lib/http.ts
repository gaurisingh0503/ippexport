import { env } from "./env";
import { supabase } from "./supabase";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public isNetworkError = false,
  ) {
    super(message);
  }
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.isNetworkError) return "Network error — is the backend running?";

  const raw = error.message.trim();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as { detail?: string | Array<{ msg?: string }> };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (Array.isArray(parsed.detail) && parsed.detail[0]?.msg) return parsed.detail[0].msg;
  } catch {
    if (raw.length <= 200) return raw;
  }

  return fallback;
}

async function request<T>(method: string, path: string, body?: unknown, retries = 10): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 3000));
      return request<T>(method, path, body, retries - 1);
    }
    throw new ApiError(0, "Network error", true);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

async function upload<T>(path: string, file: File): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError(0, "Network error", true);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }

  return res.json() as Promise<T>;
}

async function download(path: string, retries = 10): Promise<{ blob: Blob; filename: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, { headers });
  } catch {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 3000));
      return download(path, retries - 1);
    }
    throw new ApiError(0, "Network error", true);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }

  const match = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/);
  return { blob: await res.blob(), filename: match?.[1] ?? "stickers.xlsx" };
}

export const http = {
  get:    <T>(path: string)                   => request<T>("GET",    path),
  post:   <T>(path: string, body: unknown)    => request<T>("POST",   path, body),
  patch:  <T>(path: string, body: unknown)    => request<T>("PATCH",  path, body),
  delete: <T>(path: string)                   => request<T>("DELETE", path),
  upload: <T>(path: string, file: File)       => upload<T>(path, file),
  download: (path: string)                    => download(path),
};
