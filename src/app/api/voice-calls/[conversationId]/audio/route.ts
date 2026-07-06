import { NextRequest, NextResponse } from "next/server";

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
    `${ELEVENLABS_BASE}/v1/convai/conversations/${conversationId}/audio`,
    { headers: { "xi-api-key": apiKey } }
  );

  if (!elRes.ok) {
    const text = await elRes.text();
    return NextResponse.json({ error: text }, { status: elRes.status });
  }

  const contentType = elRes.headers.get("content-type") ?? "audio/mpeg";
  const buffer = await elRes.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
