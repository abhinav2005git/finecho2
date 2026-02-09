import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../supabase.js";
import { runCallPipeline } from "../services/callPipeline.js";
import { getAudioDurationSeconds } from "../services/duration.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname) || ".webm"}`),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

const router = Router();

/** POST /api/calls/upload - multipart: audio, client_id, notes? (advisor_id from auth) */
router.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    const client_id = req.body.client_id || req.body.clientId;
    const notes = req.body.notes || null;
    if (!client_id) {
      return res.status(400).json({ error: "client_id required" });
    }
    if (!req.file?.path) {
      return res.status(400).json({ error: "audio file required" });
    }

    // Look up advisor_id from the client record since this route is public
    const { data: clientRow, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("advisor_id")
      .eq("id", client_id)
      .maybeSingle();

    if (clientError) {
      console.error("Upload error: failed to lookup client", clientError);
      return res.status(500).json({ error: "Failed to look up client" });
    }
    if (!clientRow?.advisor_id) {
      return res.status(400).json({ error: "Client not found" });
    }

    const advisor_id = clientRow.advisor_id;

    // Compute duration using ffprobe; if it fails, log and continue with 0
    let duration_seconds = 0;
    try {
      duration_seconds = await getAudioDurationSeconds(req.file.path);
    } catch (err) {
      console.error("Upload warning: failed to compute duration via ffprobe:", err);
      duration_seconds = 0;
    }

    const { data: row, error } = await supabaseAdmin
      .from("calls")
      .insert([
        {
          advisor_id,
          client_id,
          audio_path: req.file.path,
          duration_seconds,
          notes,
          status: "uploaded",
        },
      ])
      .select("id, status, created_at")
      .single();

    if (error) {
      // Helpful hint if the calls table has not been created yet
      if (error.message?.includes("Could not find the table 'public.calls'")) {
        console.error("Upload error: calls table missing. Run migration backend/migrations/001_calls_clients.sql in Supabase.");
        return res.status(500).json({
          error:
            "Calls table is missing in Supabase. Please run backend/migrations/001_calls_clients.sql in the Supabase SQL editor, then retry.",
        });
      }
      return res.status(500).json({ error: error.message });
    }

    runCallPipeline(row.id, req.file.path).catch((e) =>
      console.error("Pipeline background error:", e)
    );

    res.status(201).json({ success: true, call: row });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

/** GET /api/calls - list calls; query: from, to (no auth required) */
router.get("/", async (req, res) => {
  try {
    // No user filtering since auth is removed
    const from = req.query.from;
    const to = req.query.to;

    // Try calls table first
    let q = supabaseAdmin.from("calls").select("*, clients(id, name)").order("created_at", { ascending: false });
    if (from) q = q.gte("created_at", from + "T00:00:00.000Z");
    if (to) q = q.lte("created_at", to + "T23:59:59.999Z");

    const { data: rows, error } = await q;

    // If calls table has data, return it
    if (!error && rows && rows.length > 0) {
      const list = rows.map((r) => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.clients?.name ?? "Client",
        advisorName: null,
        callDate: r.created_at?.slice(0, 10) ?? "",
        callDuration: r.duration_seconds ?? 0,
        languageDetected: r.language ?? "—",
        aiProcessingStatus: r.status === "completed" ? "processed" : "pending",
        complianceStatus: r.compliance_status === "risk" || r.compliance_status === "warning" ? "needs_review" : "clear",
        compliance_status: r.compliance_status,
        compliance_flags: r.compliance_flags ?? [],
        status: r.status,
      }));
      return res.json(list);
    }

    // Fallback to summaries table if calls table is empty or doesn't exist
    if (error && (error.message?.includes("does not exist") || error.message?.includes("schema cache"))) {
      console.warn("calls table not found, falling back to summaries table");
    } else if (!error && (!rows || rows.length === 0)) {
      console.log("calls table is empty, falling back to summaries table");
    }

    // Query summaries table as fallback
    let fallback = supabaseAdmin.from("summaries").select("*").order("created_at", { ascending: false });
    if (from) fallback = fallback.gte("created_at", from + "T00:00:00.000Z");
    if (to) fallback = fallback.lte("created_at", to + "T23:59:59.999Z");

    const { data: summaryRows, error: summaryError } = await fallback;

    if (summaryError) {
      return res.status(500).json({ error: summaryError.message });
    }

    // Map summaries to calls format
    const needsReview = (v) => v === "needs_review" || (typeof v === "object" && v?.status === "needs_review");
    const list = (summaryRows || []).map((r) => ({
      id: r.call_id || r.id,
      clientId: r.call_id || r.id,
      clientName: "Client",
      advisorName: "Advisor",
      callDate: r.created_at ? r.created_at.slice(0, 10) : "",
      callDuration: 0,
      languageDetected: "—",
      aiProcessingStatus: "processed",
      complianceStatus: needsReview(r.compliance) ? "needs_review" : "clear",
      compliance_status: needsReview(r.compliance) ? "warning" : "clear",
      compliance_flags: [],
      status: "completed",
    }));

    res.json(list);
  } catch (err) {
    console.error("Calls list error:", err);
    res.status(500).json({ error: "Calls list failed" });
  }
});

/** GET /api/calls/:id - single call with client name */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: row, error } = await supabaseAdmin
      .from("calls")
      // Some deployments of the clients table do not have a phone column,
      // so we only select id + name + email here to avoid schema errors.
      .select("*, clients(id, name, email)")
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!row) return res.status(404).json({ error: "Call not found" });

    res.json({
      id: row.id,
      advisor_id: row.advisor_id,
      client_id: row.client_id,
      clientName: row.clients?.name ?? "Client",
      clientEmail: row.clients?.email,
      clientPhone: row.clients?.phone ?? null,
      transcript: row.transcript,
      summary: row.summary,
      goals: row.goals ?? [],
      language: row.language,
      duration_seconds: row.duration_seconds ?? 0,
      status: row.status,
      compliance_status: row.compliance_status ?? "clear",
      compliance_flags: row.compliance_flags ?? [],
      notes: row.notes,
      created_at: row.created_at,
    });
  } catch (err) {
    console.error("Call get error:", err);
    res.status(500).json({ error: "Call fetch failed" });
  }
});

/** DELETE /api/calls/:id - delete a call (no audio cleanup needed; already removed) */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("calls").delete().eq("id", id);

    if (error) {
      console.error("Call delete error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Call delete unexpected error:", err);
    res.status(500).json({ error: "Call delete failed" });
  }
});

export default router;
