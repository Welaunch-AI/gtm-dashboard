"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  org_id: string | null;
  org_name: string | null;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  event_type: string;
  description: string;
  target_label: string | null;
  created_at: string;
}

// ─── Event type config ────────────────────────────────────────────────────────

const EVENT_TYPES = [
  "Task updated",
  "Task created",
  "File uploaded",
  "Credential viewed",
  "Content approval",
  "Comment",
  "Profile updated",
  "Ticket created",
  "Ticket replied",
  "Note logged",
  "Contact added",
  "Voice call",
] as const;

const EVENT_ICONS: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  "Task updated":      { icon: <CheckCircle />, bg: "#ecfdf5", color: "#059669" },
  "Task created":      { icon: <PencilIcon />,  bg: "#fef9c3", color: "#d97706" },
  "File uploaded":     { icon: <FileIcon />,    bg: "#ede9fe", color: "#7c3aed" },
  "Credential viewed": { icon: <KeyIcon />,     bg: "#fef3c7", color: "#d97706" },
  "Content approval":  { icon: <ThumbIcon />,   bg: "#dcfce7", color: "#16a34a" },
  "Comment":           { icon: <ChatIcon />,    bg: "#f0f9ff", color: "#0284c7" },
  "Profile updated":   { icon: <UserIcon />,    bg: "#fce7f3", color: "#db2777" },
  "Ticket created":    { icon: <TicketIcon />,  bg: "#f0fdf4", color: "#16a34a" },
  "Ticket replied":    { icon: <ChatIcon />,    bg: "#eff6ff", color: "#2563eb" },
  "Note logged":       { icon: <NoteIcon />,    bg: "#f9fafb", color: "#6b7280" },
  "Contact added":     { icon: <UserIcon />,    bg: "#fdf4ff", color: "#9333ea" },
  "Voice call":        { icon: <PhoneIcon />,   bg: "#f0fdf4", color: "#15803d" },
};

function getEventConfig(type: string) {
  return EVENT_ICONS[type] ?? { icon: <NoteIcon />, bg: "#f9fafb", color: "#6b7280" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Highlight a specific word inside a description string
function HighlightedDesc({ description }: { description: string }) {
  // Bold anything after "approved", "moved to", "uploaded", "created", "commented on",
  // "requested changes on", "marked", "viewed", "logged"
  const match = description.match(/^(.*?)\s(approved|moved to|uploaded|created|commented on|requested changes on|marked|viewed|logged|replied on|added)\s(.+)$/i);
  if (match) {
    return (
      <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
        {match[1]} <span style={{ color: "#9ca3af" }}>{match[2]}</span>{" "}
        <strong style={{ color: "#111827", fontWeight: 600 }}>{match[3]}</strong>
      </span>
    );
  }
  return <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{description}</span>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface Props {
  orgs: { id: string; name: string }[];
}

export default function ActivityLogPage({ orgs }: Props) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All event types");
  const [filterOrg, setFilterOrg] = useState("All clients");
  const [filterTypeOpen, setFilterTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setEntries((data as LogEntry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchLog();
  }, [fetchLog]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setFilterTypeOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = entries.filter((e) => {
    if (filterType !== "All event types" && e.event_type !== filterType) return false;
    if (filterOrg !== "All clients" && e.org_name !== filterOrg) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![e.user_name, e.description, e.event_type, e.org_name].some((f) => f?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Activity Log</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
          A chronological feed of everything that happens across this client&apos;s portal.
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
        padding: "14px 16px", marginBottom: 20,
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
            <SearchIcon />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity…"
            style={{
              width: "100%", padding: "7px 10px 7px 30px", borderRadius: 7,
              border: "1px solid #e5e7eb", fontSize: 13, color: "#111827",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Event type dropdown */}
        <div ref={typeRef} style={{ position: "relative" }}>
          <button
            onClick={() => setFilterTypeOpen((p) => !p)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 7, border: "1px solid #e5e7eb",
              background: filterType !== "All event types" ? "#f9fafb" : "#fff",
              fontSize: 13, color: "#374151", cursor: "pointer",
              fontWeight: filterType !== "All event types" ? 600 : 400,
            }}
          >
            {filterType}
            <ChevDown />
          </button>
          {filterTypeOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)", minWidth: 200, padding: "4px 0",
            }}>
              {["All event types", ...EVENT_TYPES].map((t) => (
                <button
                  key={t}
                  onClick={() => { setFilterType(t); setFilterTypeOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", textAlign: "left", padding: "7px 14px",
                    border: "none", background: filterType === t ? "#f3f4f6" : "none",
                    fontSize: 13, color: "#374151", cursor: "pointer",
                    fontWeight: filterType === t ? 600 : 400,
                  }}
                >
                  {t}
                  {filterType === t && <span style={{ color: "#111827" }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Client filter */}
        <select
          value={filterOrg}
          onChange={(e) => setFilterOrg(e.target.value)}
          style={{
            padding: "7px 12px", borderRadius: 7, border: "1px solid #e5e7eb",
            fontSize: 13, color: "#374151", background: "#fff", cursor: "pointer",
          }}
        >
          <option>All clients</option>
          {orgs.map((o) => <option key={o.id}>{o.name}</option>)}
        </select>

        <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: 4 }}>
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Feed */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>Loading activity…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: "center" }}>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 4px" }}>No activity found.</p>
            <p style={{ color: "#d1d5db", fontSize: 13, margin: 0 }}>
              Actions across tasks, tickets, content, and credentials will appear here automatically.
            </p>
          </div>
        ) : (
          filtered.map((entry, idx) => {
            const cfg = getEventConfig(entry.event_type);
            const isAgency = entry.user_role === "admin";
            return (
              <div key={entry.id} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 20px",
                borderBottom: idx < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
              }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: cfg.bg, color: cfg.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: 1,
                }}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      {entry.user_name ?? "Unknown"}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: isAgency ? "#2563eb" : "#6b7280",
                      background: isAgency ? "#dbeafe" : "#f3f4f6",
                      padding: "1px 6px", borderRadius: 4,
                    }}>
                      {isAgency ? "WeLaunch" : "Client"}
                    </span>
                    <HighlightedDesc description={entry.description} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{entry.event_type}</span>
                    <span style={{ fontSize: 11, color: "#d1d5db" }}>·</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtTime(entry.created_at)}</span>
                    {entry.org_name && (
                      <>
                        <span style={{ fontSize: 11, color: "#d1d5db" }}>·</span>
                        <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{entry.org_name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Time ago */}
                <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0, marginTop: 3 }}>
                  {timeAgo(entry.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function ChevDown() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>; }
function CheckCircle() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>; }
function PencilIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function FileIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function KeyIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>; }
function ThumbIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>; }
function ChatIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function UserIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function TicketIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0-6h20a3 3 0 0 1 0 6"/><path d="M2 15a3 3 0 0 0 0 6h20a3 3 0 0 0 0-6"/><path d="M2 9h20M2 15h20"/></svg>; }
function NoteIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>; }
function PhoneIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.64 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
