"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ELAnalysis {
  call_successful?: string;
  transcript_summary?: string;
  data_collection_results?: Record<string, { value?: string; rationale?: string }>;
  evaluation_criteria_results?: Record<string, { result?: string; rationale?: string }>;
}

interface Conversation {
  conversation_id: string;
  agent_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  status: string;
  call_successful: string;
  message_count?: number;
  outcome_override: string | null;
  admin_note: string | null;
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

interface TranscriptTurn {
  role: "agent" | "user";
  message: string;
  time_in_call_secs?: number;
}

interface ConversationDetail extends Conversation {
  transcript: TranscriptTurn[];
}

type Outcome = "Not Qualified" | "Qualified" | "Meeting Booked" | "Untagged" | "success";

interface Props {
  agentId: string;
  orgId: string | null;
  isAdmin: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatDateTime(unix: number): string {
  const d = new Date(unix * 1000);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const OUTCOME_OPTIONS: Outcome[] = ["Not Qualified", "Qualified", "Meeting Booked", "Untagged"];

function resolveOutcome(c: Conversation): Outcome {
  if (c.outcome_override) return c.outcome_override as Outcome;
  const raw = c.analysis?.call_successful ?? c.call_successful ?? "";
  if (raw === "success") return "Qualified";
  if (raw === "failure") return "Not Qualified";
  return "Untagged";
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const styles: Record<string, React.CSSProperties> = {
    "Meeting Booked": { background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    Qualified: { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" },
    "Not Qualified": { background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" },
    Untagged: { background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" },
    success: { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" },
  };
  const s = styles[outcome] ?? styles.Untagged;
  return (
    <span style={{ ...s, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {outcome}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      background: status === "success" || status === "done" ? "#dcfce7" : "#f3f4f6",
      color: status === "success" || status === "done" ? "#15803d" : "#6b7280",
      border: `1px solid ${status === "success" || status === "done" ? "#bbf7d0" : "#e5e7eb"}`,
      padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

/**
 * Derive a concise, human-readable title from ElevenLabs conversation data.
 * Priority order:
 *   1. data_collection_results fields that look like a topic/purpose
 *   2. A cleaned-up noun phrase from the first sentence of transcript_summary
 *   3. Phone number or external_id from metadata
 *   4. Fallback to short conversation ID
 */
function getCallTitle(c: Conversation): string {
  const dcr = c.analysis?.data_collection_results ?? {};

  // Common field names that indicate the topic or purpose of the call
  const topicFields = [
    "call_title", "topic", "purpose", "inquiry_type", "franchise_interest",
    "call_purpose", "subject", "category",
  ];
  for (const field of topicFields) {
    const val = dcr[field]?.value?.trim();
    if (val && val.length > 2) return val;
  }

  // Build "Topic — CallerName" from known DCR fields
  const nameVal = (
    dcr["name"]?.value ?? dcr["caller_name"]?.value ??
    dcr["first_name"]?.value ?? dcr["full_name"]?.value
  )?.trim();

  const summary = c.analysis?.transcript_summary?.trim();
  if (summary) {
    // Extract a title-like phrase: take the first sentence, strip filler opener,
    // then cap to ~8 words.
    let sentence = summary.split(/[.!?]/)[0]?.trim() ?? "";

    // Strip common openers like "The user, X," or "The caller"
    sentence = sentence
      .replace(/^The (?:user|caller|client|agent|prospect),?\s+\w+,?\s+/i, "")
      .replace(/^The (?:user|caller|client|agent|prospect)\s+/i, "")
      .trim();

    // Capitalise first letter
    if (sentence.length > 0) {
      sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    }

    // Cap to 8 words for a title
    const words = sentence.split(/\s+/);
    const title = words.slice(0, 8).join(" ") + (words.length > 8 ? "…" : "");

    if (title.length > 4) {
      return nameVal ? `${title} — ${nameVal}` : title;
    }
  }

  if (nameVal) return `Call with ${nameVal}`;

  const phone = c.metadata?.phone_number;
  if (phone) return `Call from ${phone}`;

  const d = new Date(c.start_time_unix_secs * 1000);
  return `Call on ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

// ─── Inline expanded row ──────────────────────────────────────────────────────

function ExpandedRow({
  conv,
  orgId,
  isAdmin,
  onOutcomeChange,
}: {
  conv: Conversation;
  orgId: string | null;
  isAdmin: boolean;
  onOutcomeChange: (id: string, outcome: string) => void;
}) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [localOutcome, setLocalOutcome] = useState<string>(resolveOutcome(conv));
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setLoadingDetail(true);
    fetch(`/api/voice-calls/${conv.conversation_id}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoadingDetail(false); })
      .catch(() => setLoadingDetail(false));
  }, [conv.conversation_id]);

  async function saveOutcome(outcome: string) {
    setSavingOutcome(true);
    await fetch(`/api/voice-calls/${conv.conversation_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, org_id: orgId }),
    });
    setSavingOutcome(false);
    onOutcomeChange(conv.conversation_id, outcome);
  }

  return (
    <div style={{
      borderTop: "1px solid #f3f4f6",
      padding: "20px 24px 24px",
      background: "#fafafa",
    }}>
      {/* Summary */}
      {conv.analysis?.transcript_summary && (
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
          padding: "12px 16px", marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#9ca3af", margin: "0 0 6px" }}>
            SUMMARY
          </p>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0 }}>
            {conv.analysis.transcript_summary}
          </p>
        </div>
      )}

      {/* Audio player */}
      <div style={{ marginBottom: 20 }}>
        {!audioLoaded ? (
          <button
            onClick={() => setAudioLoaded(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
              background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#374151",
            }}
          >
            <PhoneIcon size={16} />
            Load recording
          </button>
        ) : (
          <audio
            ref={audioRef}
            controls
            src={`/api/voice-calls/${conv.conversation_id}/audio`}
            style={{ width: "100%", borderRadius: 8 }}
          />
        )}
      </div>

      {/* Transcript */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#9ca3af", marginBottom: 12 }}>
          TRANSCRIPT
        </p>
        {loadingDetail ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading transcript…</div>
        ) : (detail?.transcript ?? []).length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14 }}>No transcript available.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(detail?.transcript ?? []).map((turn, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{
                  flexShrink: 0,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                  padding: "3px 8px", borderRadius: 4,
                  background: turn.role === "agent" ? "#eff6ff" : "#f9fafb",
                  color: turn.role === "agent" ? "#2563eb" : "#374151",
                  marginTop: 2,
                  minWidth: 52, textAlign: "center",
                }}>
                  {turn.role === "agent" ? "AGENT" : "CALLER"}
                </span>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.55, margin: 0 }}>
                  {turn.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin outcome override */}
      {isAdmin && (
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Outcome:</label>
          <select
            value={localOutcome}
            onChange={(e) => setLocalOutcome(e.target.value)}
            style={{
              padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db",
              fontSize: 13, background: "#fff", color: "#111827",
            }}
          >
            {OUTCOME_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <button
            onClick={() => saveOutcome(localOutcome)}
            disabled={savingOutcome}
            style={{
              padding: "6px 14px", borderRadius: 6, border: "none",
              background: "#111827", color: "#fff", fontSize: 13, fontWeight: 500,
              cursor: savingOutcome ? "not-allowed" : "pointer", opacity: savingOutcome ? 0.6 : 1,
            }}
          >
            {savingOutcome ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VoiceAgentPage({ agentId, orgId, isAdmin }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterOutcome, setFilterOutcome] = useState<string>("All outcomes");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/voice-calls", window.location.origin);
      url.searchParams.set("agentId", agentId);
      // No cursor = server auto-paginates entire history
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.error) console.error("Voice calls fetch error:", data.error);
      setConversations(data.conversations ?? []);
      setNextCursor(data.next_cursor ?? null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCalls();
  }, [fetchCalls]);

  function handleOutcomeChange(id: string, outcome: string) {
    setConversations((prev) =>
      prev.map((c) => c.conversation_id === id ? { ...c, outcome_override: outcome } : c)
    );
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalCalls = conversations.length;
  const meetingsBooked = conversations.filter((c) => resolveOutcome(c) === "Meeting Booked").length;
  const qualified = conversations.filter((c) => resolveOutcome(c) === "Qualified").length;
  const avgDuration = totalCalls > 0
    ? Math.round(conversations.reduce((s, c) => s + c.call_duration_secs, 0) / totalCalls)
    : 0;

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = filterOutcome === "All outcomes"
    ? conversations
    : conversations.filter((c) => resolveOutcome(c) === filterOutcome);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>AI Voice Agent</h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 28 }}>
        Live calls from your ElevenLabs voice agent, with recordings and full transcripts.
      </p>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Calls", value: totalCalls, icon: <PhoneIcon size={20} /> },
          { label: "Meetings booked", value: meetingsBooked, icon: <CalendarIcon size={20} /> },
          { label: "Qualified", value: qualified, icon: <PersonIcon size={20} /> },
          { label: "Avg duration", value: formatDuration(avgDuration), icon: <ClockIcon size={20} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
            padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center",
              color: "#6b7280", flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, fontWeight: 500 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.2 }}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            style={{
              padding: "7px 12px", borderRadius: 8, border: "1px solid #d1d5db",
              fontSize: 14, background: "#fff", color: "#374151", cursor: "pointer",
            }}
          >
            <option>All outcomes</option>
            {OUTCOME_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>{filtered.length} calls</span>
        </div>
        <button
          onClick={fetchCalls}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, border: "1px solid #d1d5db",
            background: "#fff", cursor: "pointer", fontSize: 14, color: "#374151", fontWeight: 500,
          }}
        >
          <RefreshIcon size={15} />
          Refresh
        </button>
      </div>

      {/* Call list */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#9ca3af", fontSize: 15 }}>
            Loading calls…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#9ca3af", fontSize: 15 }}>
            No calls found.
          </div>
        ) : (
          filtered.map((conv, idx) => {
            const isExpanded = expandedId === conv.conversation_id;
            const outcome = resolveOutcome(conv);
            const title = getCallTitle(conv);
            const summary = conv.analysis?.transcript_summary ?? "";
            const callerPhone = conv.metadata?.phone_number as string | undefined;

            return (
              <div key={conv.conversation_id} style={{
                borderBottom: idx < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
              }}>
                {/* Row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                  cursor: "pointer",
                  background: isExpanded ? "#f9fafb" : "#fff",
                  transition: "background 0.15s",
                }}
                  onClick={() => setExpandedId(isExpanded ? null : conv.conversation_id)}
                >
                  {/* Phone icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: "#f3f4f6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#6b7280", flexShrink: 0,
                  }}>
                    <PhoneIcon size={16} />
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{title}</span>
                      <OutcomeBadge outcome={outcome} />
                      <StatusBadge status={conv.call_successful ?? conv.status ?? "success"} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                      {callerPhone && (
                        <>
                          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{callerPhone}</span>
                          <span style={{ fontSize: 12, color: "#d1d5db" }}>·</span>
                        </>
                      )}
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        {formatDateTime(conv.start_time_unix_secs)}
                      </span>
                      <span style={{ fontSize: 12, color: "#d1d5db" }}>·</span>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        {formatDuration(conv.call_duration_secs)}
                      </span>
                      {conv.message_count != null && (
                        <>
                          <span style={{ fontSize: 12, color: "#d1d5db" }}>·</span>
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>{conv.message_count} messages</span>
                        </>
                      )}
                    </div>
                    {summary && (
                      <p style={{
                        fontSize: 13, color: "#6b7280", margin: "4px 0 0",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        maxWidth: 700,
                      }}>
                        {summary}
                      </p>
                    )}
                  </div>

                  {/* Right side */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}>
                    {isAdmin && (
                      <select
                        value={conv.outcome_override ?? outcome}
                        onChange={async (e) => {
                          const val = e.target.value;
                          await fetch(`/api/voice-calls/${conv.conversation_id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ outcome: val, org_id: orgId }),
                          });
                          handleOutcomeChange(conv.conversation_id, val);
                        }}
                        style={{
                          padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db",
                          fontSize: 13, background: "#fff", color: "#374151", cursor: "pointer",
                        }}
                      >
                        {OUTCOME_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : conv.conversation_id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "5px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
                        background: "#fff", cursor: "pointer", fontSize: 13, color: "#374151",
                        fontWeight: 500, whiteSpace: "nowrap",
                      }}
                    >
                      <ChevronIcon size={14} open={isExpanded} />
                      {isExpanded ? "Hide details" : "Show details"}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <ExpandedRow
                    conv={conv}
                    orgId={orgId}
                    isAdmin={isAdmin}
                    onOutcomeChange={handleOutcomeChange}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Load more */}
      {nextCursor && !loading && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={async () => {
              const url = new URL("/api/voice-calls", window.location.origin);
              url.searchParams.set("agentId", agentId);
              url.searchParams.set("cursor", nextCursor);
              const res = await fetch(url.toString());
              const data = await res.json();
              setConversations((prev) => [...prev, ...(data.conversations ?? [])]);
              setNextCursor(data.next_cursor ?? null);
            }}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "1px solid #d1d5db",
              background: "#fff", cursor: "pointer", fontSize: 14, color: "#374151",
            }}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PhoneIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.64 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}

function CalendarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function PersonIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function ClockIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function RefreshIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  );
}

function ChevronIcon({ size, open }: { size: number; open: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
