"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import {
  addDaysYmd,
  formatShortDateEST,
  formatTimeEST,
  formatWeekdayDateEST,
  getZonedDateParts,
  startOfWeekYmdEST,
  todayYmdEST,
} from "@/lib/datetime";

// ── Types ─────────────────────────────────────────────────────────────────────

type Platform = string;
type PostStatus = "pending" | "approved" | "changes_requested";

type CalPost = {
  id: string;
  org_id: string | null;
  title: string;
  caption: string | null;
  platform: Platform;
  persona: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: PostStatus;
  created_by: string | null;
  created_at: string;
};

type Feedback = {
  id: string;
  post_id: string;
  author: string;
  content: string;
  created_at: string;
};

type PostMedia = {
  id: string;
  post_id: string;
  url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
};

type CalAsset = {
  id: string;
  url: string;
  file_name: string | null;
  file_type: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_PLATFORMS: Platform[] = ["LinkedIn", "Instagram", "X", "TikTok", "Facebook", "YouTube"];

const PLATFORM_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  LinkedIn:  { dot: "#0077b5", bg: "#dbeafe", text: "#1d4ed8" },
  Instagram: { dot: "#e1306c", bg: "#fce7f3", text: "#be185d" },
  X:         { dot: "#000000", bg: "#f3f4f6", text: "#111827" },
  TikTok:    { dot: "#111827", bg: "#f3f4f6", text: "#111827" },
  Facebook:  { dot: "#1877f2", bg: "#dbeafe", text: "#1d4ed8" },
  YouTube:   { dot: "#ff0000", bg: "#fee2e2", text: "#b91c1c" },
};

const FALLBACK_PLATFORM_COLOR = { dot: "#6b7280", bg: "#f3f4f6", text: "#374151" };

function getPlatformColor(platform: string) {
  return PLATFORM_COLORS[platform] ?? FALLBACK_PLATFORM_COLOR;
}

const STATUS_STYLE: Record<PostStatus, { bg: string; color: string; label: string }> = {
  pending:           { bg: "#f3f4f6",  color: "#6b7280", label: "Pending" },
  approved:          { bg: "#d1fae5",  color: "#065f46", label: "Approved" },
  changes_requested: { bg: "#fee2e2",  color: "#b91c1c", label: "Changes Requested" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  let d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon-based
}
function fmtDate(d: string) {
  return formatWeekdayDateEST(d);
}
function fmtTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["MON","TUE","WED","THU","FRI","SAT","SUN"];

// ── PDF Import types (mirror route types) ────────────────────────────────────

type ExtractedPost = {
  title: string;
  caption: string | null;
  platform: string;
  persona: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
};

type FlaggedPost = {
  extracted: ExtractedPost;
  matchedExisting: { id: string; title: string; scheduled_date: string };
};

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ children, onClose, width = 560 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...S.modal, maxWidth: width }}>{children}</div>
    </div>
  );
}

function PdfImportModal({
  orgId,
  authorName,
  onClose,
  onImported,
}: {
  orgId: string | null;
  authorName: string;
  onClose: () => void;
  onImported: (created: CalPost[], flagged: FlaggedPost[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      if (orgId) form.append("orgId", orgId);
      form.append("authorName", authorName);

      const res = await fetch("/api/marketing/import-pdf", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Import failed.");
        return;
      }
      onImported(json.created ?? [], json.flagged ?? []);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} width={460}>
      <div style={S.modalHeader}>
        <h2 style={S.modalTitle}>Import posts from PDF</h2>
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>
      <div style={S.modalBody}>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Upload a PDF containing your content schedule. Posts will be extracted automatically and added to the calendar. Assets can be attached to each post afterwards.
        </p>
        <div
          style={{
            border: "2px dashed #e5e7eb", borderRadius: 10, padding: "28px 20px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            background: file ? "#f0fdf4" : "#fafafa", cursor: "pointer",
            transition: "all 0.15s",
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const dropped = e.dataTransfer.files[0];
            if (dropped?.type === "application/pdf") setFile(dropped);
          }}
        >
          <UploadIcon />
          {file ? (
            <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>{file.name}</span>
          ) : (
            <>
              <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>Click to choose a PDF, or drag &amp; drop</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Only .pdf files are supported</span>
            </>
          )}
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: "none" }}
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        {error && <p style={{ fontSize: 12.5, color: "#dc2626", margin: 0 }}>{error}</p>}
      </div>
      <div style={S.modalFooter}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={handleImport} disabled={!file || loading} style={{ ...S.primaryBtn, opacity: (!file || loading) ? 0.6 : 1 }}>
          {loading ? "Importing…" : "Import"}
        </button>
      </div>
    </Modal>
  );
}

function FlaggedReviewPanel({
  flagged,
  orgId,
  authorName,
  onCreateAnyway,
  onDiscard,
  onClose,
}: {
  flagged: FlaggedPost[];
  orgId: string | null;
  authorName: string;
  onCreateAnyway: (post: CalPost) => void;
  onDiscard: (idx: number) => void;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState<number | null>(null);
  const sb = createClient();

  async function handleCreateAnyway(item: FlaggedPost, idx: number) {
    setCreating(idx);
    try {
      const { data } = await sb.from("cal_posts").insert({
        org_id: orgId ?? null,
        title: item.extracted.title,
        caption: item.extracted.caption ?? null,
        platform: item.extracted.platform ?? "LinkedIn",
        persona: item.extracted.persona ?? null,
        scheduled_date: item.extracted.scheduled_date,
        scheduled_time: item.extracted.scheduled_time ?? null,
        status: "pending",
        created_by: authorName,
      }).select("*").single();
      if (data) onCreateAnyway(data as CalPost);
      onDiscard(idx);
    } finally {
      setCreating(null);
    }
  }

  return (
    <Modal onClose={onClose} width={580}>
      <div style={S.modalHeader}>
        <h2 style={S.modalTitle}>Possible duplicates — review required</h2>
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>
      <div style={{ ...S.modalBody, gap: 10 }}>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          These posts were not auto-created because a post with a very similar title already exists on the same date. Review each one and decide.
        </p>
        {flagged.map((item, idx) => (
          <div key={idx} style={{
            border: "1px solid #fde68a", borderRadius: 10, padding: "14px 16px",
            background: "#fffbeb", display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "#111827", margin: 0 }}>{item.extracted.title}</p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "3px 0 0" }}>
                  {item.extracted.platform} · {item.extracted.scheduled_date}{item.extracted.scheduled_time ? ` at ${item.extracted.scheduled_time}` : ""}
                </p>
              </div>
            </div>
            <div style={{ background: "#fef9c3", borderRadius: 6, padding: "8px 10px" }}>
              <p style={{ fontSize: 11.5, color: "#78350f", fontWeight: 600, margin: "0 0 2px" }}>Matches existing post:</p>
              <p style={{ fontSize: 12, color: "#92400e", margin: 0 }}>{item.matchedExisting.title} ({item.matchedExisting.scheduled_date})</p>
            </div>
            {item.extracted.caption && (
              <p style={{ fontSize: 12, color: "#374151", margin: 0, borderTop: "1px solid #fde68a", paddingTop: 8 }}>
                {item.extracted.caption.slice(0, 200)}{item.extracted.caption.length > 200 ? "…" : ""}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => onDiscard(idx)} style={S.cancelBtn}>Discard</button>
              <button
                onClick={() => handleCreateAnyway(item, idx)}
                disabled={creating === idx}
                style={{ ...S.primaryBtn, fontSize: 12.5 }}
              >
                {creating === idx ? "Creating…" : "Create anyway"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div style={S.modalFooter}>
        <button onClick={onClose} style={S.primaryBtn}>Done</button>
      </div>
    </Modal>
  );
}

function PlatformActionModal({
  mode,
  platforms,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: {
  mode: "create" | "edit" | "delete";
  platforms: string[];
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (from: string, to: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(platforms[0] ?? "");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    try {
      setSaving(true);
      setError("");
      if (mode === "create") {
        if (!name.trim()) throw new Error("Platform name is required.");
        await onCreate(name.trim());
      } else if (mode === "edit") {
        if (!selected) throw new Error("Select a platform to edit.");
        if (!newName.trim()) throw new Error("New platform name is required.");
        await onRename(selected, newName.trim());
      } else {
        if (!selected) throw new Error("Select a platform to delete.");
        await onDelete(selected);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "create" ? "Create platform" : mode === "edit" ? "Edit platform" : "Delete platform";
  const actionLabel = mode === "create" ? "Create" : mode === "edit" ? "Save" : "Delete";

  return (
    <Modal onClose={onClose} width={440}>
      <div style={S.modalHeader}>
        <h2 style={S.modalTitle}>{title}</h2>
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>
      <div style={S.modalBody}>
        {mode === "create" && (
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Platform name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Threads" style={S.input} />
          </div>
        )}

        {(mode === "edit" || mode === "delete") && (
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Select platform</span>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} style={S.select}>
              {platforms.length === 0 ? <option value="">No platforms</option> : platforms.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        )}

        {mode === "edit" && (
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>New name</span>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Enter new platform name" style={S.input} />
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: "#dc2626" }}>{error}</p>}
      </div>
      <div style={S.modalFooter}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={mode === "delete" ? S.deleteBtn : S.primaryBtn}
        >
          {saving ? "Saving…" : actionLabel}
        </button>
      </div>
    </Modal>
  );
}

// ── Post Media Panel ──────────────────────────────────────────────────────────

const VIDEO_MAX_BYTES = 10 * 1024 * 1024;  // 10 MB
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function PostMediaPanel({ postId, isAdmin }: { postId: string; isAdmin: boolean }) {
  const [media, setMedia] = useState<PostMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  useEffect(() => {
    createClient().from("cal_post_media").select("*").eq("post_id", postId).order("created_at")
      .then(({ data }) => setMedia((data ?? []) as PostMedia[]));
  }, [postId]);

  async function uploadFiles(files: FileList) {
    setError("");
    setUploading(true);
    const sb = createClient();
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      const maxBytes = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
      if (file.size > maxBytes) {
        setError(`"${file.name}" exceeds ${isVideo ? "10 MB video" : "5 MB image"} limit, skipped.`);
        continue;
      }
      const path = `posts/${postId}/${Date.now()}_${file.name}`;
      const { data: up, error: upErr } = await sb.storage.from("cal-media").upload(path, file);
      if (upErr) { setError(upErr.message); continue; }
      const { data: { publicUrl } } = sb.storage.from("cal-media").getPublicUrl(up.path);
      const { data: row } = await sb.from("cal_post_media").insert({
        post_id: postId, url: publicUrl,
        file_name: file.name, file_type: file.type, file_size: file.size,
      }).select().single();
      if (row) setMedia(p => [...p, row as PostMedia]);
    }
    setUploading(false);
  }

  async function deleteMedia(m: PostMedia) {
    if (!(await confirm({
      title: "Delete media",
      message: `Delete "${m.file_name ?? "this file"}"? This cannot be undone.`,
      destructive: true,
    }))) return;
    // Extract storage path from public URL
    const url = new URL(m.url);
    const storagePath = url.pathname.split("/object/public/cal-media/")[1];
    if (storagePath) await createClient().storage.from("cal-media").remove([storagePath]);
    await createClient().from("cal_post_media").delete().eq("id", m.id);
    setMedia(p => p.filter(x => x.id !== m.id));
  }

  const isVideo = (m: PostMedia) => (m.file_type ?? "").startsWith("video/");
  const isImg   = (m: PostMedia) => (m.file_type ?? "").startsWith("image/");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Media</p>
        {isAdmin && (
          <button onClick={() => fileRef.current?.click()} style={{ ...S.outlineBtn, fontSize: 12, padding: "5px 12px" }} disabled={uploading}>
            <UploadSmIcon /> {uploading ? "Uploading…" : "Add media"}
          </button>
        )}
        <input
          ref={fileRef} type="file" multiple
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
          style={{ display: "none" }}
          onChange={e => { if (e.target.files?.length) { uploadFiles(e.target.files); e.target.value = ""; } }}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 8 }}>{error}</p>}
      {media.length === 0 && !uploading && (
        <div style={{ padding: "20px", border: "2px dashed #e5e7eb", borderRadius: 8, textAlign: "center" }}>
          <p style={{ fontSize: 12.5, color: "#9ca3af" }}>No media attached. {isAdmin ? "Click \u201cAdd media\u201d to upload images or videos." : ""}</p>
          <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 4 }}>Images up to 5 MB · Videos up to 10 MB (MP4, MOV, WebM)</p>
        </div>
      )}
      {media.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {media.map(m => (
            <div key={m.id} style={S.mediaCard}>
              {/* Thumbnail */}
              {isImg(m) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.file_name ?? ""} style={{ width: "100%", height: 90, objectFit: "cover", display: "block", borderRadius: "8px 8px 0 0" }} />
              ) : isVideo(m) ? (
                <video src={m.url} style={{ width: "100%", height: 90, objectFit: "cover", display: "block", borderRadius: "8px 8px 0 0" }} muted playsInline />
              ) : (
                <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", borderRadius: "8px 8px 0 0" }}>
                  <FileIcon />
                </div>
              )}
              {/* Footer */}
              <div style={{ padding: "6px 8px" }}>
                <p style={{ fontSize: 11, color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.file_name ?? "File"}</p>
                {m.file_size && <p style={{ fontSize: 10, color: "#9ca3af" }}>{fmtBytes(m.file_size)}</p>}
                <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                  <a href={m.url} download={m.file_name ?? undefined} target="_blank" rel="noopener noreferrer" style={{ ...S.mediaActionBtn, color: "#374151" }} title="Download">
                    <DownloadIcon />
                  </a>
                  {isAdmin && (
                    <button onClick={() => deleteMedia(m)} style={{ ...S.mediaActionBtn, color: "#dc2626" }} title="Delete">
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Post Detail Modal ─────────────────────────────────────────────────────────

function PostDetailModal({ post, isAdmin, authorName, platforms, onClose, onUpdated, onDeleted }: {
  post: CalPost; isAdmin: boolean; authorName: string; platforms: string[];
  onClose: () => void; onUpdated: (p: CalPost) => void; onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption ?? "");
  const [platform, setPlatform] = useState(post.platform);
  const [date, setDate] = useState(post.scheduled_date);
  const [status, setStatus] = useState(post.status);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [fbText, setFbText] = useState("");
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    if (platforms.length > 0 && !platforms.includes(platform)) {
      setPlatform(platforms[0]);
    }
  }, [platforms, platform]);

  useEffect(() => {
    createClient().from("cal_post_feedback").select("*").eq("post_id", post.id).order("created_at").then(({ data }) => setFeedback((data ?? []) as Feedback[]));
  }, [post.id]);

  async function save(patch: Partial<CalPost>) {
    setSaving(true);
    const sb = createClient();
    const { data } = await sb.from("cal_posts").update(patch).eq("id", post.id).select().single();
    setSaving(false);
    if (data) onUpdated(data as CalPost);
  }

  async function setApproval(s: PostStatus) {
    setStatus(s);
    await save({ status: s });
  }

  async function postFeedback() {
    if (!fbText.trim()) return;
    const sb = createClient();
    const { data } = await sb.from("cal_post_feedback").insert({ post_id: post.id, author: authorName, content: fbText.trim() }).select().single();
    if (data) setFeedback(p => [...p, data as Feedback]);
    setFbText("");
  }

  async function handleDelete() {
    if (!(await confirm({
      title: "Delete post",
      message: "Delete this post? This cannot be undone.",
      confirmLabel: "Delete post",
      destructive: true,
    }))) return;
    await createClient().from("cal_posts").delete().eq("id", post.id);
    onDeleted(post.id);
    onClose();
  }

  const pc = getPlatformColor(platform);
  const ss = STATUS_STYLE[status];

  return (
    <Modal onClose={onClose} width={600}>
      <div style={S.modalHeader}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => title !== post.title && save({ title })}
          style={{ ...S.input, fontWeight: 700, fontSize: 17, border: "none", padding: 0, background: "transparent", flex: 1, outline: "none" }}
        />
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>

      {/* Meta row */}
      <div style={{ padding: "10px 24px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: "1px solid #f3f4f6" }}>
        <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: ss.bg, color: ss.color }}>{ss.label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: pc.bg, color: pc.text }}>{platform}</span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>📅 {fmtDate(post.scheduled_date)} · {fmtTime(post.scheduled_time)}</span>
        {post.created_by && <span style={{ fontSize: 12, color: "#6b7280" }}>· {post.created_by}</span>}
      </div>

      <div style={{ ...S.modalBody, gap: 18 }}>
        {/* Caption */}
        <div style={S.fieldGroup}>
          <span style={S.fieldLabel}>Caption</span>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            onBlur={() => caption !== (post.caption ?? "") && save({ caption: caption || null })}
            style={{ ...S.input, minHeight: 100, resize: "vertical" }}
            placeholder="Write the caption…"
            readOnly={!isAdmin}
          />
        </div>

        {/* Platform + Date row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Platform</span>
            <select value={platform} onChange={e => { setPlatform(e.target.value as Platform); save({ platform: e.target.value as Platform }); }} style={S.select} disabled={!isAdmin}>
              {platforms.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Scheduled for</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} onBlur={() => date !== post.scheduled_date && save({ scheduled_date: date })} style={S.input} readOnly={!isAdmin} />
          </div>
        </div>

        {/* Approval buttons */}
        <div style={S.approvalBox}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: 12 }}>Approval</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setApproval("approved")} style={{ ...S.approvalBtn, borderColor: "#16a34a", color: status === "approved" ? "#fff" : "#16a34a", background: status === "approved" ? "#16a34a" : "transparent" }}>
              ✓ Approve
            </button>
            <button onClick={() => setApproval("changes_requested")} style={{ ...S.approvalBtn, borderColor: "#dc2626", color: status === "changes_requested" ? "#fff" : "#dc2626", background: status === "changes_requested" ? "#dc2626" : "transparent" }}>
              ✗ Request changes
            </button>
            <button onClick={() => setApproval("pending")} style={{ ...S.approvalBtn, borderColor: "#d1d5db", color: status === "pending" ? "#fff" : "#6b7280", background: status === "pending" ? "#6b7280" : "transparent" }}>
              Mark pending
            </button>
          </div>
        </div>

        {/* Media */}
        <PostMediaPanel postId={post.id} isAdmin={isAdmin} />

        {/* Feedback */}
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 10 }}>Feedback</p>
          {feedback.length === 0 && <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>No feedback yet.</p>}
          {feedback.map(fb => (
            <div key={fb.id} style={S.feedbackItem}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{fb.author}</span>
                <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{formatShortDateEST(fb.created_at)}, {formatTimeEST(fb.created_at)}</span>
              </div>
              <p style={{ fontSize: 13, color: "#374151" }}>{fb.content}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <textarea value={fbText} onChange={e => setFbText(e.target.value)} placeholder="Leave feedback…" style={{ ...S.input, flex: 1, minHeight: 60, resize: "vertical" }} onKeyDown={e => { if (e.key === "Enter" && e.metaKey) postFeedback(); }} />
            <button onClick={postFeedback} style={{ ...S.primaryBtn, alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 6 }}>
              <SendIcon /> Post
            </button>
          </div>
        </div>
        {saving && <p style={{ fontSize: 12, color: "#9ca3af" }}>Saving…</p>}
      </div>

      <div style={{ ...S.modalFooter, justifyContent: "space-between" }}>
        {isAdmin && <button onClick={handleDelete} style={S.deleteBtn}><TrashIcon /> Delete post</button>}
        <button onClick={onClose} style={S.primaryBtn}>Close</button>
      </div>
    </Modal>
  );
}

// ── New Post Modal ─────────────────────────────────────────────────────────────

function NewPostModal({ orgId, authorName, defaultDate, platforms, onClose, onCreated }: {
  orgId: string | null; authorName: string; defaultDate: string; platforms: string[];
  onClose: () => void; onCreated: (p: CalPost) => void;
}) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState<Platform>(platforms[0] ?? "LinkedIn");
  const [persona, setPersona] = useState("Company (all)");
  const [date, setDate] = useState(defaultDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // After creation, show media upload step
  const [createdPost, setCreatedPost] = useState<CalPost | null>(null);

  useEffect(() => {
    if (platforms.length > 0 && !platforms.includes(platform)) {
      setPlatform(platforms[0]);
    }
  }, [platforms, platform]);

  async function handleCreate() {
    if (!title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    const sb = createClient();
    const { data, error: err } = await sb.from("cal_posts").insert({
      org_id: orgId, title: title.trim(), caption: caption.trim() || null,
      platform, persona, scheduled_date: date, created_by: authorName,
    }).select().single();
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data) {
      onCreated(data as CalPost);
      setCreatedPost(data as CalPost);
    }
  }

  // Step 2: media upload after post created
  if (createdPost) {
    return (
      <Modal onClose={onClose} width={560}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>Add media to post</h2>
          <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
        </div>
        <div style={S.modalBody}>
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            Post <strong>"{createdPost.title}"</strong> created. Attach images or videos now, or skip.
          </p>
          <PostMediaPanel postId={createdPost.id} isAdmin={true} />
        </div>
        <div style={S.modalFooter}>
          <button onClick={onClose} style={S.primaryBtn}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div style={S.modalHeader}>
        <h2 style={S.modalTitle}>New calendar entry</h2>
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>
      <div style={S.modalBody}>
        <div style={S.fieldGroup}>
          <span style={S.fieldLabel}>Title</span>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title" style={S.input} onKeyDown={e => e.key === "Enter" && handleCreate()} />
        </div>
        <div style={S.fieldGroup}>
          <span style={S.fieldLabel}>Caption</span>
          <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write the caption or brief…" style={{ ...S.input, minHeight: 90, resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Persona</span>
            <input value={persona} onChange={e => setPersona(e.target.value)} style={S.input} placeholder="Company (all)" />
          </div>
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Platform</span>
            <select value={platform} onChange={e => setPlatform(e.target.value as Platform)} style={S.select}>
              {platforms.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={S.fieldGroup}>
          <span style={S.fieldLabel}>Scheduled for</span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} />
        </div>
        {error && <p style={{ color: "#dc2626", fontSize: 12 }}>{error}</p>}
      </div>
      <div style={S.modalFooter}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={handleCreate} disabled={loading} style={S.primaryBtn}>
          {loading ? "Creating…" : "Create entry"}
        </button>
      </div>
    </Modal>
  );
}

// ── Asset Drop ────────────────────────────────────────────────────────────────

function AssetDrop({ orgId, isAdmin }: { orgId: string | null; isAdmin: boolean }) {
  const [assets, setAssets] = useState<CalAsset[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sb = createClient();
    let q = sb.from("cal_assets").select("*").order("created_at", { ascending: false });
    if (orgId) q = q.eq("org_id", orgId); else q = q.is("org_id", null);
    q.then(({ data }) => setAssets((data ?? []) as CalAsset[]));
  }, [orgId]);

  async function uploadFiles(files: FileList) {
    setUploading(true);
    const sb = createClient();
    for (const file of Array.from(files)) {
      const path = `${orgId ?? "admin"}/${Date.now()}_${file.name}`;
      const { data: up, error } = await sb.storage.from("cal-media").upload(path, file);
      if (error) continue;
      const { data: { publicUrl } } = sb.storage.from("cal-media").getPublicUrl(up.path);
      const { data: asset } = await sb.from("cal_assets").insert({ org_id: orgId, url: publicUrl, file_name: file.name, file_type: file.type }).select().single();
      if (asset) setAssets(p => [asset as CalAsset, ...p]);
    }
    setUploading(false);
  }

  async function deleteAsset(id: string) {
    await createClient().from("cal_assets").delete().eq("id", id);
    setAssets(p => p.filter(a => a.id !== id));
  }

  const isImage = (a: CalAsset) => /image/.test(a.file_type ?? "") || /\.(png|jpg|jpeg|gif|webp)$/i.test(a.file_name ?? "");

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Asset Drop</h2>
      <p style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 14 }}>A shared folder for backups, raw footage, and undecided assets. Not tied to a calendar date.</p>

      {isAdmin && (
        <div
          style={{ ...S.dropZone, ...(dragOver ? S.dropZoneActive : {}) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
        >
          <UploadIcon />
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{uploading ? "Uploading…" : "Drop files here to upload"}</p>
          <p style={{ fontSize: 11.5, color: "#9ca3af" }}>Images, video, documents</p>
          <button onClick={() => fileRef.current?.click()} style={{ ...S.outlineBtn, marginTop: 10 }} disabled={uploading}>
            <PlusIcon /> Choose files
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.length) { uploadFiles(e.target.files); e.target.value = ""; } }} />
        </div>
      )}

      {assets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 14 }}>
          {assets.map(a => (
            <div key={a.id} style={S.assetCard}>
              {isImage(a) ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.file_name ?? ""} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: "8px 8px 0 0" }} />
                </a>
              ) : (
                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 90, background: "#f3f4f6", borderRadius: "8px 8px 0 0" }}>
                  <FileIcon />
                </a>
              )}
              <div style={{ padding: "6px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{a.file_name ?? "File"}</span>
                {isAdmin && <button onClick={() => deleteAsset(a.id)} style={{ ...S.iconBtn, flexShrink: 0 }}><TrashIcon /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Day Posts Modal (shows all posts for a given date) ────────────────────────

function DayPostsModal({ date, posts, onClose, onPostClick, isAdmin, onNewPost }: {
  date: string; posts: CalPost[];
  onClose: () => void; onPostClick: (p: CalPost) => void;
  isAdmin: boolean; onNewPost: () => void;
}) {
  return (
    <Modal onClose={onClose} width={480}>
      <div style={S.modalHeader}>
        <h2 style={S.modalTitle}>{fmtDate(date)}</h2>
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>
      <div style={{ ...S.modalBody, gap: 10 }}>
        {posts.length === 0 && <p style={{ fontSize: 13, color: "#9ca3af" }}>No posts scheduled for this day.</p>}
        {posts.map(p => {
          const pc = getPlatformColor(p.platform);
          const ss = STATUS_STYLE[p.status];
          return (
            <div
              key={p.id}
              onClick={() => { onPostClick(p); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderRadius: 10, border: "1px solid #e5e7eb", cursor: "pointer",
                background: "#fff", transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: pc.dot, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</p>
                {p.scheduled_time && <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "2px 0 0" }}>{fmtTime(p.scheduled_time)}</p>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: pc.bg, color: pc.text, flexShrink: 0 }}>{p.platform}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: ss.bg, color: ss.color, flexShrink: 0 }}>{ss.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ ...S.modalFooter, justifyContent: "space-between" }}>
        {isAdmin && <button onClick={() => { onNewPost(); onClose(); }} style={S.primaryBtn}><PlusIcon /> New post</button>}
        <button onClick={onClose} style={S.cancelBtn}>Close</button>
      </div>
    </Modal>
  );
}

// ── Month Grid View ───────────────────────────────────────────────────────────

function MonthGrid({ year, month, posts, isAdmin, windowWidth, onDayClick, onPostClick }: {
  year: number; month: number; posts: CalPost[]; isAdmin: boolean; windowWidth: number;
  onDayClick: (date: string) => void; onPostClick: (p: CalPost) => void;
}) {
  const todayStr = todayYmdEST();
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const [overflowDate, setOverflowDate] = useState<string | null>(null);

  const isSmall = windowWidth < 1400;
  const isVerySmall = windowWidth < 1100;

  const cells: { dateStr: string | null; day: number; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ dateStr: null, day: prevMonthDays - firstDay + 1 + i, isCurrentMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ dateStr, day: d, isCurrentMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ dateStr: null, day: cells.length - daysInMonth - firstDay + 1, isCurrentMonth: false });

  const postsByDate: Record<string, CalPost[]> = {};
  posts.forEach(p => { (postsByDate[p.scheduled_date] ??= []).push(p); });

  // Show fewer chips on small screens to avoid overflow
  const CHIP_LIMIT = isVerySmall ? 1 : isSmall ? 2 : 3;

  const cellStyle: React.CSSProperties = {
    ...S.calCell,
    minHeight: isVerySmall ? 70 : isSmall ? 90 : 120,
    padding: isSmall ? "5px 4px 4px" : "8px 8px 6px",
  };
  const dayHeaderStyle: React.CSSProperties = {
    ...S.calDayHeader,
    fontSize: isSmall ? 9 : 11,
    padding: isSmall ? "6px 4px" : "8px 10px",
  };
  const chipStyle: React.CSSProperties = {
    ...S.calPostChip,
    padding: isSmall ? "2px 3px" : "3px 5px",
  };
  const chipTitleStyle: React.CSSProperties = {
    ...S.calChipTitle,
    fontSize: isSmall ? 9.5 : 10.5,
  };
  // On very small screens, hide the platform badge to save space
  const showBadge = !isVerySmall;

  return (
    <>
      {/* Horizontal scroll wrapper so the grid never collapses below min readable width */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ ...S.calGrid, minWidth: isSmall ? 680 : "100%" }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={dayHeaderStyle}>{isVerySmall ? d.slice(0, 1) : d}</div>
          ))}
          {cells.map((cell, i) => {
            const dayPosts = cell.dateStr ? (postsByDate[cell.dateStr] ?? []) : [];
            const isToday = cell.dateStr === todayStr;
            const overflow = dayPosts.length - CHIP_LIMIT;
            return (
              <div
                key={i}
                style={{ ...cellStyle, ...(cell.isCurrentMonth ? {} : S.calCellGray), cursor: cell.isCurrentMonth ? "pointer" : "default" }}
                onClick={() => {
                  if (!cell.dateStr || !cell.isCurrentMonth) return;
                  if (dayPosts.length > 0) setOverflowDate(cell.dateStr);
                  else if (isAdmin) onDayClick(cell.dateStr);
                }}
              >
                <span style={{ ...S.calDayNum, fontSize: isSmall ? 11 : 12.5, width: isSmall ? 20 : 24, height: isSmall ? 20 : 24, ...(isToday ? S.calDayToday : {}) }}>{cell.day}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: isSmall ? 2 : 3 }}>
                  {dayPosts.slice(0, CHIP_LIMIT).map(p => {
                    const pc = getPlatformColor(p.platform);
                    return (
                      <div
                        key={p.id}
                        style={chipStyle}
                        onClick={e => { e.stopPropagation(); onPostClick(p); }}
                      >
                        <span style={{ ...S.calDot, background: pc.dot }} />
                        <span style={chipTitleStyle}>{p.title}</span>
                        {showBadge && <span style={{ ...S.calChipPlatform, background: pc.bg, color: pc.text, fontSize: isSmall ? 8.5 : 9.5 }}>{p.platform}</span>}
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <button
                      style={{ fontSize: isSmall ? 9.5 : 10.5, color: "#6366f1", fontWeight: 600, paddingLeft: 2, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                      onClick={e => { e.stopPropagation(); setOverflowDate(cell.dateStr!); }}
                    >
                      +{overflow} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {overflowDate && (
        <DayPostsModal
          date={overflowDate}
          posts={postsByDate[overflowDate] ?? []}
          isAdmin={isAdmin}
          onClose={() => setOverflowDate(null)}
          onPostClick={onPostClick}
          onNewPost={() => onDayClick(overflowDate)}
        />
      )}
    </>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────

function WeekGrid({ posts, isAdmin, windowWidth, onDayClick, onPostClick }: {
  year: number; month: number; posts: CalPost[]; isAdmin: boolean; windowWidth: number;
  onDayClick: (date: string) => void; onPostClick: (p: CalPost) => void;
}) {
  const todayStr = todayYmdEST();
  const weekStart = startOfWeekYmdEST();
  const [overflowDate, setOverflowDate] = useState<string | null>(null);

  const isSmall = windowWidth < 1400;

  const days = Array.from({ length: 7 }, (_, i) => {
    const dateStr = addDaysYmd(weekStart, i);
    return { dateStr, label: DAY_NAMES[i], dayNum: Number(dateStr.split("-")[2]) };
  });

  const postsByDate: Record<string, CalPost[]> = {};
  posts.forEach(p => { (postsByDate[p.scheduled_date] ??= []).push(p); });

  const WEEK_CHIP_LIMIT = 4;

  return (
    <>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(120px,1fr))", width: "100%", minWidth: isSmall ? 700 : "100%", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        {days.map(({ dateStr, label, dayNum }) => {
          const dayPosts = postsByDate[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const overflow = dayPosts.length - WEEK_CHIP_LIMIT;
          return (
            <div
              key={dateStr}
              style={{ borderRight: "1px solid #f3f4f6", minHeight: isSmall ? 160 : 220, padding: isSmall ? "6px 5px" : "10px 8px", background: "#fff", display: "flex", flexDirection: "column", gap: 0 }}
            >
              {/* Day header */}
              <div
                style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 8, cursor: isAdmin ? "pointer" : "default" }}
                onClick={() => isAdmin && onDayClick(dateStr)}
              >
                <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 3 }}>{label}</span>
                <span style={{ ...S.calDayNum, ...(isToday ? S.calDayToday : {}) }}>{dayNum}</span>
              </div>
              {/* Posts */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
                {dayPosts.slice(0, WEEK_CHIP_LIMIT).map(p => {
                  const pc = getPlatformColor(p.platform);
                  return (
                    <div
                      key={p.id}
                      style={{ ...S.calPostChip, flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "5px 6px" }}
                      onClick={e => { e.stopPropagation(); onPostClick(p); }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
                        <span style={{ ...S.calDot, background: pc.dot }} />
                        <span style={{ ...S.calChipTitle, maxWidth: "none", flex: 1 }}>{p.title}</span>
                      </div>
                      <span style={{ ...S.calChipPlatform, background: pc.bg, color: pc.text }}>{p.platform}</span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <button
                    style={{ fontSize: 10.5, color: "#6366f1", fontWeight: 600, paddingLeft: 4, background: "none", border: "none", cursor: "pointer", textAlign: "left", marginTop: 2 }}
                    onClick={() => setOverflowDate(dateStr)}
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>

      {overflowDate && (
        <DayPostsModal
          date={overflowDate}
          posts={postsByDate[overflowDate] ?? []}
          isAdmin={isAdmin}
          onClose={() => setOverflowDate(null)}
          onPostClick={onPostClick}
          onNewPost={() => onDayClick(overflowDate)}
        />
      )}
    </>
  );
}

// ── Main MarketingPage ────────────────────────────────────────────────────────

type Props = { orgId: string | null; isAdmin: boolean; authorName: string };

export default function MarketingPage({ orgId, isAdmin, authorName }: Props) {
  const estToday = getZonedDateParts();
  const [year, setYear] = useState(estToday.year);
  const [month, setMonth] = useState(estToday.month);
  const [view, setView] = useState<"month" | "week">("month");
  const [posts, setPosts] = useState<CalPost[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>(DEFAULT_PLATFORMS);
  const [filterPlatform, setFilterPlatform] = useState<Platform | "all">("all");
  const [platformAction, setPlatformAction] = useState<"create" | "edit" | "delete" | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newDate, setNewDate] = useState(todayYmdEST());
  const [selectedPost, setSelectedPost] = useState<CalPost | null>(null);
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPost[]>([]);
  const [showFlagged, setShowFlagged] = useState(false);
  const confirm = useConfirm();

  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1440
  );
  useEffect(() => {
    function handleResize() { setWindowWidth(window.innerWidth); }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const platformStoreKey = `marketing-platforms-${orgId ?? "admin"}`;

  const load = useCallback(async () => {
    const sb = createClient();
    let q = sb.from("cal_posts").select("*").order("scheduled_date");
    if (orgId) q = q.eq("org_id", orgId); else q = q.is("org_id", null);
    const { data } = await q;
    setPosts((data ?? []) as CalPost[]);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(platformStoreKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPlatforms(parsed);
      }
    } catch {
      // Ignore malformed saved data.
    }
  }, [platformStoreKey]);

  useEffect(() => {
    const fromPosts = posts.map((p) => p.platform).filter(Boolean);
    const merged = Array.from(new Set([...DEFAULT_PLATFORMS, ...fromPosts, ...platforms])).sort();
    if (merged.join("|") !== platforms.join("|")) {
      setPlatforms(merged);
    }
  }, [posts, platforms]);

  function persistPlatforms(next: string[]) {
    setPlatforms(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(platformStoreKey, JSON.stringify(next));
    }
  }

  async function createPlatform(name: string) {
    if (platforms.some((p) => p.toLowerCase() === name.toLowerCase())) throw new Error("Platform already exists.");
    const next = [...platforms, name].sort();
    persistPlatforms(next);
  }

  async function renamePlatform(from: string, to: string) {
    if (from === to) return;
    if (platforms.some((p) => p.toLowerCase() === to.toLowerCase() && p !== from)) {
      throw new Error("Another platform already has that name.");
    }
    const { error } = await createClient().from("cal_posts").update({ platform: to }).eq("platform", from);
    if (error) throw new Error(error.message);
    setPosts((prev) => prev.map((p) => (p.platform === from ? { ...p, platform: to } : p)));
    const next = platforms.map((p) => (p === from ? to : p)).sort();
    persistPlatforms(next);
    if (filterPlatform === from) setFilterPlatform(to);
  }

  async function deletePlatform(name: string) {
    const linkedCount = posts.filter((p) => p.platform === name).length;
    if (linkedCount > 0) {
      throw new Error(`Cannot delete "${name}" while ${linkedCount} post(s) still use it.`);
    }
    if (!(await confirm({
      title: "Delete platform",
      message: `Delete "${name}" from filter options?`,
      destructive: true,
      confirmLabel: "Delete platform",
    }))) return;
    const next = platforms.filter((p) => p !== name);
    persistPlatforms(next.length > 0 ? next : DEFAULT_PLATFORMS);
    if (filterPlatform === name) setFilterPlatform("all");
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const filtered = posts.filter(p => filterPlatform === "all" || p.platform === filterPlatform);

  return (
      <div style={{ ...S.page, padding: windowWidth < 1400 ? "16px 14px" : "28px 32px" }}>
      {/* Page header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Marketing</h1>
          <p style={S.pageSubtitle}>Your content calendar, approvals, and shared assets.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value as Platform | "all")} style={S.filterSelect}>
            <option value="all">All platforms</option>
            {platforms.map(p => <option key={p}>{p}</option>)}
          </select>
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => setPlatformAction("create")} style={S.iconBtn} title="Create platform"><PlusIcon /></button>
              <button onClick={() => setPlatformAction("edit")} style={S.iconBtn} title="Edit platform"><EditIcon /></button>
              <button onClick={() => setPlatformAction("delete")} style={{ ...S.iconBtn, color: "#dc2626" }} title="Delete platform"><TrashIcon /></button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.viewToggle}>
            <button onClick={() => setView("month")} style={{ ...S.viewBtn, ...(view === "month" ? S.viewBtnActive : {}) }}>Month</button>
            <button onClick={() => setView("week")} style={{ ...S.viewBtn, ...(view === "week" ? S.viewBtnActive : {}) }}>Week</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={prevMonth} style={S.navBtn}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", minWidth: 120, textAlign: "center" }}>{MONTH_NAMES[month]} {year}</span>
            <button onClick={nextMonth} style={S.navBtn}>›</button>
          </div>
          <button onClick={() => { const t = getZonedDateParts(); setYear(t.year); setMonth(t.month); }} style={S.outlineBtn}>Today</button>
          {isAdmin && (
            <button onClick={() => setShowPdfImport(true)} style={S.outlineBtn} title="Import posts from PDF">
              <PdfIcon /> Import PDF
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { setNewDate(todayYmdEST()); setShowNew(true); }} style={S.primaryBtn}>
              <PlusIcon /> New post
            </button>
          )}
        </div>
      </div>

      {/* PDF import result banner */}
      {importSummary && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
          padding: "12px 16px", gap: 10,
        }}>
          <span style={{ fontSize: 13, color: "#15803d", fontWeight: 500 }}>{importSummary}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {flaggedPosts.length > 0 && (
              <button onClick={() => setShowFlagged(true)} style={{ ...S.outlineBtn, borderColor: "#fbbf24", color: "#92400e", background: "#fffbeb", padding: "5px 12px", fontSize: 12.5 }}>
                Review {flaggedPosts.length} duplicate{flaggedPosts.length > 1 ? "s" : ""}
              </button>
            )}
            <button onClick={() => setImportSummary(null)} style={S.iconBtn}><XIcon /></button>
          </div>
        </div>
      )}

      {/* Calendar */}
      {view === "month"
        ? <MonthGrid year={year} month={month} posts={filtered} isAdmin={isAdmin} windowWidth={windowWidth}
            onDayClick={d => { setNewDate(d); setShowNew(true); }}
            onPostClick={p => setSelectedPost(p)} />
        : <WeekGrid year={year} month={month} posts={filtered} isAdmin={isAdmin} windowWidth={windowWidth}
            onDayClick={d => { setNewDate(d); setShowNew(true); }}
            onPostClick={p => setSelectedPost(p)} />
      }

      {/* Asset Drop */}
      <AssetDrop orgId={orgId} isAdmin={isAdmin} />

      {/* Modals */}
      {showNew && (
        <NewPostModal orgId={orgId} authorName={authorName} defaultDate={newDate} platforms={platforms}
          onClose={() => setShowNew(false)}
          onCreated={p => { setPosts(prev => [...prev, p]); }} />
      )}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isAdmin={isAdmin}
          authorName={authorName}
          platforms={platforms}
          onClose={() => setSelectedPost(null)}
          onUpdated={p => { setPosts(prev => prev.map(x => x.id === p.id ? p : x)); setSelectedPost(p); }}
          onDeleted={id => { setPosts(prev => prev.filter(x => x.id !== id)); setSelectedPost(null); }}
        />
      )}
      {platformAction && (
        <PlatformActionModal
          mode={platformAction}
          platforms={platforms}
          onClose={() => setPlatformAction(null)}
          onCreate={createPlatform}
          onRename={renamePlatform}
          onDelete={deletePlatform}
        />
      )}
      {showPdfImport && (
        <PdfImportModal
          orgId={orgId}
          authorName={authorName}
          onClose={() => setShowPdfImport(false)}
          onImported={(created, flagged) => {
            if (created.length > 0) {
              setPosts(prev => [...prev, ...created]);
            }
            setFlaggedPosts(flagged);
            const summary = `${created.length} post${created.length !== 1 ? "s" : ""} added to the calendar.${flagged.length > 0 ? ` ${flagged.length} possible duplicate${flagged.length > 1 ? "s" : ""} need${flagged.length === 1 ? "s" : ""} your review.` : ""}`;
            setImportSummary(summary);
            if (flagged.length > 0) setShowFlagged(true);
          }}
        />
      )}
      {showFlagged && flaggedPosts.length > 0 && (
        <FlaggedReviewPanel
          flagged={flaggedPosts}
          orgId={orgId}
          authorName={authorName}
          onCreateAnyway={post => setPosts(prev => [...prev, post])}
          onDiscard={idx => setFlaggedPosts(prev => prev.filter((_, i) => i !== idx))}
          onClose={() => setShowFlagged(false)}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { padding: "28px 32px", display: "flex", flexDirection: "column", gap: 18, height: "100%", overflow: "auto" },
  pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  filterSelect: { padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer", outline: "none" },
  viewToggle: { display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 8, padding: 3 },
  viewBtn: { padding: "5px 14px", borderRadius: 6, border: "none", background: "transparent", fontSize: 13, color: "#6b7280", cursor: "pointer", fontWeight: 500 },
  viewBtnActive: { background: "#ffffff", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", fontWeight: 600 },
  navBtn: { width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#374151" },
  outlineBtn: { display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, color: "#374151", cursor: "pointer" },
  primaryBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  // Calendar grid
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", width: "100%", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  calDayHeader: { padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.5px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "center" },
  calCell: { minHeight: 120, padding: "8px 8px 6px", borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", background: "#ffffff", verticalAlign: "top" },
  calCellGray: { background: "#fafafa" },
  calDayNum: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", fontSize: 12.5, fontWeight: 500, color: "#374151" },
  calDayToday: { background: "#111827", color: "#ffffff", fontWeight: 700 },
  calPostChip: { display: "flex", alignItems: "center", gap: 4, padding: "3px 5px", borderRadius: 5, background: "#f0f4ff", border: "1px solid #e0e7ff", cursor: "pointer", marginBottom: 2 },
  calDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  calChipTitle: { fontSize: 10.5, color: "#1e293b", fontWeight: 500, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flex: 1, minWidth: 0 },
  calChipPlatform: { fontSize: 9.5, fontWeight: 600, padding: "1px 5px", borderRadius: 10, flexShrink: 0, whiteSpace: "nowrap" },
  // Asset drop
  dropZone: { border: "2px dashed #e5e7eb", borderRadius: 10, padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", background: "#fafafa", transition: "all 0.15s", gap: 4 },
  dropZoneActive: { borderColor: "#6366f1", background: "#eef2ff" },
  assetCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" },
  // Approval
  approvalBox: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" },
  approvalBtn: { padding: "7px 16px", borderRadius: 8, border: "1.5px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" },
  feedbackItem: { padding: "10px 12px", background: "#f9fafb", borderRadius: 8, marginBottom: 8 },
  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, animation: "fadeIn 0.15s ease" },
  modal: { background: "#fff", borderRadius: 16, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "90vh" },
  modalHeader: { display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6" },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: 700, color: "#111827" },
  closeBtn: { width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" },
  modalBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" },
  modalFooter: { padding: "14px 24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 10 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px" },
  input: { padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13.5, color: "#111827", outline: "none", background: "#fff", width: "100%", boxSizing: "border-box" },
  select: { padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13.5, color: "#111827", outline: "none", background: "#fff", width: "100%", cursor: "pointer" },
  cancelBtn: { padding: "9px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "none", color: "#374151", fontSize: 13.5, cursor: "pointer" },
  deleteBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontSize: 13, cursor: "pointer" },
  iconBtn: { border: "none", background: "none", cursor: "pointer", color: "#9ca3af", padding: 4, display: "flex", alignItems: "center", borderRadius: 4 },
  mediaCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" },
  mediaActionBtn: { border: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: 5, padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", fontSize: 12, textDecoration: "none" },
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function PlusIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function EditIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>; }
function UploadIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>; }
function SendIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }
function FileIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function DownloadIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function UploadSmIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>; }
function PdfIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><polyline points="9 9 10 9"/></svg>; }
