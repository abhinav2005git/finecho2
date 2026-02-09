import { supabaseAdmin } from "../supabase.js";

/**
 * Middleware to verify Supabase JWT token from Authorization header.
 * Sets req.user with { id, email, role } if valid.
 */
export async function verifyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      // If profile doesn't exist, create one (fallback)
      const { data: newProfile } = await supabaseAdmin
        .from("profiles")
        .insert([
          {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
            role: user.user_metadata?.role || "advisor",
          },
        ])
        .select("id, email, name, role")
        .single();

      if (newProfile) {
        req.user = newProfile;
        return next();
      }
      return res.status(403).json({ error: "User profile not found" });
    }

    // Attach user info to request
    req.user = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Middleware to check if user has required role.
 * Use after verifyAuth.
 * @param {...string} allowedRoles - Roles that can access (e.g., 'admin', 'advisor')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(" or ")}` 
      });
    }

    next();
  };
}

/**
 * Convenience: require admin role
 */
export const requireAdmin = requireRole("admin");

/**
 * Convenience: require advisor or admin
 */
export const requireAdvisor = requireRole("advisor", "admin");
