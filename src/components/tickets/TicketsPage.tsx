"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/logActivity";
import { SkeletonList } from "@/components/ui/Skeleton";
import { formatDateEST, formatDateTimeEST } from "@/lib/datetime";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "Open" | "In Progress" | "Resolved" | "Closed";
type Priority = "Low" | "Normal" | "High" | "Urgent";

interface Ticket {
  id: string;
  org_id: string | null;
  subject: string;
  description: string | null;
  status: Status;
  priority: Priority;
  created_by: string | null;
  created_by_name: string | null;
  created_by_role: string | null;
  created_at: string;
  updated_at: string;
  comment_count?: number;
}

interface Comment {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string | null;
  author_role: string | null;
  content: string;
  created_at: string;
}

interface Props {
  orgId: string | null;
  isAdmin: boolean;
  userName: string;
  userRole: string;
  userId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<Status, { bg: string; color: string; border: string }> = {
  "Open":        { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  "In Progress": { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  "Resolved":    { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
  "Closed":      { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
};

const PRIORITY_COLORS: Record<Priority, { bg: string; color: string; border: string }> = {
  "Urgent": { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
  "High":   { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  "Normal": { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  "Low":    { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
};

function Badge({ label, scheme }: { label: string; scheme: { bg: string; color: string; border: string } }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: scheme.bg, color: scheme.color, border: `1px solid ${scheme.border}`,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function formatDate(iso: string) {
  return formatDateEST(iso);
}
function formatTime(iso: string) {
  return formatDateTimeEST(iso);
}

// ─── New Ticket Modal ─────────────────────────────────────────────────────────

function NewTicketModal({
  orgId, userName, userRole, userId,
  onClose, onCreated,
}: {
  orgId: string | null;
  userName: string;
  userRole: string;
  userId: string;
  onClose: () => void;
  onCreated: (t: Ticket) => void;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!subject.trim()) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("tickets")
      .insert({
        org_id: orgId,
        subject: subject.trim(),
        description: description.trim() || null,
        priority,
        status: "Open",
        created_by: userId,
        created_by_name: userName,
        created_by_role: userRole,
      })
      .select()
      .single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    if (data) {
      onCreated(data as Ticket);
      logActivity({ orgId, userId, userName, userRole, eventType: "Ticket created", description: `${userName} raised a ticket: "${subject.trim()}"`, targetLabel: subject.trim() });
    }
    onClose();
  }

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 520 }}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>Raise a ticket</h2>
          <button onClick={onClose} style={closeBtn}><CloseIcon /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px 24px 24px" }}>
          <div>
            <label style={fieldLabel}>Subject</label>
            <input
              autoFocus
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Describe the issue in one line"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={fieldLabel}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more detail: steps to reproduce, screenshots, etc."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={fieldLabel}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} style={inputStyle}>
              <option>Low</option>
              <option>Normal</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </div>
          {error && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={cancelBtn}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={saving || !subject.trim()}
              style={{ ...confirmBtn, opacity: saving || !subject.trim() ? 0.5 : 1 }}
            >
              {saving ? "Submitting…" : "Submit ticket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Detail Modal ──────────────────────────────────────────────────────

function TicketDetailModal({
  ticket: initialTicket,
  isAdmin,
  userName,
  userRole,
  userId,
  onClose,
  onUpdated,
}: {
  ticket: Ticket;
  isAdmin: boolean;
  userName: string;
  userRole: string;
  userId: string;
  onClose: () => void;
  onUpdated: (t: Ticket) => void;
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("ticket_comments")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setComments((data as Comment[]) ?? []);
        setLoadingComments(false);
      });
  }, [ticket.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function updateTicketField(field: "status" | "priority", value: string) {
    setSavingMeta(true);
    const supabase = createClient();
    const update =
      field === "status"
        ? { status: value as Status, updated_at: new Date().toISOString() }
        : { priority: value as Priority, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from("tickets")
      .update(update)
      .eq("id", ticket.id)
      .select()
      .single();
    setSavingMeta(false);
    if (!error && data) {
      const updated = data as Ticket;
      setTicket(updated);
      onUpdated(updated);
    }
  }

  async function postComment() {
    if (!newComment.trim()) return;
    setPosting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: ticket.id,
        author_id: userId,
        author_name: userName,
        author_role: userRole,
        content: newComment.trim(),
      })
      .select()
      .single();
    setPosting(false);
    if (!error && data) {
      setComments((prev) => [...prev, data as Comment]);
      setNewComment("");
      const supabase2 = createClient();
      supabase2.from("tickets").update({ updated_at: new Date().toISOString() }).eq("id", ticket.id);
      logActivity({ orgId: ticket.org_id, userId, userName, userRole, eventType: "Ticket replied", description: `${userName} replied on "${ticket.subject}"`, targetLabel: ticket.subject });
    }
  }

  const statusScheme = STATUS_COLORS[ticket.status] ?? STATUS_COLORS["Open"];
  const priorityScheme = PRIORITY_COLORS[ticket.priority] ?? PRIORITY_COLORS["Normal"];

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ ...modalHeader, borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ ...modalTitle, marginBottom: 6 }}>{ticket.subject}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Badge label={ticket.priority} scheme={priorityScheme} />
              <Badge label={ticket.status} scheme={statusScheme} />
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                Opened {formatDate(ticket.created_at)} · by {ticket.created_by_name ?? "Unknown"}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}><CloseIcon /></button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Description */}
          {ticket.description && (
            <div style={{
              background: "#f9fafb", border: "1px solid #e5e7eb",
              borderRadius: 8, padding: "14px 16px",
            }}>
              <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.6 }}>{ticket.description}</p>
            </div>
          )}

          {/* Status / Priority controls — admin-only dropdowns, read-only badges for clients */}
          <div style={{
            display: "flex", gap: 24, padding: "14px 16px",
            border: "1px solid #e5e7eb", borderRadius: 8, alignItems: "center", flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "#9ca3af", textTransform: "uppercase" }}>Status</span>
              {isAdmin ? (
                <select
                  value={ticket.status}
                  onChange={(e) => updateTicketField("status", e.target.value)}
                  disabled={savingMeta}
                  style={{ ...selectStyle, ...statusSelectColor(ticket.status) }}
                >
                  {(["Open", "In Progress", "Resolved", "Closed"] as Status[]).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <Badge label={ticket.status} scheme={statusScheme} />
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: "#9ca3af", textTransform: "uppercase" }}>Priority</span>
              {isAdmin ? (
                <select
                  value={ticket.priority}
                  onChange={(e) => updateTicketField("priority", e.target.value)}
                  disabled={savingMeta}
                  style={selectStyle}
                >
                  {(["Low", "Normal", "High", "Urgent"] as Priority[]).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <Badge label={ticket.priority} scheme={priorityScheme} />
              )}
            </div>
          </div>

          {/* Conversation */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 12px" }}>Conversation</p>
            {loadingComments ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading…</p>
            ) : comments.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>No messages yet. Be the first to reply.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {comments.map((c) => {
                  const isAgency = c.author_role === "admin";
                  return (
                    <div key={c.id} style={{
                      background: isAgency ? "#eff6ff" : "#ffffff",
                      border: `1px solid ${isAgency ? "#bfdbfe" : "#e5e7eb"}`,
                      borderRadius: 8, padding: "12px 14px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                            {c.author_name ?? "Unknown"}
                          </span>
                          {isAgency && (
                            <span style={{
                              fontSize: 10.5, fontWeight: 700, color: "#2563eb",
                              background: "#dbeafe", padding: "1px 6px", borderRadius: 4,
                            }}>WeLaunch</span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>{formatTime(c.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.6 }}>{c.content}</p>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>

          {/* Reply box */}
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(); }}
              placeholder="Add a comment…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", width: "100%", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={postComment}
                disabled={posting || !newComment.trim()}
                style={{ ...confirmBtn, opacity: posting || !newComment.trim() ? 0.5 : 1, display: "flex", gap: 6, alignItems: "center" }}
              >
                <SendIcon />
                Post
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button onClick={onClose} style={confirmBtn}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TicketsPage({ orgId, isAdmin, userName, userRole, userId }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All statuses");
  const [showNew, setShowNew] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const hasFetched = useRef(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("tickets")
      .select("*")
      .order("updated_at", { ascending: false });
    if (orgId) q = q.eq("org_id", orgId);
    const { data: ticketRows } = await q;
    const rows = (ticketRows ?? []) as Ticket[];

    // Fetch comment counts separately to avoid the relational-join type issue
    const ids = rows.map((r) => r.id);
    let commentCounts: Record<string, number> = {};
    if (ids.length) {
      const { data: ccData } = await supabase
        .from("ticket_comments")
        .select("ticket_id")
        .in("ticket_id", ids);
      for (const row of (ccData ?? [])) {
        const tid = (row as { ticket_id: string }).ticket_id;
        commentCounts[tid] = (commentCounts[tid] ?? 0) + 1;
      }
    }

    setTickets(rows.map((r) => ({ ...r, comment_count: commentCounts[r.id] ?? 0 })));
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchTickets();
  }, [fetchTickets]);

  const filtered = filterStatus === "All statuses"
    ? tickets
    : tickets.filter((t) => t.status === filterStatus);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Tickets</h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 0 }}>
            Raise issues, requests, and questions. Everything tracked in one place.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ ...confirmBtn, display: "flex", gap: 6, alignItems: "center" }}>
          <PlusIcon />
          Raise a ticket
        </button>
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, background: "#fff", color: "#374151", cursor: "pointer" }}
        >
          <option>All statuses</option>
          {(["Open", "In Progress", "Resolved", "Closed"] as Status[]).map((s) => <option key={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 13, color: "#9ca3af" }}>{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        {/* Column headers */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 120px 140px 120px",
          padding: "10px 20px", borderBottom: "1px solid #f3f4f6",
          background: "#f9fafb",
        }}>
          {["Subject", "Priority", "Status", "Created"].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <SkeletonList rows={7} />
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>
            {filterStatus === "All statuses" ? "No tickets yet. Raise the first one." : `No ${filterStatus} tickets.`}
          </div>
        ) : (
          filtered.map((ticket, idx) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              style={{
                display: "grid", gridTemplateColumns: "1fr 120px 140px 120px",
                padding: "14px 20px", borderBottom: idx < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
                cursor: "pointer", transition: "background 0.1s",
                alignItems: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#d1d5db" }}><TicketIcon /></span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{ticket.subject}</span>
                </div>
                {(ticket.comment_count ?? 0) > 0 && (
                  <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 22 }}>
                    {ticket.comment_count} comment{ticket.comment_count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div><Badge label={ticket.priority} scheme={PRIORITY_COLORS[ticket.priority] ?? PRIORITY_COLORS["Normal"]} /></div>
              <div><Badge label={ticket.status} scheme={STATUS_COLORS[ticket.status] ?? STATUS_COLORS["Open"]} /></div>
              <span style={{ fontSize: 13, color: "#6b7280" }}>{formatDate(ticket.created_at)}</span>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showNew && (
        <NewTicketModal
          orgId={orgId}
          userName={userName}
          userRole={userRole}
          userId={userId}
          onClose={() => setShowNew(false)}
          onCreated={(t) => setTickets((prev) => [t, ...prev])}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isAdmin={isAdmin}
          userName={userName}
          userRole={userRole}
          userId={userId}
          onClose={() => setSelectedTicket(null)}
          onUpdated={(updated) => {
            setTickets((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
            setSelectedTicket(updated);
          }}
        />
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
  animation: "fadeIn 0.15s ease",
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
  width: "100%", overflow: "hidden", animation: "modalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
};
const modalHeader: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", justifyContent: "space-between",
  padding: "20px 24px 16px", gap: 12,
};
const modalTitle: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 };
const closeBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: "none", background: "#f3f4f6",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  color: "#6b7280", flexShrink: 0,
};
const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#374151",
  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #e5e7eb", fontSize: 14, color: "#111827",
  background: "#fff", outline: "none", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 7, border: "1px solid #e5e7eb",
  fontSize: 13, color: "#111827", background: "#fff", cursor: "pointer",
};
const cancelBtn: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
  background: "#fff", color: "#6b7280", fontSize: 14, cursor: "pointer",
};
const confirmBtn: React.CSSProperties = {
  padding: "8px 18px", borderRadius: 8, border: "none",
  background: "#111827", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
};

function statusSelectColor(s: Status): React.CSSProperties {
  const map: Record<Status, string> = {
    "Open": "#2563eb", "In Progress": "#d97706", "Resolved": "#15803d", "Closed": "#6b7280",
  };
  return { color: map[s] ?? "#111827", fontWeight: 600 };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function SendIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function TicketIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 010-6h20a3 3 0 010 6"/><path d="M2 15a3 3 0 000 6h20a3 3 0 000-6"/><path d="M2 9h20M2 15h20"/></svg>;
}
