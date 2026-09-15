import { apiUrl } from './apiBase';

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
    // Tables already living on the Neon API, mapped to their route names.
    const neonRoutes: Record<string, string> = { products: 'products', product_variants: 'product-variants' };
    const neonRoute = neonRoutes[table];
    const isNeonTable = Boolean(neonRoute);
    const response = await fetch(isNeonTable ? apiUrl(`/api/${neonRoute}?${query}`) : `${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'GET',
      headers: isNeonTable ? { Accept: 'application/json' } : getPublicHeaders(),
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
