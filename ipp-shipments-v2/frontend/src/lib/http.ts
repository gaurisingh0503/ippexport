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

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
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
    throw new ApiError(0, "Network error", true);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }

  return res.json() as Promise<T>;
}

export const http = {
  get:    <T>(path: string)                   => request<T>("GET",    path),
  post:   <T>(path: string, body: unknown)    => request<T>("POST",   path, body),
  patch:  <T>(path: string, body: unknown)    => request<T>("PATCH",  path, body),
  delete: <T>(path: string)                   => request<T>("DELETE", path),
};
