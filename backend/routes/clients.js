import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";

const router = Router();

/** GET /api/clients - (no auth required) */
router.get("/", async (req, res) => {
  try {
    // No user filtering since auth is removed

    const { data, error } = await supabaseAdmin
  .from("clients")
  .select("id, name, email")
  .order("name");
  console.log("Fetched clients:", data);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.message?.includes("does not exist") || error.message?.includes("schema cache")) {
        console.warn("clients table not found, returning empty list. Run migration: backend/migrations/001_calls_clients.sql");
        return res.json([]);
      }
      return res.status(500).json({ error: error.message });
    }
    res.json(data ?? []);
  } catch (err) {
    console.error("Clients list error:", err);
    res.status(500).json({ error: "Clients list failed" });
  }
});

export default router;
