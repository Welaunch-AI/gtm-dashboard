import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ELEVENLABS_BASE = "https://api.elevenlabs.io";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
  }

  const elRes = await fetch(
    `${ELEVENLABS_BASE}/v1/convai/conversations/${conversationId}`,
    { headers: { "xi-api-key": apiKey }, cache: "no-store" }
  );

  if (!elRes.ok) {
    const text = await elRes.text();
    return NextResponse.json({ error: text }, { status: elRes.status });
  }

  const data = await elRes.json();

  // Merge tag override
  const supabase = await createClient();
  const { data: tag } = await supabase
    .from("voice_call_tags")
    .select("outcome, admin_note")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  return NextResponse.json({
    ...data,
    outcome_override: tag?.outcome ?? null,
    admin_note: tag?.admin_note ?? null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const body = await req.json();
  const { outcome, admin_note, org_id } = body as {
    outcome?: string;
    admin_note?: string;
    org_id?: string;
  };

  const supabase = await createClient();
  const { error } = await supabase.from("voice_call_tags").upsert(
    { conversation_id: conversationId, outcome, admin_note, org_id, tagged_at: new Date().toISOString() },
    { onConflict: "conversation_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
