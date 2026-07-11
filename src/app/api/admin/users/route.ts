/**
 * /api/admin/users
 *
 * Server-side user management using the Supabase service-role key.
 * Only callable by authenticated admins (validated on every request).
 *
 * POST   — create a new user with email + password, assign to org, set role
 * PATCH  — change a user's password or full_name
 * DELETE — delete a user account
 * GET    — list all users in a given org (by org_id query param)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// ── helpers ──────────────────────────────────────────────────────────────────

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in .env.local");
  return createSupabaseAdminClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function assertAdmin(req: NextRequest): Promise<{ ok: true; userId: string } | NextResponse> {
  // Validate the caller's session cookie using the anon key (no privileges needed for reads)
  const response = NextResponse.next();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  void response;
  return { ok: true, userId: user.id };
}

// ── GET — list users in an org ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await assertAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const orgId = new URL(req.url).searchParams.get("orgId");
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );

  let q = supabase.from("profiles").select("id, full_name, role, org_id, avatar_url, created_at");
  if (orgId) q = q.eq("org_id", orgId);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch emails from auth.users via admin client
  const admin = adminClient();
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  for (const u of authUsers) emailMap[u.id] = u.email ?? "";

  const enriched = (data ?? []).map((p) => ({ ...p, email: emailMap[p.id] ?? "" }));
  return NextResponse.json({ users: enriched });
}

// ── POST — create user ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await assertAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json() as { email: string; password: string; full_name?: string; org_id?: string; role?: "admin" | "client" };
  const { email, password, full_name, org_id, role } = body;

  if (!email || !password) return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const finalRole: "admin" | "client" = role === "admin" ? "admin" : "client";
  const admin = adminClient();

  // Create auth user with password (no magic link, no email verification)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // mark email as confirmed so they can log in immediately
    user_metadata: { full_name: full_name?.trim() || "" },
  });
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });

  // A DB trigger (on_auth_user_created) already inserted a default profile row
  // for this new auth user — fill in the role/org/name on top of it.
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      full_name: full_name?.trim() || null,
      role: finalRole,
      org_id: finalRole === "admin" ? null : org_id || null,
    })
    .eq("id", created.user.id);

  if (profileErr) {
    // Roll back auth user
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ user: { id: created.user.id, email, full_name, org_id } }, { status: 201 });
}

// ── PATCH — update password or name ─────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const guard = await assertAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json() as {
    userId: string; password?: string; full_name?: string;
    role?: "admin" | "client"; org_id?: string | null;
  };
  const { userId, password, full_name, role, org_id } = body;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  if (role && userId === guard.userId) {
    return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
  }

  const admin = adminClient();
  const updates: { password?: string; email_confirm?: boolean } = {};
  if (password) {
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    updates.password = password;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(userId, updates);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const profileUpdates: { full_name?: string | null; role?: "admin" | "client"; org_id?: string | null } = {};
  if (full_name !== undefined) profileUpdates.full_name = full_name.trim() || null;
  if (role !== undefined) profileUpdates.role = role;
  if (org_id !== undefined) profileUpdates.org_id = org_id || null;
  // Admins are agency-side and aren't scoped to a single client workspace.
  if (profileUpdates.role === "admin") profileUpdates.org_id = null;

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await admin.from("profiles").update(profileUpdates).eq("id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE — remove user ──────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const guard = await assertAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const { userId } = await req.json() as { userId: string };
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  const admin = adminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
