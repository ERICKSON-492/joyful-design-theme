import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { importStoreSnapshot } from "./db";
import { storeSnapshotSchema } from "./storeSyncContract";

export function registerStoreSyncRoute(app: Express, apiBasePath = "/api") {
  app.post(`${apiBasePath}/store-sync`, async (req: Request, res: Response) => {
    const configured = process.env.STORE_SYNC_SECRET;
    if (!configured) {
      res.status(503).json({ error: "Store sync is not configured" });
      return;
    }
    const provided = req.header("x-store-sync-secret") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (!provided || provided.length !== configured.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configured))) {
      res.status(401).json({ error: "Invalid store sync credential" });
      return;
    }
    try {
      const parsed = storeSnapshotSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid store sync payload", details: parsed.error.flatten() });
        return;
      }
      const result = await importStoreSnapshot(parsed.data);
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error("[Store sync] failed", error);
      res.status(500).json({ error: "Store sync failed" });
    }
  });
}
