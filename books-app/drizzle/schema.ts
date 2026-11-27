import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  sku: varchar("sku", { length: 64 }),
  unit: varchar("unit", { length: 32 }).notNull(),
  supplier: varchar("supplier", { length: 180 }),
  currentUnitPrice: decimal("currentUnitPrice", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("KES").notNull(),
  reorderLevel: decimal("reorderLevel", { precision: 12, scale: 3 }).default("0").notNull(),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const materialPriceHistory = mysqlTable("materialPriceHistory", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  supplier: varchar("supplier", { length: 180 }),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  effectiveDate: timestamp("effectiveDate").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const materialUsage = mysqlTable("materialUsage", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  productExternalId: varchar("productExternalId", { length: 120 }),
  customOrderRef: varchar("customOrderRef", { length: 120 }),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }).notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
  note: text("note"),
});

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["supplier", "shipping", "packaging", "marketing", "wages", "other"]).notNull(),
  description: varchar("description", { length: 240 }).notNull(),
  vendor: varchar("vendor", { length: 180 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("KES").notNull(),
  expenseDate: timestamp("expenseDate").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["paid", "pending", "cancelled"]).default("paid").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const inventoryItems = mysqlTable("inventoryItems", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["raw_material", "finished_product"]).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  materialId: int("materialId"),
  productExternalId: varchar("productExternalId", { length: 120 }),
  unit: varchar("unit", { length: 32 }).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).default("0").notNull(),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }).default("0").notNull(),
  reorderLevel: decimal("reorderLevel", { precision: 12, scale: 3 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stockMovements = mysqlTable("stockMovements", {
  id: int("id").autoincrement().primaryKey(),
  inventoryItemId: int("inventoryItemId").notNull(),
  movementType: mysqlEnum("movementType", ["purchase", "usage", "adjustment", "sale", "return"]).notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
  unitCost: decimal("unitCost", { precision: 12, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 120 }),
  movementDate: timestamp("movementDate").notNull(),
  notes: text("notes"),
});

export const storeProducts = mysqlTable("storeProducts", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 240 }).notNull(),
  category: varchar("category", { length: 120 }),
  subcategory: varchar("subcategory", { length: 120 }),
  salePrice: decimal("salePrice", { precision: 12, scale: 2 }).default("0").notNull(),
  stock: decimal("stock", { precision: 12, scale: 3 }).default("0").notNull(),
  active: int("active").default(1).notNull(),
  currency: varchar("currency", { length: 8 }).default("KES").notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});
export const storeOrders = mysqlTable("storeOrders", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 120 }).notNull().unique(),
  customerName: varchar("customerName", { length: 180 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 40 }),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0").notNull(),
  shippingCost: decimal("shippingCost", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 8 }).default("KES").notNull(),
  status: varchar("status", { length: 48 }).notNull(),
  items: text("items"),
  orderDate: timestamp("orderDate").notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});
export const customOrders = mysqlTable("customOrders", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 120 }).notNull().unique(),
  category: varchar("category", { length: 120 }).notNull(),
  vision: text("vision"),
  colors: text("colors"),
  requestedMaterials: text("requestedMaterials"),
  customerName: varchar("customerName", { length: 180 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 40 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  deliveryLocation: varchar("deliveryLocation", { length: 240 }),
  status: varchar("status", { length: 48 }).notNull().default("new"),
  orderDate: timestamp("orderDate").notNull(),
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
});
export const syncEvents = mysqlTable("syncEvents", {
  id: int("id").autoincrement().primaryKey(),
  source: varchar("source", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["success", "partial", "failed"]).notNull(),
  records: int("records").default(0).notNull(),
  message: text("message"),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
