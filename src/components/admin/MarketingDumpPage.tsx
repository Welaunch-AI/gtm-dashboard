"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ui/ConfirmProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DumpFile {
  id: string;
  uploader_name: string | null;
  uploader_role: string | null;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  url: string;
  note: string | null;
  created_at: string;
}

interface Props {
  userName: string;
  userRole: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type FileKind = "image" | "video" | "doc" | "other";

function fileKind(type: string | null, name: string): FileKind {
  const t = (type ?? "").toLowerCase();
  const n = name.toLowerCase();
  if (t.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(n)) return "image";
  if (t.startsWith("video/") || /\.(mp4|mov|webm|avi)$/i.test(n)) return "video";
  if (/\.(pdf|doc|docx|txt|md|csv|psd|ai|sketch|fig)$/i.test(n)) return "doc";
  return "other";
}

function KindBadge({ kind }: { kind: FileKind }) {
  const map: Record<FileKind, { label: string; bg: string; color: string }> = {
    image: { label: "IMAGE", bg: "#dcfce7", color: "#15803d" },
    video: { label: "VIDEO", bg: "#dbeafe", color: "#1d4ed8" },
    doc:   { label: "DOC",   bg: "#f3e8ff", color: "#7c3aed" },
    other: { label: "FILE",  bg: "#f3f4f6", color: "#6b7280" },
  };
  const c = map[kind];
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
      padding: "2px 6px", borderRadius: 4,
      background: c.bg, color: c.color,
    }}>{c.label}</span>
  );
}

// ─── File Card ────────────────────────────────────────────────────────────────

function FileCard({
  file,
  onDelete,
  onNoteUpdate,
}: {
  file: DumpFile;
  onDelete: (id: string) => void;
  onNoteUpdate: (id: string, note: string) => void;
}) {
  const kind = fileKind(file.file_type, file.file_name);
  const [editNote, setEditNote] = useState(false);
  const [noteText, setNoteText] = useState(file.note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const confirm = useConfirm();

  async function saveNote() {
    setSavingNote(true);
    await createClient().from("marketing_dump_files").update({ note: noteText.trim() || null }).eq("id", file.id);
    setSavingNote(false);
    onNoteUpdate(file.id, noteText.trim());
    setEditNote(false);
  }

  async function handleDelete() {
    if (!(await confirm({
      title: "Delete file",
      message: `Delete "${file.file_name}"? This cannot be undone.`,
      destructive: true,
    }))) return;
    // Remove from storage
    const supabase = createClient();
    const path = file.url.split("/mkt-dump/")[1];
    if (path) await supabase.storage.from("mkt-dump").remove([decodeURIComponent(path)]);
    await supabase.from("marketing_dump_files").delete().eq("id", file.id);
    onDelete(file.id);
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.file_name;
    a.target = "_blank";
    a.click();
  }

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
      overflow: "hidden", display: "flex", flexDirection: "column",
    }}>
      {/* Preview area */}
      <div style={{
        height: 160, background: "#f9fafb",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative",
      }}>
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.url} alt={file.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : kind === "video" ? (
          <div style={{ color: "#9ca3af", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <VideoIcon />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Video</span>
          </div>
        ) : (
          <div style={{ color: "#9ca3af", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <DocIcon />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{file.file_name.split(".").pop()?.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: "#111827",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>{file.file_name}</span>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={handleDownload} style={iconBtn} title="Download">
              <DownloadIcon />
            </button>
            <button onClick={handleDelete} style={{ ...iconBtn, color: "#ef4444" }} title="Delete">
              <TrashIcon />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {fmtSize(file.file_size)} · {file.uploader_name ?? "Unknown"} · {timeAgo(file.created_at)}
          </span>
        </div>

        {/* Note */}
        {editNote ? (
          <div style={{ marginTop: 4 }}>
            <input
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveNote(); if (e.key === "Escape") setEditNote(false); }}
              placeholder="Add a note…"
              style={{
                width: "100%", padding: "5px 8px", borderRadius: 6,
                border: "1px solid #d1d5db", fontSize: 12, outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button onClick={() => setEditNote(false)} style={{ fontSize: 11, color: "#9ca3af", border: "none", background: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveNote} disabled={savingNote} style={{ fontSize: 11, color: "#2563eb", border: "none", background: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditNote(true)}
            style={{
              textAlign: "left", fontSize: 11, border: "none", background: "none",
              cursor: "pointer", padding: 0, marginTop: 2,
              color: file.note ? "#374151" : "#9ca3af",
              fontStyle: file.note ? "normal" : "italic",
            }}
          >
            {file.note || "Add a note…"}
          </button>
        )}

        <div style={{ marginTop: 4 }}>
          <KindBadge kind={kind} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketingDumpPage({ userName, userRole }: Props) {
  const [files, setFiles] = useState<DumpFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFetched = useRef(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const { data } = await createClient().from("marketing_dump_files").select("*").order("created_at", { ascending: false });
    setFiles((data as DumpFile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchFiles();
  }, [fetchFiles]);

  async function uploadFiles(fileList: FileList | File[]) {
    const fs = Array.from(fileList);
    if (!fs.length) return;
    setUploading(true);
    setUploadProgress(fs.map((f) => f.name));
    const supabase = createClient();
    const uploaded: DumpFile[] = [];

    for (const file of fs) {
      const path = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { error: uploadErr } = await supabase.storage.from("mkt-dump").upload(path, file, { upsert: false });
      if (uploadErr) { console.error(uploadErr); continue; }
      const { data: { publicUrl } } = supabase.storage.from("mkt-dump").getPublicUrl(path);
      const { data: row } = await supabase.from("marketing_dump_files").insert({
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        url: publicUrl,
        uploader_name: userName,
        uploader_role: userRole,
      }).select().single();
      if (row) uploaded.push(row as DumpFile);
    }

    setFiles((prev) => [...uploaded, ...prev]);
    setUploading(false);
    setUploadProgress([]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }

  function handleDelete(id: string) {
    setFiles((p) => p.filter((f) => f.id !== id));
  }

  function handleNoteUpdate(id: string, note: string) {
    setFiles((p) => p.map((f) => f.id === id ? { ...f, note } : f));
  }

  return (
    <div style={{ padding: "32px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Marketing Dump</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
            Internal staging area for drafts, raw footage, and ideas before they move to the client calendar.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          <PlusIcon /> Add file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); }}
        />
      </div>

      {/* Internal-only banner */}
      <div style={{
        background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8,
        padding: "10px 16px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 13, color: "#92400e",
      }}>
        <LockIcon />
        Internal only. Clients never see anything in this folder.
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#2563eb" : "#d1d5db"}`,
          borderRadius: 12, padding: "32px 24px",
          textAlign: "center", cursor: "pointer",
          background: dragging ? "#eff6ff" : "#fafafa",
          marginBottom: 28, transition: "all 0.15s",
        }}
      >
        <div style={{ color: "#9ca3af", marginBottom: 8 }}><UploadIcon /></div>
        <p style={{ fontSize: 14, color: "#374151", margin: "0 0 4px", fontWeight: 500 }}>Drop anything here</p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>No structure required. Organize later.</p>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {uploadProgress.map((name) => (
            <div key={name} style={{
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
              fontSize: 13, color: "#374151",
            }}>
              <SpinnerIcon />
              Uploading {name}…
            </div>
          ))}
        </div>
      )}

      {/* File grid */}
      {loading ? (
        <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: 40 }}>Loading files…</p>
      ) : files.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: 40 }}>
          No files yet. Drop anything above to get started.
        </p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: 16,
        }}>
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={handleDelete}
              onNoteUpdate={handleNoteUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared icon styles ───────────────────────────────────────────────────────

const iconBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 5, border: "none", background: "#f3f4f6",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  color: "#6b7280", padding: 0,
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function UploadIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>; }
function DownloadIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function TrashIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function LockIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function VideoIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>; }
function DocIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>; }
function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: "spin 1s linear infinite" }}>
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  );
}
