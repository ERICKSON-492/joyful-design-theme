import crypto from "node:crypto";

type SupabaseProduct = {
  id: string | number;
  name: string;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  stock?: number | string | null;
  is_active?: boolean | null;
  image_url?: string | null;
  image_urls?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

type SupabaseOrder = {
  id: string | number;
  phone?: string | null;
  customer_name?: string | null;
  email?: string | null;
  total_amount?: number | string | null;
  status?: string | null;
  items?: unknown;
  shipping_cost?: number | string | null;
  created_at?: string | null;
};

type SupabaseCustomOrder = {
  id: string | number;
  category?: string | null;
  vision?: string | null;
  colors?: unknown;
  materials?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  delivery_location?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type StorefrontOrder = {
  externalId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  totalAmount: number;
  status: string;
  orderDate: string;
};

export type StorefrontSummary = {
  configured: boolean;
  connected: boolean;
  error: string | null;
  productCount: number;
  orderCount: number;
  customOrderCount: number;
  revenue: number;
  products: Array<{
    externalId: string;
    name: string;
    category: string | null;
    stock: number;
    active: boolean;
  }>;
  recentOrders: StorefrontOrder[];
  lastOrderAt: string | null;
};

export type CatalogueProduct = {
  externalId: string;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  price: number;
  salePrice: number | null;
  stock: number;
  active: boolean;
  preorder: boolean;
  images: string[];
  updatedAt: string | null;
};

function numeric(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function requiredConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function catalogueShareSecret() {
  return process.env.STORE_SYNC_SECRET ?? "";
}

export function getCatalogueShareToken() {
  const secret = catalogueShareSecret();
  return secret ? crypto.createHmac("sha256", secret).update("ushanga-customer-catalogue-v1").digest("hex") : "";
}

export function isValidCatalogueShareToken(token: string) {
  const expected = getCatalogueShareToken();
  return Boolean(expected && token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected)));
}

async function readTable<T>(config: { url: string; key: string }, table: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  const response = await fetch(`${config.url}/rest/v1/${table}?${search.toString()}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${table} returned ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }
  return (await response.json()) as T[];
}

function imageList(product: SupabaseProduct) {
  const values = Array.isArray(product.image_urls) ? product.image_urls : [];
  const urls = values.filter((value): value is string => typeof value === "string" && value.length > 0);
  if (product.image_url && !urls.includes(product.image_url)) urls.unshift(product.image_url);
  return urls;
}

export async function getStorefrontSummary(): Promise<StorefrontSummary> {
  const config = requiredConfig();
  const empty: StorefrontSummary = {
    configured: Boolean(config),
    connected: false,
    error: config ? null : "Supabase credentials are not configured",
    productCount: 0,
    orderCount: 0,
    customOrderCount: 0,
    revenue: 0,
    products: [],
    recentOrders: [],
    lastOrderAt: null,
  };
  if (!config) return empty;

  try {
    const [products, orders, customOrders] = await Promise.all([
      readTable<SupabaseProduct>(config, "products", { select: "id,name,category,stock,is_active", order: "name.asc", limit: "1000" }),
      readTable<SupabaseOrder>(config, "orders", { select: "id,phone,customer_name,email,total_amount,status,created_at", order: "created_at.desc", limit: "1000" }),
      readTable<SupabaseCustomOrder>(config, "custom_orders", { select: "id", limit: "1000" }),
    ]);
    const recentOrders = orders.slice(0, 6).map(order => ({
      externalId: String(order.id),
      customerName: order.customer_name ?? null,
      customerEmail: order.email ?? null,
      customerPhone: order.phone ?? null,
      totalAmount: numeric(order.total_amount),
      status: order.status ?? "unknown",
      orderDate: order.created_at ?? new Date(0).toISOString(),
    }));
    return {
      configured: true,
      connected: true,
      error: null,
      productCount: products.length,
      orderCount: orders.length,
      customOrderCount: customOrders.length,
      revenue: orders.reduce((total, order) => total + numeric(order.total_amount), 0),
      products: products.map(product => ({
        externalId: String(product.id),
        name: product.name,
        category: product.category ?? null,
        stock: numeric(product.stock),
        active: product.is_active !== false,
      })),
      recentOrders,
      lastOrderAt: orders[0]?.created_at ?? null,
    };
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : "Unable to read Supabase" };
  }
}

export async function getStorefrontProducts(): Promise<{ configured: boolean; connected: boolean; error: string | null; products: CatalogueProduct[] }> {
  const config = requiredConfig();
  const empty = { configured: Boolean(config), connected: false, error: config ? null : "Supabase credentials are not configured", products: [] as CatalogueProduct[] };
  if (!config) return empty;
  try {
    const products = await readTable<SupabaseProduct>(config, "products", {
      select: "id,name,description,category,subcategory,price,sale_price,stock,is_active,image_url,image_urls,is_preorder,updated_at",
      order: "category.asc,name.asc",
      limit: "5000",
    });
    return {
      configured: true,
      connected: true,
      error: null,
      products: products.map(product => ({
        externalId: String(product.id),
        name: product.name,
        description: product.description ?? null,
        category: product.category ?? null,
        subcategory: product.subcategory ?? null,
        price: numeric(product.price),
        salePrice: product.sale_price == null ? null : numeric(product.sale_price),
        stock: numeric(product.stock),
        active: product.is_active !== false,
        preorder: Boolean((product as SupabaseProduct & { is_preorder?: boolean }).is_preorder),
        images: imageList(product),
        updatedAt: product.updated_at ?? null,
      })),
    };
  } catch (error) {
    return { ...empty, error: error instanceof Error ? error.message : "Unable to read Supabase" };
  }
}
