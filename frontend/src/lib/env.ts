// Single source of truth for env vars. Import from here — never read import.meta.env directly.

function required(key: string): string {
  const val = import.meta.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  apiBaseUrl: required("VITE_API_BASE_URL"),
  supabaseUrl: required("VITE_SUPABASE_URL"),
  supabaseAnonKey: required("VITE_SUPABASE_ANON_KEY"),
  adminEmail: required("VITE_ADMIN_EMAIL"),
} as const;
