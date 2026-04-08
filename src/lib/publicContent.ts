const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getPublicHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    Accept: 'application/json',
  };
}

export async function fetchPublicTable<T>(table: string, query: string, timeoutMs = 8000): Promise<T[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'GET',
      headers: getPublicHeaders(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Public fetch failed for ${table}: ${response.status}`);
    }

    return (await response.json()) as T[];
  } finally {
    window.clearTimeout(timeoutId);
  }
}
