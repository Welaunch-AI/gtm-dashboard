/**
 * /api/admin/invites
 *
 * Admin-only management of magic invite links. Instead of creating a
 * password directly, admins generate a link pre-filled with the invitee's
 * name + email; the invitee opens it, sets their own password, and is
 * logged straight into their workspace.
 *
 * POST   — create a new invite for an email/org, returns the invite link
 * GET    — list pending (unused, unexpired) invites, optionally by org
 * DELETE — revoke a pending invite
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in .env.local");
  return createSupabaseAdminClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function assertAdmin(req: NextRequest): Promise<{ ok: true; userId: string } | NextResponse> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return { ok: true, userId: user.id };
}

function getBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return req.nextUrl.origin;
}

// ── GET — list pending invites ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await assertAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const orgId = new URL(req.url).searchParams.get("orgId");
  const admin = adminClient();

  let q = admin.from("user_invites").select("*").is("used_at", null).order("created_at", { ascending: false });
  if (orgId) q = q.eq("org_id", orgId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = getBaseUrl(req);
  const invites = (data ?? []).map((inv) => ({
    ...inv,
    expired: new Date(inv.expires_at) < new Date(),
    link: `${baseUrl}/invite/${inv.token}`,
  }));

  return NextResponse.json({ invites });
}

// ── POST — create invite ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await assertAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json() as { email: string; full_name?: string; org_id?: string; role?: "admin" | "client" };
  const { email, full_name, org_id, role } = body;
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

  const finalRole: "admin" | "client" = role === "admin" ? "admin" : "client";
  const admin = adminClient();

  // Don't let an invite collide with an already-registered account
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (existing.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const { data, error } = await admin
    .from("user_invites")
    .insert({
      email: email.trim().toLowerCase(),
      full_name: full_name?.trim() || null,
      org_id: finalRole === "admin" ? null : org_id || null,
      role: finalRole,
      created_by: guard.userId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = getBaseUrl(req);
  return NextResponse.json({ invite: { ...data, link: `${baseUrl}/invite/${data.token}` } }, { status: 201 });
}

// ── DELETE — revoke invite ────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const guard = await assertAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const { inviteId } = await req.json() as { inviteId: string };
  if (!inviteId) return NextResponse.json({ error: "inviteId is required" }, { status: 400 });

  const admin = adminClient();
  const { error } = await admin.from("user_invites").delete().eq("id", inviteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
