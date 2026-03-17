import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, platformSettingsTable } from "@workspace/db";
import {
  GetSettingsResponse,
  UpdateSettingBody,
  UpdateSettingParams,
  UpdateSettingResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";
import { DEFAULT_SETTINGS } from "../lib/defaultSettings.js";

const router: IRouter = Router();

async function ensureDefaultSettings(): Promise<void> {
  for (const setting of DEFAULT_SETTINGS) {
    await db
      .insert(platformSettingsTable)
      .values(setting)
      .onConflictDoNothing();
  }
}

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  await ensureDefaultSettings();
  const settings = await db.select().from(platformSettingsTable);
  res.json(GetSettingsResponse.parse(settings));
});

router.put("/settings/:platformId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSettingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateSettingBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(platformSettingsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(platformSettingsTable.platformId, params.data.platformId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Platform not found" });
    return;
  }

  res.json(UpdateSettingResponse.parse(updated));
});

export default router;
