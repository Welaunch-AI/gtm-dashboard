import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ELEVENLABS_BASE = "https://api.elevenlabs.io";

/** Fetch one page of conversations from ElevenLabs */
async function fetchPage(
  agentId: string,
  apiKey: string,
  cursor?: string
): Promise<{ conversations: ELConversation[]; next_cursor: string | null; has_more: boolean }> {
  const url = new URL(`${ELEVENLABS_BASE}/v1/convai/conversations`);
  url.searchParams.set("agent_id", agentId);
  url.searchParams.set("page_size", "100");
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    conversations: data.conversations ?? [],
    next_cursor: data.next_cursor ?? null,
    has_more: data.has_more ?? false,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  // If cursor is provided, return only that page (used by "Load more")
  const cursor = searchParams.get("cursor") ?? undefined;
  const loadAll = !cursor; // first load fetches entire history

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
  }

  try {
    let allConversations: ELConversation[] = [];
    let nextCursor: string | null = cursor ?? null;
    let hasMore = true;

    // On initial load, paginate through the full history (up to 500 calls max)
    do {
      const page = await fetchPage(agentId, apiKey, nextCursor ?? undefined);
      allConversations = allConversations.concat(page.conversations);
      nextCursor = page.next_cursor;
      hasMore = page.has_more && !!nextCursor;
    } while (loadAll && hasMore && allConversations.length < 500);

    // Fetch tag overrides from Supabase
    const supabase = await createClient();
    const ids = allConversations.map((c) => c.conversation_id);
    const { data: tags } = ids.length
      ? await supabase.from("voice_call_tags").select("*").in("conversation_id", ids)
      : { data: [] };

    const tagMap: Record<string, { outcome: string | null; admin_note: string | null }> = {};
    for (const t of tags ?? []) {
      tagMap[t.conversation_id] = { outcome: t.outcome, admin_note: t.admin_note };
    }

    const merged = allConversations.map((c) => ({
      ...c,
      outcome_override: tagMap[c.conversation_id]?.outcome ?? null,
      admin_note: tagMap[c.conversation_id]?.admin_note ?? null,
    }));

    return NextResponse.json({
      conversations: merged,
      next_cursor: loadAll ? null : nextCursor,
      total: merged.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface ELAnalysis {
  call_successful?: string;
  transcript_summary?: string;
  data_collection_results?: Record<string, { value?: string; rationale?: string }>;
  evaluation_criteria_results?: Record<string, { result?: string; rationale?: string }>;
}

interface ELConversation {
  conversation_id: string;
  agent_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  status: string;
  call_successful: string;
  message_count?: number;
  analysis?: ELAnalysis;
  metadata?: {
    phone_number?: string;
    external_id?: string;
    [key: string]: unknown;
  };
  conversation_initiation_client_data?: {
    dynamic_variables?: Record<string, unknown>;
    [key: string]: unknown;
  };
}
