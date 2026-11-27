import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const numberValue = z.coerce.number().finite();
const nonNegativeNumber = numberValue.nonnegative();

export const storeSnapshotSchema = z.object({
  products: z.array(z.object({
    externalId: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(240),
    category: optionalText(120),
    subcategory: optionalText(120),
    salePrice: nonNegativeNumber.optional(),
    stock: nonNegativeNumber.optional(),
    isActive: z.boolean().optional(),
  })).max(5000).optional().default([]),
  orders: z.array(z.object({
    externalId: z.string().trim().min(1).max(120),
    customerName: optionalText(180),
    customerEmail: optionalText(320),
    customerPhone: optionalText(40),
    totalAmount: nonNegativeNumber,
    shippingCost: nonNegativeNumber.optional(),
    currency: z.string().trim().min(1).max(8).optional(),
    status: z.string().trim().min(1).max(48),
    items: z.unknown().optional(),
    orderDate: z.coerce.date(),
  })).max(10000).optional().default([]),
  customOrders: z.array(z.object({
    externalId: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(120),
    vision: optionalText(10000),
    colors: z.array(z.string().trim().max(80)).max(50).optional(),
    requestedMaterials: optionalText(5000),
    customerName: z.string().trim().min(1).max(180),
    customerPhone: z.string().trim().min(1).max(40),
    customerEmail: optionalText(320),
    deliveryLocation: optionalText(240),
    status: z.string().trim().min(1).max(48).optional(),
    orderDate: z.coerce.date(),
  })).max(5000).optional().default([]),
}).strict();

export type StoreSnapshot = z.infer<typeof storeSnapshotSchema>;
