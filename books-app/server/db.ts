import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import {
  customOrders,
  expenses,
  InsertUser,
  inventoryItems,
  materials,
  materialPriceHistory,
  materialUsage,
  storeOrders,
  storeProducts,
  syncEvents,
  users,
} from "../drizzle/schema";
import type { StoreSnapshot } from "./storeSyncContract";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

function amount(value: unknown) {
  return Number(value ?? 0);
}

export async function getDashboardSummary(from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const orderWhere = from && to ? and(gte(storeOrders.orderDate, from), lte(storeOrders.orderDate, to)) : undefined;
  const expenseWhere = from && to ? and(gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)) : undefined;
  const [sales, cost, expense, stock, lowStock, latestSync, recentOrders] = await Promise.all([
    db.select({ value: sql<string>`coalesce(sum(${storeOrders.totalAmount}), 0)`, count: sql<number>`count(*)` }).from(storeOrders).where(orderWhere),
    db.select({ value: sql<string>`coalesce(sum(${materialUsage.quantity} * ${materialUsage.unitCost}), 0)` }).from(materialUsage).where(from && to ? and(gte(materialUsage.usedAt, from), lte(materialUsage.usedAt, to)) : undefined),
    db.select({ value: sql<string>`coalesce(sum(${expenses.amount}), 0)` }).from(expenses).where(expenseWhere),
    db.select({ value: sql<string>`coalesce(sum(${inventoryItems.quantity} * ${inventoryItems.unitCost}), 0)` }).from(inventoryItems),
    db.select().from(inventoryItems).where(sql`${inventoryItems.quantity} <= ${inventoryItems.reorderLevel}`).orderBy(inventoryItems.quantity).limit(6),
    db.select().from(syncEvents).orderBy(desc(syncEvents.completedAt)).limit(1),
    db.select().from(storeOrders).orderBy(desc(storeOrders.orderDate)).limit(6),
  ]);
  const revenue = amount(sales[0]?.value);
  const materialCost = amount(cost[0]?.value);
  const expensesTotal = amount(expense[0]?.value);
  const grossProfit = revenue - materialCost;
  return {
    revenue,
    expenses: expensesTotal,
    materialCost,
    inventoryValue: amount(stock[0]?.value),
    grossProfit,
    netProfit: grossProfit - expensesTotal,
    orderCount: Number(sales[0]?.count ?? 0),
    lowStock,
    latestSync: latestSync[0] ?? null,
    recentOrders,
  };
}

export async function listMaterials() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(materials).orderBy(desc(materials.updatedAt));
  const history = await db.select().from(materialPriceHistory).orderBy(desc(materialPriceHistory.effectiveDate));
  const usage = await db.select().from(materialUsage).orderBy(desc(materialUsage.usedAt)).limit(50);
  return rows.map(material => ({
    ...material,
    priceHistory: history.filter(item => item.materialId === material.id),
    usage: usage.filter(item => item.materialId === material.id),
  }));
}

export async function createMaterial(input: typeof materials.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const created = await db.insert(materials).values(input);
  const id = Number(created[0].insertId);
  await db.insert(materialPriceHistory).values({ materialId: id, supplier: input.supplier, unitPrice: input.currentUnitPrice, effectiveDate: new Date(), note: "Initial price" });
  return id;
}

export async function listExpenses() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(expenses).orderBy(desc(expenses.expenseDate)).limit(100);
}

export async function createExpense(input: typeof expenses.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const created = await db.insert(expenses).values(input);
  return Number(created[0].insertId);
}

export async function listInventory() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(inventoryItems).orderBy(inventoryItems.kind, inventoryItems.name);
}

export async function getConnectionStatus() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [events, orderCount, productCount] = await Promise.all([
    db.select().from(syncEvents).orderBy(desc(syncEvents.completedAt)).limit(8),
    db.select({ count: sql<number>`count(*)` }).from(storeOrders),
    db.select({ count: sql<number>`count(*)` }).from(storeProducts),
  ]);
  return { configured: Boolean(process.env.STORE_SYNC_SECRET), events, orderCount: Number(orderCount[0]?.count ?? 0), productCount: Number(productCount[0]?.count ?? 0) };
}

function serializeSnapshotValue(value: unknown) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

async function syncFinishedProductInventory(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, product: NonNullable<StoreSnapshot["products"]>[number]) {
  if (product.stock === undefined) return;
  const existing = await db.select({ id: inventoryItems.id }).from(inventoryItems).where(and(eq(inventoryItems.kind, "finished_product"), eq(inventoryItems.productExternalId, product.externalId))).limit(1);
  const values = { name: product.name, unit: "piece", quantity: String(product.stock) };
  if (existing[0]) {
    await db.update(inventoryItems).set(values).where(eq(inventoryItems.id, existing[0].id));
  } else {
    await db.insert(inventoryItems).values({ kind: "finished_product", productExternalId: product.externalId, ...values });
  }
}

export async function importStoreSnapshot(snapshot: StoreSnapshot) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const startedAt = new Date();
  let records = 0;
  try {
    for (const product of snapshot.products ?? []) {
      const syncedAt = new Date();
      const productValues = { externalId: product.externalId, name: product.name, category: product.category, subcategory: product.subcategory, salePrice: String(product.salePrice ?? 0), stock: String(product.stock ?? 0), active: product.isActive === false ? 0 : 1, syncedAt };
      await db.insert(storeProducts).values(productValues).onDuplicateKeyUpdate({ set: { name: product.name, category: product.category, subcategory: product.subcategory, salePrice: productValues.salePrice, stock: productValues.stock, active: productValues.active, syncedAt } });
      await syncFinishedProductInventory(db, product);
      records++;
    }
    for (const order of snapshot.orders ?? []) {
      const syncedAt = new Date();
      const orderValues = { externalId: order.externalId, customerName: order.customerName, customerEmail: order.customerEmail, customerPhone: order.customerPhone, totalAmount: String(order.totalAmount), shippingCost: String(order.shippingCost ?? 0), currency: order.currency ?? "KES", status: order.status, items: serializeSnapshotValue(order.items), orderDate: order.orderDate, syncedAt };
      await db.insert(storeOrders).values(orderValues).onDuplicateKeyUpdate({ set: { customerName: order.customerName, customerEmail: order.customerEmail, customerPhone: order.customerPhone, totalAmount: orderValues.totalAmount, shippingCost: orderValues.shippingCost, currency: orderValues.currency, status: orderValues.status, items: orderValues.items, orderDate: orderValues.orderDate, syncedAt } });
      records++;
    }
    for (const order of snapshot.customOrders ?? []) {
      const syncedAt = new Date();
      const customOrderValues = { externalId: order.externalId, category: order.category, vision: order.vision, colors: serializeSnapshotValue(order.colors), requestedMaterials: order.requestedMaterials, customerName: order.customerName, customerPhone: order.customerPhone, customerEmail: order.customerEmail, deliveryLocation: order.deliveryLocation, status: order.status ?? "new", orderDate: order.orderDate, syncedAt };
      await db.insert(customOrders).values(customOrderValues).onDuplicateKeyUpdate({ set: { category: customOrderValues.category, vision: customOrderValues.vision, colors: customOrderValues.colors, requestedMaterials: customOrderValues.requestedMaterials, customerName: customOrderValues.customerName, customerPhone: customOrderValues.customerPhone, customerEmail: customOrderValues.customerEmail, deliveryLocation: customOrderValues.deliveryLocation, status: customOrderValues.status, orderDate: customOrderValues.orderDate, syncedAt } });
      records++;
    }
    await db.insert(syncEvents).values({ source: "ushanga-store", status: "success", records, message: `Imported ${snapshot.products?.length ?? 0} products, ${snapshot.orders?.length ?? 0} orders, and ${snapshot.customOrders?.length ?? 0} custom orders`, startedAt, completedAt: new Date() });
    return { records };
  } catch (error) {
    await db.insert(syncEvents).values({ source: "ushanga-store", status: "failed", records, message: error instanceof Error ? error.message : "Sync failed", startedAt, completedAt: new Date() });
    throw error;
  }
}
