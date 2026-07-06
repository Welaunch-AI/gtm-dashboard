/**
 * /api/invites/[token]
 *
 * Public endpoints for the invite-acceptance flow (no login required).
 *
 * GET  — look up an invite by token (email/name/org to prefill the form)
 * POST — accept the invite: create the auth user with the chosen password,
 *        insert their profile, mark the invite used.
 */

import { NextRequest, NextResponse } from "next/server";
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = adminClient();

  const { data: invite, error } = await admin
    .from("user_invites")
    .select("email, full_name, org_id, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) return NextResponse.json({ error: "This invite link is invalid." }, { status: 404 });
  if (invite.used_at) return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "This invite has expired." }, { status: 410 });

  let orgName: string | null = null;
  if (invite.org_id) {
    const { data: org } = await admin.from("organisations").select("name").eq("id", invite.org_id).maybeSingle();
    orgName = org?.name ?? null;
  }

  return NextResponse.json({
    email: invite.email,
    full_name: invite.full_name,
    org_name: orgName,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { password, full_name } = await req.json() as { password: string; full_name?: string };

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const admin = adminClient();

  const { data: invite, error: fetchErr } = await admin
    .from("user_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (fetchErr || !invite) return NextResponse.json({ error: "This invite link is invalid." }, { status: 404 });
  if (invite.used_at) return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "This invite has expired." }, { status: 410 });

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: (full_name ?? invite.full_name)?.trim() || "" },
  });
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });

  // A DB trigger (on_auth_user_created) already inserted a default profile row
  // for this new auth user — fill in the invite's role/org/name on top of it.
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      full_name: (full_name ?? invite.full_name)?.trim() || null,
      role: invite.role,
      org_id: invite.org_id,
    })
    .eq("id", created.user.id);

  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  await admin.from("user_invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id);

  return NextResponse.json({ ok: true, email: invite.email }, { status: 201 });
}
