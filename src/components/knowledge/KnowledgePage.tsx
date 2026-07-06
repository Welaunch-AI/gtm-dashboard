"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Folder = {
  id: string;
  name: string;
  is_credentials_vault: boolean;
  is_admin_only: boolean;
  org_id: string | null;
  created_at: string;
  _itemCount?: number;
};

type KbItem = {
  id: string;
  folder_id: string;
  type: "link" | "note" | "file";
  name: string;
  url: string | null;
  content: string | null;
  file_name: string | null;
  is_admin_only: boolean;
  created_at: string;
};

type Credential = {
  id: string;
  site_name: string;
  username: string | null;
  password: string | null;
  notes: string | null;
  is_admin_only: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

type LinkService = { label: string; color: string; bg: string; icon: React.ReactNode };

function detectService(url: string): LinkService {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com/document"))  return { label: "Google Docs",   color: "#1a73e8", bg: "#e8f0fe", icon: <GDocIcon /> };
  if (u.includes("docs.google.com/spreadsheet")) return { label: "Google Sheets", color: "#0f9d58", bg: "#e6f4ea", icon: <GSheetIcon /> };
  if (u.includes("docs.google.com/presentation")) return { label: "Google Slides", color: "#f4b400", bg: "#fef7e0", icon: <GSlidesIcon /> };
  if (u.includes("drive.google.com"))           return { label: "Google Drive",  color: "#4285f4", bg: "#e8f0fe", icon: <GDriveIcon /> };
  if (u.includes("sharepoint.com") || u.includes("1drv.ms") || u.includes("office.com")) {
    if (u.includes("xlsx") || u.includes("excel")) return { label: "Excel",      color: "#217346", bg: "#e6f4ea", icon: <ExcelIcon /> };
    if (u.includes("docx") || u.includes("word"))  return { label: "Word",       color: "#2b579a", bg: "#e8f0fe", icon: <WordIcon /> };
    return { label: "Microsoft",  color: "#0078d4", bg: "#e8f0fe", icon: <MSIcon /> };
  }
  if (u.endsWith(".csv") || u.includes("csv"))  return { label: "CSV",          color: "#0f9d58", bg: "#e6f4ea", icon: <CsvIcon /> };
  if (u.endsWith(".pdf"))                        return { label: "PDF",          color: "#ea4335", bg: "#fce8e6", icon: <PdfIcon /> };
  return { label: "Link",                        color: "#6b7280", bg: "#f3f4f6", icon: <LinkIcon size={18} /> };
}

function fileIcon(mimeOrName: string) {
  const n = mimeOrName.toLowerCase();
  if (n.includes("pdf"))   return { bg: "#fce8e6", color: "#ea4335", label: "PDF" };
  if (n.includes("sheet") || n.includes("csv") || n.includes("xlsx")) return { bg: "#e6f4ea", color: "#0f9d58", label: "Sheet" };
  if (n.includes("word") || n.includes("doc"))  return { bg: "#e8f0fe", color: "#2b579a", label: "Doc" };
  if (n.includes("ppt") || n.includes("presentation")) return { bg: "#fef7e0", color: "#f4b400", label: "Slides" };
  if (n.match(/\.(png|jpg|jpeg|gif|webp|svg)/)) return { bg: "#f0fdf4", color: "#16a34a", label: "Image" };
  return { bg: "#f3f4f6", color: "#6b7280", label: "File" };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ children, onClose, width = 480 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
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

// ── Item Card ─────────────────────────────────────────────────────────────────

function CardMenu({ canEdit, onEdit, onDelete }: { canEdit: boolean; onEdit?: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  return (
    <div style={{ position: "relative", flexShrink: 0 }} data-menu>
      <button style={S.cardMenuBtn} onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}>
        <DotsHIcon />
      </button>
      {open && (
        <div style={S.cardDropdown}>
          {onEdit && <button style={S.cardDropItem} onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(); setOpen(false); }}><EditIcon /> Edit</button>}
          <button style={{ ...S.cardDropItem, color: "#dc2626" }} onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); setOpen(false); }}><TrashIcon /> Delete</button>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, isAdmin, canEdit, onEdit, onDelete }: {
  item: KbItem;
  isAdmin: boolean;
  canEdit: boolean;
  onEdit: (item: KbItem) => void;
  onDelete: (id: string) => void;
}) {
  if (item.type === "link" && item.url) {
    const svc = detectService(item.url);
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...S.itemCard, textDecoration: "none", color: "inherit" }}
        onClick={e => { if ((e.target as HTMLElement).closest("[data-menu]")) e.preventDefault(); }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <div style={{ ...S.itemServiceBadge, background: svc.bg, color: svc.color, flexShrink: 0 }}>{svc.icon}</div>
          <CardMenu canEdit={canEdit} onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} />
        </div>
        <p style={S.itemCardName}>{item.name}</p>
        <span style={{ ...S.itemServiceLabel, color: svc.color, marginTop: 4, display: "block" }}>{svc.label}</span>
        {item.is_admin_only && <span style={{ ...S.adminBadge, display: "inline-block", marginTop: 6 }}>Admin only</span>}
      </a>
    );
  }

  if (item.type === "file" && item.url) {
    const fi = fileIcon(item.file_name ?? item.url);
    const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(item.file_name ?? item.url);
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ ...S.itemCard, textDecoration: "none", color: "inherit", padding: 0 }}
        onClick={e => { if ((e.target as HTMLElement).closest("[data-menu]")) e.preventDefault(); }}>
        {isImage ? (
          <div style={{ width: "100%", height: 120, overflow: "hidden", borderRadius: "12px 12px 0 0", background: "#f3f4f6", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : null}
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: isImage ? 6 : 10 }}>
            {!isImage && <div style={{ ...S.itemServiceBadge, background: fi.bg, color: fi.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", flexShrink: 0 }}>{fi.label}</div>}
            {isImage && <span style={{ fontSize: 11, fontWeight: 600, color: fi.color, background: fi.bg, padding: "2px 7px", borderRadius: 20 }}>{fi.label}</span>}
            <CardMenu canEdit={canEdit} onDelete={() => onDelete(item.id)} />
          </div>
          <p style={S.itemCardName}>{item.name}</p>
          {item.file_name && <p style={S.itemCardFilename}>{item.file_name}</p>}
          {item.is_admin_only && <span style={{ ...S.adminBadge, display: "inline-block", marginTop: 6 }}>Admin only</span>}
        </div>
      </a>
    );
  }

  // Note
  return (
    <div style={S.itemCard}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ ...S.itemServiceBadge, background: "#f3f4f6", color: "#6b7280", flexShrink: 0 }}><NoteIcon /></div>
        <CardMenu canEdit={canEdit} onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} />
      </div>
      <p style={S.itemCardName}>{item.name}</p>
      {item.content && <p style={S.itemCardContent}>{item.content}</p>}
      {item.is_admin_only && <span style={{ ...S.adminBadge, display: "inline-block", marginTop: 6 }}>Admin only</span>}
    </div>
  );
}

// ── Folder Detail ─────────────────────────────────────────────────────────────

function FolderDetail({ folder, orgId, isAdmin, canEdit, onBack, onFolderRenamed, onFolderDeleted }: {
  folder: Folder; orgId: string | null; isAdmin: boolean; canEdit: boolean;
  onBack: () => void; onFolderRenamed: (id: string, name: string) => void; onFolderDeleted: (id: string) => void;
}) {
  const [items, setItems] = useState<KbItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [editItem, setEditItem] = useState<KbItem | null>(null);
  const [editFolder, setEditFolder] = useState(false);
  const [folderName, setFolderName] = useState(folder.name);
  const [linkForm, setLinkForm] = useState({ name: "", url: "", is_admin_only: false });
  const [noteForm, setNoteForm] = useState({ name: "", content: "", is_admin_only: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = createClient();
    const { data } = await sb.from("kb_items").select("*").eq("folder_id", folder.id).order("created_at");
    setItems((data ?? []) as KbItem[]);
    setLoading(false);
  }, [folder.id]);

  useEffect(() => { load(); }, [load]);

  async function uploadFiles(files: FileList) {
    setUploading(true);
    const sb = createClient();
    for (const file of Array.from(files)) {
      const path = `${folder.id}/${Date.now()}_${file.name}`;
      const { data: uploaded, error } = await sb.storage.from("kb-files").upload(path, file);
      if (error) { console.error(error); continue; }
      const { data: { publicUrl } } = sb.storage.from("kb-files").getPublicUrl(uploaded.path);
      const { data: item } = await sb.from("kb_items").insert({
        folder_id: folder.id, org_id: orgId, type: "file",
        name: file.name.replace(/\.[^.]+$/, ""), file_name: file.name, url: publicUrl,
      }).select().single();
      if (item) setItems(p => [...p, item as KbItem]);
    }
    setUploading(false);
  }

  async function saveLink() {
    if (!linkForm.name.trim() || !linkForm.url.trim()) return;
    const sb = createClient();
    const url = linkForm.url.startsWith("http") ? linkForm.url.trim() : "https://" + linkForm.url.trim();
    const { data } = await sb.from("kb_items").insert({ folder_id: folder.id, org_id: orgId, type: "link", name: linkForm.name.trim(), url, is_admin_only: linkForm.is_admin_only }).select().single();
    if (data) setItems(p => [...p, data as KbItem]);
    setShowLink(false); setLinkForm({ name: "", url: "", is_admin_only: false });
  }

  async function saveNote() {
    if (!noteForm.name.trim()) return;
    const sb = createClient();
    const { data } = await sb.from("kb_items").insert({ folder_id: folder.id, org_id: orgId, type: "note", name: noteForm.name.trim(), content: noteForm.content.trim() || null, is_admin_only: noteForm.is_admin_only }).select().single();
    if (data) setItems(p => [...p, data as KbItem]);
    setShowNote(false); setNoteForm({ name: "", content: "", is_admin_only: false });
  }

  async function saveEditItem() {
    if (!editItem) return;
    const sb = createClient();
    const patch = editItem.type === "link"
      ? { name: editItem.name, url: editItem.url, is_admin_only: editItem.is_admin_only }
      : { name: editItem.name, content: editItem.content, is_admin_only: editItem.is_admin_only };
    await sb.from("kb_items").update(patch).eq("id", editItem.id);
    setItems(p => p.map(i => i.id === editItem.id ? { ...i, ...patch } : i));
    setEditItem(null);
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    const sb = createClient();
    await sb.from("kb_items").delete().eq("id", id);
    setItems(p => p.filter(i => i.id !== id));
  }

  async function renameFolder() {
    if (!folderName.trim()) return;
    const sb = createClient();
    await sb.from("kb_folders").update({ name: folderName.trim() }).eq("id", folder.id);
    onFolderRenamed(folder.id, folderName.trim());
    setEditFolder(false);
  }

  async function deleteFolder() {
    if (!confirm(`Delete folder "${folder.name}" and all its contents? This cannot be undone.`)) return;
    const sb = createClient();
    await sb.from("kb_folders").delete().eq("id", folder.id);
    onFolderDeleted(folder.id);
    onBack();
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.folderHeader}>
        <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <button onClick={onBack} style={S.breadcrumbLink}>All folders</button>
          <ChevronRightIcon />
          {editFolder ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => e.key === "Enter" && renameFolder()} style={{ ...S.input, padding: "4px 8px", fontSize: 13, width: 180 }} autoFocus />
              <button onClick={renameFolder} style={{ ...S.primaryBtn, padding: "4px 10px", fontSize: 12 }}>Save</button>
              <button onClick={() => setEditFolder(false)} style={{ ...S.cancelBtn, padding: "4px 10px", fontSize: 12 }}>Cancel</button>
            </div>
          ) : (
            <span style={S.breadcrumbCurrent}>{folder.name}</span>
          )}
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          {canEdit && !editFolder && (
            <>
              <button onClick={() => setEditFolder(true)} style={S.iconBtn} title="Rename folder"><EditIcon /></button>
              <button onClick={deleteFolder} style={{ ...S.iconBtn, color: "#dc2626" }} title="Delete folder"><TrashIcon /></button>
            </>
          )}
          <button onClick={onBack} style={S.backBtn}><ArrowLeftIcon /> Back</button>
        </div>
      </div>

      {/* Upload zone */}
      {canEdit && (
        <div
          style={{ ...S.dropZone, ...(dragOver ? S.dropZoneActive : {}) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
        >
          <UploadIcon />
          <p style={{ fontSize: 13.5, color: "#374151", marginTop: 6, fontWeight: 500 }}>
            {uploading ? "Uploading…" : "Drop files here to upload"}
          </p>
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            Images (JPG, PNG, GIF), PDFs, Word docs (.doc/.docx), HTML files — or paste a Google Docs / Sheets link
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => fileInputRef.current?.click()} style={S.outlineBtn} disabled={uploading}>
              <UploadSmIcon /> Choose files
            </button>
            <button onClick={() => setShowLink(true)} style={S.outlineBtn}><LinkIcon size={13} /> Add link</button>
            <button onClick={() => setShowNote(true)} style={S.outlineBtn}><PlusIcon /> Add note</button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.html,.htm"
            style={{ display: "none" }}
            onChange={e => { if (e.target.files?.length) { uploadFiles(e.target.files); e.target.value = ""; } }}
          />
        </div>
      )}

      {/* Items card grid */}
      {loading ? (
        <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 40 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ ...S.emptyBox }}>
          <FolderIcon size={28} color="#d1d5db" />
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 10 }}>This folder is empty.</p>
        </div>
      ) : (
        <div style={S.itemsGrid}>
          {items.map(item => (
            <ItemCard key={item.id} item={item} isAdmin={isAdmin} canEdit={canEdit}
              onEdit={i => setEditItem({ ...i })}
              onDelete={deleteItem}
            />
          ))}
        </div>
      )}

      {/* Edit item modal */}
      {editItem && (
        <Modal onClose={() => setEditItem(null)}>
          <div style={S.modalHeader}>
            <h2 style={S.modalTitle}>Edit {editItem.type}</h2>
            <button onClick={() => setEditItem(null)} style={S.closeBtn}><XIcon /></button>
          </div>
          <div style={S.modalBody}>
            <div style={S.fieldGroup}>
              <span style={S.fieldLabel}>Name</span>
              <input autoFocus value={editItem.name} onChange={e => setEditItem(p => p ? { ...p, name: e.target.value } : p)} style={S.input} />
            </div>
            {editItem.type === "link" && (
              <div style={S.fieldGroup}>
                <span style={S.fieldLabel}>URL</span>
                <input value={editItem.url ?? ""} onChange={e => setEditItem(p => p ? { ...p, url: e.target.value } : p)} style={S.input} />
              </div>
            )}
            {editItem.type === "note" && (
              <div style={S.fieldGroup}>
                <span style={S.fieldLabel}>Content</span>
                <textarea value={editItem.content ?? ""} onChange={e => setEditItem(p => p ? { ...p, content: e.target.value } : p)} style={{ ...S.input, minHeight: 100, resize: "vertical" }} />
              </div>
            )}
            {isAdmin && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                <input type="checkbox" checked={editItem.is_admin_only} onChange={e => setEditItem(p => p ? { ...p, is_admin_only: e.target.checked } : p)} style={{ accentColor: "#111827" }} />
                Admin only
              </label>
            )}
          </div>
          <div style={S.modalFooter}>
            <button onClick={() => setEditItem(null)} style={S.cancelBtn}>Cancel</button>
            <button onClick={saveEditItem} style={S.primaryBtn}>Save changes</button>
          </div>
        </Modal>
      )}

      {/* Add link modal */}
      {showLink && (
        <Modal onClose={() => setShowLink(false)}>
          <div style={S.modalHeader}>
            <h2 style={S.modalTitle}>Add link</h2>
            <button onClick={() => setShowLink(false)} style={S.closeBtn}><XIcon /></button>
          </div>
          <div style={S.modalBody}>
            <div style={S.fieldGroup}>
              <span style={S.fieldLabel}>Label</span>
              <input autoFocus value={linkForm.name} onChange={e => setLinkForm(f => ({ ...f, name: e.target.value }))} style={S.input} placeholder="e.g. Q1 Brand Guidelines" />
            </div>
            <div style={S.fieldGroup}>
              <span style={S.fieldLabel}>URL</span>
              <input value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} style={S.input} placeholder="https://docs.google.com/…" onKeyDown={e => e.key === "Enter" && saveLink()} />
            </div>
            {linkForm.url && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: detectService(linkForm.url).bg }}>
                {detectService(linkForm.url).icon}
                <span style={{ fontSize: 12.5, fontWeight: 600, color: detectService(linkForm.url).color }}>{detectService(linkForm.url).label} detected</span>
              </div>
            )}
            {isAdmin && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                <input type="checkbox" checked={linkForm.is_admin_only} onChange={e => setLinkForm(f => ({ ...f, is_admin_only: e.target.checked }))} style={{ accentColor: "#111827" }} />
                Admin only
              </label>
            )}
          </div>
          <div style={S.modalFooter}>
            <button onClick={() => setShowLink(false)} style={S.cancelBtn}>Cancel</button>
            <button onClick={saveLink} style={S.primaryBtn}>Add link</button>
          </div>
        </Modal>
      )}

      {/* Add note modal */}
      {showNote && (
        <Modal onClose={() => setShowNote(false)}>
          <div style={S.modalHeader}>
            <h2 style={S.modalTitle}>Add note</h2>
            <button onClick={() => setShowNote(false)} style={S.closeBtn}><XIcon /></button>
          </div>
          <div style={S.modalBody}>
            <div style={S.fieldGroup}>
              <span style={S.fieldLabel}>Title</span>
              <input autoFocus value={noteForm.name} onChange={e => setNoteForm(f => ({ ...f, name: e.target.value }))} style={S.input} placeholder="Note title" />
            </div>
            <div style={S.fieldGroup}>
              <span style={S.fieldLabel}>Content</span>
              <textarea value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} style={{ ...S.input, minHeight: 120, resize: "vertical" }} placeholder="Write your note…" />
            </div>
            {isAdmin && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                <input type="checkbox" checked={noteForm.is_admin_only} onChange={e => setNoteForm(f => ({ ...f, is_admin_only: e.target.checked }))} style={{ accentColor: "#111827" }} />
                Admin only
              </label>
            )}
          </div>
          <div style={S.modalFooter}>
            <button onClick={() => setShowNote(false)} style={S.cancelBtn}>Cancel</button>
            <button onClick={saveNote} style={S.primaryBtn}>Add note</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Credentials Vault ─────────────────────────────────────────────────────────

function CredentialsVault({ folder, orgId, isAdmin, onBack }: { folder: Folder; orgId: string | null; isAdmin: boolean; onBack: () => void }) {
  const [locked, setLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [storedHash, setStoredHash] = useState<string | null>(null);
  const [settingPin, setSettingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showPwd, setShowPwd] = useState<string | null>(null);
  const [editCred, setEditCred] = useState<Credential | null>(null);
  const blankForm = () => ({ site_name: "", username: "", password: "", notes: "", is_admin_only: false });
  const [form, setForm] = useState(blankForm());

  useEffect(() => {
    const sb = createClient();
    sb.from("kb_vault_settings").select("pin_hash").eq("org_id", orgId ?? "00000000-0000-0000-0000-000000000000").single().then(({ data }) => {
      if (data) setStoredHash(data.pin_hash);
      else setSettingPin(true);
    });
  }, [orgId]);

  useEffect(() => {
    if (!locked) {
      const sb = createClient();
      sb.from("kb_credentials").select("*").eq("folder_id", folder.id).order("created_at").then(({ data }) => setCredentials((data ?? []) as Credential[]));
    }
  }, [locked, folder.id]);

  async function handleUnlock() {
    if (!storedHash) return;
    const h = await hashPin(pin);
    if (h === storedHash) { setLocked(false); setPinError(""); }
    else setPinError("Incorrect password. Try again.");
  }

  async function handleSetPin() {
    if (newPin.length < 4) { setPinError("Minimum 4 characters"); return; }
    if (newPin !== confirmPin) { setPinError("Passwords don't match"); return; }
    const h = await hashPin(newPin);
    const sb = createClient();
    const orgKey = orgId ?? "00000000-0000-0000-0000-000000000000";
    const { data: existing } = await sb.from("kb_vault_settings").select("id").eq("org_id", orgKey).single();
    if (existing) await sb.from("kb_vault_settings").update({ pin_hash: h }).eq("org_id", orgKey);
    else await sb.from("kb_vault_settings").insert({ org_id: orgId, pin_hash: h });
    setStoredHash(h); setSettingPin(false); setLocked(false);
    setNewPin(""); setConfirmPin(""); setPinError("");
  }

  async function saveCred() {
    if (!form.site_name.trim()) return;
    const sb = createClient();
    if (editCred) {
      await sb.from("kb_credentials").update({ ...form }).eq("id", editCred.id);
      setCredentials(p => p.map(c => c.id === editCred.id ? { ...c, ...form } : c));
    } else {
      const { data } = await sb.from("kb_credentials").insert({ ...form, folder_id: folder.id, org_id: orgId }).select().single();
      if (data) setCredentials(p => [...p, data as Credential]);
    }
    setShowAdd(false); setEditCred(null); setForm(blankForm());
  }

  async function deleteCred(id: string) {
    if (!confirm("Delete this credential?")) return;
    const sb = createClient();
    await sb.from("kb_credentials").delete().eq("id", id);
    setCredentials(p => p.filter(c => c.id !== id));
  }

  if (locked) {
    return (
      <div style={S.page}>
        <div style={S.folderHeader}>
          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={onBack} style={S.breadcrumbLink}>All folders</button>
            <ChevronRightIcon />
            <span style={S.breadcrumbCurrent}>{folder.name}</span>
          </nav>
          <button onClick={onBack} style={S.backBtn}><ArrowLeftIcon /> Back</button>
        </div>
        <div style={S.vaultLockWrap}>
          <div style={S.vaultLockCard}>
            <div style={S.vaultIconCircle}><LockIcon color="#d97706" size={26} /></div>
            {settingPin ? (
              <>
                <h3 style={S.vaultTitle}>Set vault password</h3>
                <p style={S.vaultSub}>Create a master password to protect stored credentials.</p>
                <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="New password (min 4 chars)" style={S.input} />
                <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Confirm password" style={{ ...S.input, marginTop: 8 }} onKeyDown={e => e.key === "Enter" && handleSetPin()} />
                {pinError && <p style={S.pinError}>{pinError}</p>}
                <button onClick={handleSetPin} style={S.vaultUnlockBtn}><LockIcon color="#fff" size={14} /> Set password & unlock</button>
              </>
            ) : (
              <>
                <h3 style={S.vaultTitle}>Credentials vault locked</h3>
                <p style={S.vaultSub}>Enter the master password to view stored credentials.</p>
                <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Master password" style={S.input} onKeyDown={e => e.key === "Enter" && handleUnlock()} />
                {pinError && <p style={S.pinError}>{pinError}</p>}
                <button onClick={handleUnlock} style={S.vaultUnlockBtn}><LockIcon color="#fff" size={14} /> Unlock vault</button>
                {isAdmin && <button onClick={() => { setSettingPin(true); setPinError(""); }} style={S.changePinBtn}>Change master password</button>}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.folderHeader}>
        <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={onBack} style={S.breadcrumbLink}>All folders</button>
          <ChevronRightIcon />
          <span style={S.breadcrumbCurrent}>{folder.name}</span>
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          {isAdmin && <button onClick={() => { setShowAdd(true); setForm(blankForm()); setEditCred(null); }} style={S.primaryBtn}>+ Add credential</button>}
          <button onClick={() => setLocked(true)} style={S.outlineBtn}><LockIcon size={13} color="#6b7280" /> Lock vault</button>
          <button onClick={onBack} style={S.backBtn}><ArrowLeftIcon /> Back</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={S.vaultOpenBadge}>🔓 Vault unlocked</span>
      </div>

      {credentials.length === 0 ? (
        <div style={S.emptyBox}>
          <KeyIcon size={28} color="#d1d5db" />
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 10 }}>No credentials stored yet.</p>
        </div>
      ) : (
        <div style={S.itemsGrid}>
          {credentials.map(c => (
            <div key={c.id} style={S.credCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ ...S.itemServiceBadge, background: "#fef3c7", color: "#d97706" }}><KeyIcon size={16} /></div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { setEditCred(c); setForm({ site_name: c.site_name, username: c.username ?? "", password: c.password ?? "", notes: c.notes ?? "", is_admin_only: c.is_admin_only }); setShowAdd(true); }} style={S.iconBtn}><EditIcon /></button>
                    <button onClick={() => deleteCred(c.id)} style={S.iconBtn}><TrashIcon /></button>
                  </div>
                )}
              </div>
              <p style={S.credSite}>{c.site_name}</p>
              {c.username && <p style={S.credMeta}>{c.username}</p>}
              {c.password && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, background: "#f9fafb", borderRadius: 6, padding: "6px 10px" }}>
                  <span style={{ flex: 1, fontSize: 13, fontFamily: "monospace", letterSpacing: "2px", color: "#374151" }}>{showPwd === c.id ? c.password : "••••••••••"}</span>
                  <button onClick={() => setShowPwd(showPwd === c.id ? null : c.id)} style={S.iconBtn}>{showPwd === c.id ? <EyeOffIcon /> : <EyeIcon />}</button>
                  <button onClick={() => navigator.clipboard.writeText(c.password ?? "")} style={S.iconBtn} title="Copy password"><CopyIcon /></button>
                </div>
              )}
              {c.notes && <p style={S.credNotes}>{c.notes}</p>}
              {c.is_admin_only && <span style={{ ...S.adminBadge, display: "inline-block", marginTop: 8 }}>Admin only</span>}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal onClose={() => { setShowAdd(false); setEditCred(null); }}>
          <div style={S.modalHeader}>
            <h2 style={S.modalTitle}>{editCred ? "Edit credential" : "Add credential"}</h2>
            <button onClick={() => { setShowAdd(false); setEditCred(null); }} style={S.closeBtn}><XIcon /></button>
          </div>
          <div style={S.modalBody}>
            {[["site_name", "Site / Service name", "Google Ads, Facebook, etc."], ["username", "Username / Email", ""], ["password", "Password", ""], ["notes", "Notes", ""]] .map(([key, lbl, ph]) => (
              <div key={key} style={S.fieldGroup}>
                <span style={S.fieldLabel}>{lbl}</span>
                <input value={(form as Record<string, string | boolean>)[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} style={S.input} />
              </div>
            ))}
            {isAdmin && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_admin_only} onChange={e => setForm(f => ({ ...f, is_admin_only: e.target.checked }))} style={{ accentColor: "#111827" }} />
                Admin only
              </label>
            )}
          </div>
          <div style={S.modalFooter}>
            <button onClick={() => { setShowAdd(false); setEditCred(null); }} style={S.cancelBtn}>Cancel</button>
            <button onClick={saveCred} style={S.primaryBtn}>{editCred ? "Save changes" : "Add credential"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Folder List ───────────────────────────────────────────────────────────────

function FolderList({ folders, isAdmin, canEdit, onOpen, onCreateFolder, onDeleteFolder }: {
  folders: Folder[]; isAdmin: boolean; canEdit: boolean;
  onOpen: (f: Folder) => void;
  onCreateFolder: (name: string, adminOnly: boolean) => void;
  onDeleteFolder: (id: string) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [adminOnly, setAdminOnly] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    onCreateFolder(newName.trim(), adminOnly);
    setNewName(""); setAdminOnly(false); setShowNew(false);
  }

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Knowledge Base</h1>
          <p style={S.pageSubtitle}>Documents, assets, and credentials shared between you and WeLaunch.</p>
        </div>
        {canEdit && <button onClick={() => setShowNew(true)} style={S.outlineBtn}><FolderPlusIcon /> New folder</button>}
      </div>
      <p style={{ fontSize: 13, color: "#6b7280" }}>All folders</p>
      {folders.length === 0 ? (
        <div style={S.emptyBox}>
          <FolderIcon size={32} color="#d1d5db" />
          <p style={{ color: "#9ca3af", marginTop: 10, fontSize: 13 }}>No folders yet.</p>
        </div>
      ) : (
        <div style={S.folderGrid}>
          {folders.map(f => (
            <div key={f.id} style={S.folderCard} onClick={() => onOpen(f)}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ ...S.folderIconWrap, background: f.is_credentials_vault ? "#fef3c7" : "#f3f4f6" }}>
                    {f.is_credentials_vault ? <LockIcon color="#d97706" /> : <FolderIcon color="#6b7280" />}
                  </div>
                  <div>
                    <p style={S.folderName}>{f.name}</p>
                    <p style={S.folderMeta}>{f.is_credentials_vault ? "Password protected" : `${f._itemCount ?? 0} items`}</p>
                  </div>
                </div>
                {canEdit && !f.is_credentials_vault && (
                  <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
                    <button style={S.menuDotBtn} onClick={() => setMenuOpen(menuOpen === f.id ? null : f.id)}><DotsHIcon /></button>
                    {menuOpen === f.id && (
                      <div style={S.cardDropdown}>
                        <button style={{ ...S.cardDropItem, color: "#dc2626" }} onClick={() => { onDeleteFolder(f.id); setMenuOpen(null); }}><TrashIcon /> Delete folder</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {f.is_admin_only && <span style={{ ...S.adminBadge, display: "inline-block", marginTop: 8 }}>Admin only</span>}
            </div>
          ))}
        </div>
      )}
      {showNew && (
        <Modal onClose={() => setShowNew(false)}>
          <div style={S.modalHeader}>
            <h2 style={S.modalTitle}>New folder</h2>
            <button onClick={() => setShowNew(false)} style={S.closeBtn}><XIcon /></button>
          </div>
          <div style={S.modalBody}>
            <div style={S.fieldGroup}>
              <span style={S.fieldLabel}>Folder name</span>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} style={S.input} placeholder="e.g. Brand Assets" />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={adminOnly} onChange={e => setAdminOnly(e.target.checked)} style={{ accentColor: "#111827" }} />
              Admin only (clients can&apos;t see this folder)
            </label>
          </div>
          <div style={S.modalFooter}>
            <button onClick={() => setShowNew(false)} style={S.cancelBtn}>Cancel</button>
            <button onClick={handleCreate} style={S.primaryBtn}>Create folder</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Props = { orgId: string | null; isAdmin: boolean; canEdit?: boolean };

export default function KnowledgePage({ orgId, isAdmin, canEdit = isAdmin }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [openFolder, setOpenFolder] = useState<Folder | null>(null);
  const seeded = useRef(false);

  const loadFolders = useCallback(async () => {
    const sb = createClient();
    let q = sb.from("kb_folders").select("*").order("is_credentials_vault", { ascending: false }).order("created_at");
    if (orgId) q = q.eq("org_id", orgId);
    else q = q.is("org_id", null);
    const { data: folderData } = await q;
    const flds = (folderData ?? []) as Folder[];
    const counts = await Promise.all(
      flds.filter(f => !f.is_credentials_vault).map(async f => {
        const sb2 = createClient();
        const { count } = await sb2.from("kb_items").select("id", { count: "exact", head: true }).eq("folder_id", f.id);
        return { id: f.id, count: count ?? 0 };
      })
    );
    const countMap = Object.fromEntries(counts.map(c => [c.id, c.count]));
    setFolders(flds.map(f => ({ ...f, _itemCount: countMap[f.id] ?? 0 })));
  }, [orgId]);

  useEffect(() => {
    loadFolders();
    if (isAdmin && !seeded.current) {
      seeded.current = true;
      const sb = createClient();
      let q = sb.from("kb_folders").select("id").eq("is_credentials_vault", true);
      q = orgId ? q.eq("org_id", orgId) : q.is("org_id", null);
      q.maybeSingle().then(({ data }) => {
        if (!data) {
          createClient().from("kb_folders").insert({ org_id: orgId, name: "Credentials Vault", is_credentials_vault: true, is_admin_only: false }).then(() => loadFolders());
        }
      });
    }
  }, [loadFolders, orgId, isAdmin]);

  async function handleCreateFolder(name: string, adminOnly: boolean) {
    const sb = createClient();
    const { data } = await sb.from("kb_folders").insert({ org_id: orgId, name, is_admin_only: adminOnly }).select().single();
    if (data) setFolders(p => [...p, { ...(data as Folder), _itemCount: 0 }]);
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm("Delete this folder and all its contents?")) return;
    const sb = createClient();
    await sb.from("kb_folders").delete().eq("id", id);
    setFolders(p => p.filter(f => f.id !== id));
  }

  if (openFolder) {
    if (openFolder.is_credentials_vault) {
      return <CredentialsVault folder={openFolder} orgId={orgId} isAdmin={isAdmin} onBack={() => setOpenFolder(null)} />;
    }
    return (
      <FolderDetail
        folder={openFolder} orgId={orgId} isAdmin={isAdmin} canEdit={canEdit}
        onBack={() => { setOpenFolder(null); loadFolders(); }}
        onFolderRenamed={(id, name) => { setFolders(p => p.map(f => f.id === id ? { ...f, name } : f)); setOpenFolder(f => f ? { ...f, name } : f); }}
        onFolderDeleted={id => { setFolders(p => p.filter(f => f.id !== id)); setOpenFolder(null); }}
      />
    );
  }

  return (
    <FolderList
      folders={folders}
      isAdmin={isAdmin}
      canEdit={canEdit}
      onOpen={setOpenFolder}
      onCreateFolder={handleCreateFolder}
      onDeleteFolder={handleDeleteFolder}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20, height: "100%", overflow: "auto" },
  pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  folderGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  folderCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", cursor: "pointer", position: "relative" },
  folderIconWrap: { width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  folderName: { fontSize: 14, fontWeight: 600, color: "#111827" },
  folderMeta: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  adminBadge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#fef3c7", color: "#92400e" },
  menuDotBtn: { border: "none", background: "none", cursor: "pointer", color: "#9ca3af", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" },
  emptyBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0" },
  // Folder detail
  folderHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  breadcrumbLink: { background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#6b7280", padding: 0 },
  breadcrumbCurrent: { fontSize: 13, fontWeight: 600, color: "#111827" },
  backBtn: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151", background: "none", border: "1px solid #e5e7eb", borderRadius: 7, padding: "6px 12px", cursor: "pointer" },
  dropZone: { border: "2px dashed #e5e7eb", borderRadius: 12, padding: "28px 24px", display: "flex", flexDirection: "column", alignItems: "center", background: "#fafafa", transition: "all 0.15s" },
  dropZoneActive: { borderColor: "#6366f1", background: "#eef2ff" },
  // Items as cards
  itemsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 },
  itemCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", position: "relative", transition: "box-shadow 0.15s", boxSizing: "border-box", overflow: "hidden" },
  itemServiceBadge: { width: 38, height: 38, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" },
  itemServiceLabel: { fontSize: 11.5, fontWeight: 600 },
  itemCardName: { fontSize: 13.5, fontWeight: 600, color: "#111827", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties,
  itemCardFilename: { fontSize: 11.5, color: "#9ca3af", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemCardContent: { fontSize: 12.5, color: "#6b7280", marginTop: 4, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" } as React.CSSProperties,
  cardMenuBtn: { border: "none", background: "none", cursor: "pointer", color: "#9ca3af", padding: 3, borderRadius: 4, display: "flex", alignItems: "center" },
  cardDropdown: { position: "absolute", top: 28, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 20, minWidth: 120 },
  cardDropItem: { width: "100%", padding: "9px 14px", fontSize: 13, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, textAlign: "left", color: "#374151" },
  // Vault
  vaultLockWrap: { display: "flex", justifyContent: "center", paddingTop: 40 },
  vaultLockCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "36px 40px", maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", gap: 0 },
  vaultIconCircle: { width: 60, height: 60, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  vaultTitle: { fontSize: 17, fontWeight: 700, color: "#111827", textAlign: "center", marginBottom: 6 },
  vaultSub: { fontSize: 13, color: "#6b7280", textAlign: "center", marginBottom: 18 },
  vaultUnlockBtn: { width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: "#111827", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 14 },
  changePinBtn: { background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", marginTop: 10, textDecoration: "underline" },
  pinError: { fontSize: 12, color: "#dc2626", alignSelf: "flex-start", marginTop: 4 },
  vaultOpenBadge: { fontSize: 12.5, color: "#065f46", background: "#d1fae5", padding: "4px 10px", borderRadius: 20, fontWeight: 600 },
  credCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 4 },
  credSite: { fontSize: 14, fontWeight: 600, color: "#111827", marginTop: 8 },
  credMeta: { fontSize: 12.5, color: "#6b7280" },
  credNotes: { fontSize: 12, color: "#9ca3af", borderTop: "1px solid #f3f4f6", paddingTop: 8, marginTop: 4 },
  // Shared
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 },
  modal: { background: "#ffffff", borderRadius: 16, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", maxHeight: "90vh", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6" },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#111827" },
  closeBtn: { width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" },
  modalBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" },
  modalFooter: { padding: "14px 24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 10 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px" },
  input: { padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13.5, color: "#111827", outline: "none", background: "#ffffff", width: "100%", boxSizing: "border-box" },
  primaryBtn: { padding: "9px 20px", borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  outlineBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", fontSize: 13, color: "#374151", cursor: "pointer" },
  cancelBtn: { padding: "9px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "none", color: "#374151", fontSize: 13.5, cursor: "pointer" },
  iconBtn: { border: "none", background: "none", cursor: "pointer", color: "#9ca3af", padding: 4, display: "flex", alignItems: "center", borderRadius: 4 },
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function FolderIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>; }
function FolderPlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>; }
function LockIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>; }
function KeyIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>; }
function DotsHIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>; }
function EditIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function EyeIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EyeOffIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>; }
function CopyIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>; }
function UploadIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>; }
function UploadSmIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>; }
function LinkIcon({ size = 16 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>; }
function PlusIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function NoteIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function ArrowLeftIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>; }
function ChevronRightIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }

// Service-specific colored icons
function GDocIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="#1a73e8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6" fill="none" stroke="#1a73e8" strokeWidth="1"/><line x1="8" y1="13" x2="16" y2="13" stroke="white" strokeWidth="1.5"/><line x1="8" y1="16" x2="16" y2="16" stroke="white" strokeWidth="1.5"/><line x1="8" y1="10" x2="12" y2="10" stroke="white" strokeWidth="1.5"/></svg>; }
function GSheetIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="#0f9d58"><rect width="24" height="24" rx="2" fill="#0f9d58"/><rect x="4" y="5" width="16" height="2" fill="white" opacity="0.8"/><rect x="4" y="9" width="16" height="2" fill="white" opacity="0.8"/><rect x="4" y="13" width="16" height="2" fill="white" opacity="0.8"/><rect x="4" y="17" width="10" height="2" fill="white" opacity="0.8"/></svg>; }
function GSlidesIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="#f4b400"><rect width="24" height="24" rx="2" fill="#f4b400"/><rect x="3" y="5" width="18" height="14" rx="1" fill="white" opacity="0.3"/><rect x="6" y="8" width="12" height="1.5" fill="white"/><rect x="6" y="11" width="8" height="1.5" fill="white"/></svg>; }
function GDriveIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="#4285f4"><polygon points="12,2 22,20 2,20" fill="none" stroke="#4285f4" strokeWidth="2"/><line x1="7" y1="20" x2="17" y2="20" stroke="#0f9d58" strokeWidth="3"/><line x1="12" y1="2" x2="7" y2="20" stroke="#f4b400" strokeWidth="2"/></svg>; }
function ExcelIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="#217346"><rect width="24" height="24" rx="2" fill="#217346"/><text x="4" y="17" fontSize="12" fontWeight="bold" fill="white">X</text></svg>; }
function WordIcon() { return <svg width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="2" fill="#2b579a"/><text x="4" y="17" fontSize="12" fontWeight="bold" fill="white">W</text></svg>; }
function MSIcon() { return <svg width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="2" fill="#0078d4"/><text x="5" y="17" fontSize="11" fontWeight="bold" fill="white">MS</text></svg>; }
function CsvIcon() { return <svg width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="2" fill="#0f9d58"/><text x="2" y="17" fontSize="10" fontWeight="bold" fill="white">CSV</text></svg>; }
function PdfIcon() { return <svg width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="2" fill="#ea4335"/><text x="2" y="17" fontSize="10" fontWeight="bold" fill="white">PDF</text></svg>; }
