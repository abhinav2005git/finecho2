import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";

const router = Router();

/** GET /api/clients - (advisor_id from auth) */
router.get("/", async (req, res) => {
  try {
    // Use authenticated user's ID
    const advisor_id = req.user.id;

    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("id, name, email, phone")
      .eq("advisor_id", advisor_id)
      .order("name");

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
