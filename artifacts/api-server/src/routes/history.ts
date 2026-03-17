import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, generationHistoryTable } from "@workspace/db";
import {
  GetHistoryResponse,
  SaveHistoryBody,
  DeleteHistoryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/history", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(generationHistoryTable)
    .orderBy(desc(generationHistoryTable.createdAt));

  const entries = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    mapType: row.mapType,
    contextNotes: row.contextNotes,
    imageThumbnail: row.imageThumbnail,
    captions: JSON.parse(row.captionsJson),
  }));

  res.json(GetHistoryResponse.parse(entries));
});

router.post("/history", requireAuth, async (req, res): Promise<void> => {
  const parsed = SaveHistoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { mapType, contextNotes, imageThumbnail, captions } = parsed.data;

  const [row] = await db
    .insert(generationHistoryTable)
    .values({
      mapType,
      contextNotes: contextNotes ?? null,
      imageThumbnail: imageThumbnail ?? null,
      captionsJson: JSON.stringify(captions),
    })
    .returning();

  const entry = {
    id: row.id,
    createdAt: row.createdAt,
    mapType: row.mapType,
    contextNotes: row.contextNotes,
    imageThumbnail: row.imageThumbnail,
    captions: JSON.parse(row.captionsJson),
  };

  res.status(201).json(entry);
});

router.delete("/history/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(generationHistoryTable)
    .where(eq(generationHistoryTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "History entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
