import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Notification } from "../models/Notification.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 30), 100);
  const unreadOnly = String(req.query.unread || "") === "true";

  const filter: Record<string, unknown> = { userId: req.user!.userId };
  if (unreadOnly) filter.read = false;

  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ userId: req.user!.userId, read: false }),
  ]);

  return res.json({ notifications: items, unreadCount });
});

router.post("/read-all", requireAuth, async (req, res) => {
  await Notification.updateMany(
    { userId: req.user!.userId, read: false },
    { $set: { read: true } }
  );
  return res.json({ ok: true });
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const item = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.userId },
    { $set: { read: true } },
    { new: true }
  );
  if (!item) return res.status(404).json({ error: "Not found" });
  return res.json({ notification: item });
});

export default router;
