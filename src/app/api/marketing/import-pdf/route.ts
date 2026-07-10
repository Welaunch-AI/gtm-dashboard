import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export const runtime = "nodejs";

const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExtractedPost = {
  title: string;
  caption: string | null;
  platform: string;
  persona: string | null;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string | null; // HH:MM 24h or null
};

type ExistingPost = {
  id: string;
  title: string;
  scheduled_date: string;
};

export type FlaggedPost = {
  extracted: ExtractedPost;
  matchedExisting: { id: string; title: string; scheduled_date: string };
};

export type ImportResult = {
  created: Array<{
    id: string;
    org_id: string | null;
    title: string;
    caption: string | null;
    platform: string;
    persona: string | null;
    scheduled_date: string;
    scheduled_time: string | null;
    status: string;
    created_by: string | null;
    created_at: string;
  }>;
  flagged: FlaggedPost[];
};

// ── Text normalisation for duplicate detection ────────────────────────────────

function normalise(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")  // strip punctuation
    .replace(/\s+/g, " ");
}

function wordSet(text: string): Set<string> {
  return new Set(normalise(text).split(" ").filter(Boolean));
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = new Set([...setA].filter(w => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function isDuplicate(title: string, existing: ExistingPost[]): ExistingPost | null {
  const normTitle = normalise(title);
  for (const ex of existing) {
    const normEx = normalise(ex.title);
    if (normTitle === normEx) return ex;
    if (jaccardSimilarity(normTitle, normEx) >= 0.7) return ex;
  }
  return null;
}

// ── Today in EST anchor for date inference ────────────────────────────────────

function todayEstYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not set. Add it to .env.local and restart the server." }, { status: 500 });
    }

    // 1. Parse multipart form data
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const orgId = form.get("orgId") as string | null;
    const authorName = (form.get("authorName") as string | null) ?? "Admin";

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
    }

    // 2. Extract raw text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    let pdfText: string;
    try {
      const parsed = await pdfParse(pdfBuffer);
      pdfText = parsed.text as string;
    } catch (e) {
      return NextResponse.json({ error: `Failed to parse PDF: ${e instanceof Error ? e.message : String(e)}` }, { status: 422 });
    }

    if (!pdfText.trim()) {
      return NextResponse.json({ error: "The PDF appears to have no readable text. Only text-based PDFs are supported." }, { status: 422 });
    }

    // 3. Call OpenRouter AI for structured extraction
    const today = todayEstYmd();
    const systemPrompt = `You are a calendar post extractor. You will be given the raw text of a social media content plan PDF. Extract every scheduled post and return ONLY a JSON array (no markdown, no explanation) where each element has these fields:

- "title": string (required) — the post headline/title
- "caption": string or null — body copy / caption text if present
- "platform": string — social network (e.g. LinkedIn, Instagram, X, TikTok, Facebook, YouTube). Use the closest known platform name from the PDF. Default to "LinkedIn" if unspecified.
- "persona": string or null — the account/persona name. Default to "Company (all)" if not specified.
- "scheduled_date": string — ISO date "YYYY-MM-DD" in EST. If the PDF gives a weekday name, month name, or partial date without a year, infer the year using today (${today} EST) as the anchor. Roll forward to the next occurrence of that date if it would otherwise be more than 45 days in the past.
- "scheduled_time": string or null — "HH:MM" in 24-hour format if a time is given, otherwise null.

Return ONLY the raw JSON array, starting with [ and ending with ].`;

    const aiRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://welaunch.io",
        "X-Title": "WeLaunch Portal",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: pdfText.slice(0, 40000) }, // guard against huge PDFs
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json({ error: `OpenRouter error ${aiRes.status}: ${errText}` }, { status: 502 });
    }

    const aiJson = await aiRes.json();
    const rawContent: string = aiJson?.choices?.[0]?.message?.content ?? "";

    let extractedPosts: ExtractedPost[];
    try {
      // The model may return an array or a {posts:[...]} wrapper
      let parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        extractedPosts = parsed;
      } else if (parsed && typeof parsed === "object") {
        // Find first array value
        const firstArr = Object.values(parsed).find(v => Array.isArray(v));
        if (firstArr) {
          extractedPosts = firstArr as ExtractedPost[];
        } else {
          throw new Error("AI response did not contain a JSON array.");
        }
      } else {
        throw new Error("AI response was not valid JSON.");
      }
    } catch (e) {
      return NextResponse.json({
        error: `Failed to parse AI response as JSON: ${e instanceof Error ? e.message : String(e)}`,
        rawContent,
      }, { status: 500 });
    }

    if (!Array.isArray(extractedPosts) || extractedPosts.length === 0) {
      return NextResponse.json({ error: "No posts found in the PDF. Make sure the PDF contains scheduled post information." }, { status: 422 });
    }

    // 4. Fetch existing posts for the extracted dates from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const uniqueDates = [...new Set(extractedPosts.map(p => p.scheduled_date).filter(Boolean))];
    let existingPosts: ExistingPost[] = [];
    if (uniqueDates.length > 0) {
      let query = supabase
        .from("cal_posts")
        .select("id, title, scheduled_date")
        .in("scheduled_date", uniqueDates);
      if (orgId) {
        query = query.eq("org_id", orgId);
      } else {
        query = query.is("org_id", null);
      }
      const { data: existing } = await query;
      existingPosts = (existing ?? []) as ExistingPost[];
    }

    // 5. Separate duplicates from new posts
    const toCreate: ExtractedPost[] = [];
    const flagged: FlaggedPost[] = [];

    for (const post of extractedPosts) {
      if (!post.scheduled_date || !post.title) continue; // skip malformed
      const sameDay = existingPosts.filter(e => e.scheduled_date === post.scheduled_date);
      const match = isDuplicate(post.title, sameDay);
      if (match) {
        flagged.push({ extracted: post, matchedExisting: match });
      } else {
        toCreate.push(post);
      }
    }

    // 6. Insert non-duplicate posts
    const inserted: ImportResult["created"] = [];
    if (toCreate.length > 0) {
      const rows = toCreate.map(p => ({
        org_id: orgId ?? null,
        title: p.title,
        caption: p.caption ?? null,
        platform: p.platform ?? "LinkedIn",
        persona: p.persona ?? null,
        scheduled_date: p.scheduled_date,
        scheduled_time: p.scheduled_time ?? null,
        status: "pending" as const,
        created_by: authorName,
      }));

      const { data: createdRows, error: insertErr } = await supabase
        .from("cal_posts")
        .insert(rows)
        .select("*");

      if (insertErr) {
        return NextResponse.json({ error: `Database insert error: ${insertErr.message}` }, { status: 500 });
      }
      inserted.push(...((createdRows ?? []) as ImportResult["created"]));
    }

    return NextResponse.json({ created: inserted, flagged } satisfies ImportResult);
  } catch (err) {
    console.error("[import-pdf]", err);
    return NextResponse.json({ error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
