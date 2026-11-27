import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getConnectionStatus, getDashboardSummary, createExpense, createMaterial, importStoreSnapshot, listExpenses, listInventory, listMaterials } from "./db";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { storeSnapshotSchema } from "./storeSyncContract";
import { getCatalogueShareToken, getStorefrontSummary, getStorefrontProducts, isValidCatalogueShareToken } from "./storefront";
import { getCatalogue } from "./catalogue";

const dateRange = z.object({ from: z.string().optional(), to: z.string().optional() }).optional();
const parseRange = (range?: { from?: string; to?: string }) => ({ from: range?.from ? new Date(range.from) : undefined, to: range?.to ? new Date(range.to) : undefined });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  books: router({
    dashboard: adminProcedure.input(dateRange).query(({ input }) => getDashboardSummary(...Object.values(parseRange(input)) as [Date | undefined, Date | undefined])),
    materials: adminProcedure.query(() => listMaterials()),
    addMaterial: adminProcedure.input(z.object({ name: z.string().min(2), sku: z.string().optional(), unit: z.string().min(1), supplier: z.string().optional(), currentUnitPrice: z.coerce.number().nonnegative(), reorderLevel: z.coerce.number().nonnegative() })).mutation(({ input }) => createMaterial({ ...input, currentUnitPrice: String(input.currentUnitPrice), reorderLevel: String(input.reorderLevel), active: 1 })),
    expenses: adminProcedure.query(() => listExpenses()),
    addExpense: adminProcedure.input(z.object({ category: z.enum(["supplier", "shipping", "packaging", "marketing", "wages", "other"]), description: z.string().min(2), vendor: z.string().optional(), amount: z.coerce.number().positive(), expenseDate: z.string(), paymentStatus: z.enum(["paid", "pending", "cancelled"]).default("paid"), notes: z.string().optional() })).mutation(({ input }) => createExpense({ ...input, amount: String(input.amount), expenseDate: new Date(input.expenseDate) })),
    inventory: adminProcedure.query(() => listInventory()),
    connection: adminProcedure.query(() => getConnectionStatus()),
    storefront: adminProcedure.query(() => getStorefrontSummary()),
    catalogue: adminProcedure.query(() => getCatalogue()),
    catalogueShare: adminProcedure.query(() => ({ token: getCatalogueShareToken() })),
    customerCatalogue: publicProcedure.input(z.object({ token: z.string().length(64) })).query(({ input }) => {
      if (!isValidCatalogueShareToken(input.token)) throw new TRPCError({ code: "FORBIDDEN", message: "Invalid catalogue share link" });
      return getStorefrontProducts();
    }),
    importSnapshot: adminProcedure.input(storeSnapshotSchema).mutation(({ input }) => importStoreSnapshot(input)),
  }),
});

export type AppRouter = typeof appRouter;
