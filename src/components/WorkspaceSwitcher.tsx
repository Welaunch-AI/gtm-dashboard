"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AvatarImage from "@/components/ui/AvatarImage";
import ImageUploadField from "@/components/ui/ImageUploadField";
import { fileExt, storagePathFromPublicUrl } from "@/lib/storage-images";

type Org = { id: string; name: string; slug: string; logo_url?: string | null };

type Props = {
  orgs: Org[];
  currentOrg: Org | null;
  isAdmin: boolean;
  placement?: "topbar" | "sidebar";
};

export default function WorkspaceSwitcher({ orgs, currentOrg, isAdmin, placement = "topbar" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "create" | "edit" | "delete">("menu");
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMode("menu");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function slugify(v: string) {
    return v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  // Use a hard navigation (window.location) rather than router.push for
  // workspace switches. The router's client-side cache can otherwise keep
  // showing the previous workspace's layout/data after navigating, so a full
  // reload guarantees the new org's data and label are always fresh.
  function goTo(path: string) {
    window.location.href = path;
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const slug = newSlug.trim() || slugify(newName);
    const { data, error: err } = await supabase
      .from("organisations")
      .insert({ name: newName.trim(), slug })
      .select()
      .single();
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data) goTo(`/workspace/${data.slug || data.id}`);
    else router.refresh();
  }

  async function handleEdit() {
    if (!currentOrg || !newName.trim()) return;
    setLoading(true);
    setError("");
    const supabase = createClient();
    const slug = newSlug.trim() || slugify(newName);
    const { error: err } = await supabase
      .from("organisations")
      .update({ name: newName.trim(), slug })
      .eq("id", currentOrg.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    goTo(`/workspace/${slug}`);
  }

  async function handleDelete() {
    if (!currentOrg) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("organisations").delete().eq("id", currentOrg.id);
    setLoading(false);
    goTo("/admin");
  }

  function openEdit() {
    setNewName(currentOrg?.name ?? "");
    setNewSlug(currentOrg?.slug ?? "");
    setLogoUrl(currentOrg?.logo_url ?? null);
    setMode("edit");
  }

  async function removeOldLogo(url: string | null) {
    if (!url) return;
    const path = storagePathFromPublicUrl(url, "org-logos");
    if (!path) return;
    await createClient().storage.from("org-logos").remove([path]);
  }

  async function uploadLogo(file: File) {
    if (!currentOrg || !isAdmin) return;
    setUploadingLogo(true);
    setError("");
    const supabase = createClient();
    const path = `${currentOrg.id}/${Date.now()}.${fileExt(file)}`;
    const { error: uploadErr } = await supabase.storage.from("org-logos").upload(path, file, { upsert: true });
    if (uploadErr) {
      setUploadingLogo(false);
      throw new Error(uploadErr.message);
    }
    const { data: { publicUrl } } = supabase.storage.from("org-logos").getPublicUrl(path);
    const { error: updateErr } = await supabase
      .from("organisations")
      .update({ logo_url: publicUrl })
      .eq("id", currentOrg.id);
    if (updateErr) {
      setUploadingLogo(false);
      throw new Error(updateErr.message);
    }
    await removeOldLogo(logoUrl);
    setLogoUrl(publicUrl);
    setUploadingLogo(false);
    router.refresh();
  }

  async function removeLogo() {
    if (!currentOrg || !isAdmin) return;
    setUploadingLogo(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase
      .from("organisations")
      .update({ logo_url: null })
      .eq("id", currentOrg.id);
    if (error) {
      setUploadingLogo(false);
      throw new Error(error.message);
    }
    await removeOldLogo(logoUrl);
    setLogoUrl(null);
    setUploadingLogo(false);
    router.refresh();
  }

  function close() { setOpen(false); setMode("menu"); }

  const label = currentOrg ? currentOrg.name : "All Workspaces";
  const currentLogo = mode === "edit" ? logoUrl : currentOrg?.logo_url ?? null;
  const inTopbar = placement === "topbar";

  function OrgBadge({ org, size = 28, radius = 7 }: { org: Org | null; size?: number; radius?: number | string }) {
    if (!org) {
      return (
        <AvatarImage
          src={null}
          label="All Workspaces"
          size={size}
          radius={radius}
          background="#111827"
        />
      );
    }
    return (
      <AvatarImage
        src={org.logo_url}
        label={org.name}
        size={size}
        radius={radius}
        background="#111827"
      />
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", padding: inTopbar ? 0 : "10px 10px 8px" }}>
      {/* Trigger — full-width button at top of sidebar */}
      <button
        onClick={() => { setOpen(!open); setMode("menu"); }}
        style={{ ...S.trigger, width: "100%" }}
      >
        <OrgBadge org={currentOrg ? { ...currentOrg, logo_url: currentLogo } : null} size={28} radius={7} />
        <div style={S.triggerText}>
          <span style={S.triggerLabel}>{label}</span>
          {isAdmin && (
            <span style={S.triggerSub}>{currentOrg ? "Viewing as admin" : "Agency view"}</span>
          )}
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          style={{
            ...S.dropdown,
            left: 0,
            right: inTopbar ? "auto" : 10,
            width: inTopbar ? 260 : "auto",
            minWidth: inTopbar ? 260 : 210,
          }}
        >
          {mode === "menu" && (
            <>
              {/* Current context header */}
              <div style={S.dropdownHeader}>
                <OrgBadge org={currentOrg ? { ...currentOrg, logo_url: currentLogo } : null} size={32} radius={8} />
                <div>
                  <p style={S.headerName}>{label}</p>
                  {isAdmin && <p style={S.headerRole}>{currentOrg ? "Client workspace" : "Agency view"}</p>}
                </div>
              </div>
              <div style={S.divider} />

              {/* Switch workspace list */}
              {isAdmin && orgs.length > 0 && (
                <div style={S.section}>
                  <span style={S.sectionLabel}>Switch workspace</span>
                  {/* Admin home */}
                  <button
                    onClick={() => { close(); goTo("/admin"); }}
                    style={{ ...S.item, ...(currentOrg === null ? S.itemActive : {}) }}
                  >
                    <span style={{ ...S.orgDot, background: "#111827" }}>A</span>
                    <span style={S.itemLabel}>All Workspaces</span>
                    {currentOrg === null && <CheckIcon />}
                  </button>
                  {orgs.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => { close(); goTo(`/workspace/${o.slug || o.id}`); }}
                      style={{ ...S.item, ...(currentOrg?.id === o.id ? S.itemActive : {}) }}
                    >
                      <OrgBadge org={o} size={22} radius={5} />
                      <span style={S.itemLabel}>{o.name}</span>
                      {currentOrg?.id === o.id && <CheckIcon />}
                    </button>
                  ))}
                </div>
              )}

              {isAdmin && <div style={S.divider} />}

              {/* Actions */}
              <div style={S.section}>
                {isAdmin && (
                  <button
                    onClick={() => { setNewName(""); setNewSlug(""); setMode("create"); }}
                    style={S.actionItem}
                  >
                    <PlusIcon /> Create workspace
                  </button>
                )}
                {currentOrg && isAdmin && (
                  <button onClick={openEdit} style={S.actionItem}>
                    <EditIcon /> Edit workspace
                  </button>
                )}
                {currentOrg && isAdmin && (
                  <button onClick={() => setMode("delete")} style={{ ...S.actionItem, ...S.actionDanger }}>
                    <TrashIcon /> Delete workspace
                  </button>
                )}
                {!isAdmin && currentOrg && (
                  <div style={{ padding: "8px 10px" }}>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                      {currentOrg.name}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {(mode === "create" || mode === "edit") && (
            <div style={S.formPanel}>
              <p style={S.formTitle}>{mode === "create" ? "New workspace" : `Edit: ${currentOrg?.name}`}</p>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (mode === "create" ? handleCreate() : handleEdit())}
                placeholder="Workspace name"
                style={S.input}
              />
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(slugify(e.target.value))}
                placeholder={`Slug: ${slugify(newName) || "auto-generated"}`}
                style={S.input}
              />
              {mode === "edit" && isAdmin && currentOrg && (
                <ImageUploadField
                  imageUrl={logoUrl}
                  label={newName || currentOrg.name}
                  size={56}
                  radius={10}
                  background="#111827"
                  uploading={uploadingLogo}
                  helperText="Workspace logo. Visible to everyone in this workspace. Only admins can change it."
                  uploadLabel="Upload logo"
                  removeLabel="Remove logo"
                  onUpload={uploadLogo}
                  onRemove={removeLogo}
                />
              )}
              {error && <p style={S.errText}>{error}</p>}
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button onClick={() => setMode("menu")} style={S.cancelBtn}>Cancel</button>
                <button
                  onClick={mode === "create" ? handleCreate : handleEdit}
                  disabled={loading || !newName.trim()}
                  style={{ ...S.confirmBtn, opacity: loading || !newName.trim() ? 0.5 : 1 }}
                >
                  {loading ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
                </button>
              </div>
            </div>
          )}

          {mode === "delete" && (
            <div style={S.formPanel}>
              <p style={S.formTitle}>Delete workspace?</p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.5 }}>
                This will permanently delete <strong>{currentOrg?.name}</strong> and cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setMode("menu")} style={S.cancelBtn}>Cancel</button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  style={{ ...S.confirmBtn, background: "#ef4444", opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  trigger: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "7px 10px",
    borderRadius: 9,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    cursor: "pointer",
    color: "#374151",
    textAlign: "left",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "white",
    flexShrink: 0,
  },
  triggerText: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 1,
    minWidth: 0,
  },
  triggerLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  },
  triggerSub: {
    fontSize: 10.5,
    color: "#9ca3af",
    display: "block",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 10,
    right: 10,
    minWidth: 210,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
    zIndex: 200,
    overflow: "hidden",
    padding: "6px 0",
  },
  dropdownHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px 10px",
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    color: "white",
    flexShrink: 0,
  },
  headerName: { fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 },
  headerRole: { fontSize: 11, color: "#9ca3af", margin: "2px 0 0" },
  divider: { height: 1, background: "#f3f4f6", margin: "4px 0" },
  section: { padding: "4px 6px" },
  sectionLabel: {
    display: "block",
    fontSize: 10.5,
    fontWeight: 600,
    color: "#9ca3af",
    letterSpacing: "0.7px",
    textTransform: "uppercase",
    padding: "4px 8px 2px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "7px 10px",
    borderRadius: 8,
    border: "none",
    background: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  itemActive: { background: "#f3f4f6" },
  itemLabel: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  orgDot: {
    width: 22,
    height: 22,
    borderRadius: 5,
    background: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#374151",
    flexShrink: 0,
  },
  actionItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "7px 10px",
    borderRadius: 8,
    border: "none",
    background: "none",
    color: "#6b7280",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  },
  actionDanger: { color: "#dc2626" },
  formPanel: { padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 },
  formTitle: { fontSize: 13.5, fontWeight: 600, color: "#111827", margin: 0 },
  input: {
    padding: "8px 10px",
    borderRadius: 7,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  errText: { fontSize: 12, color: "#dc2626", margin: 0 },
  cancelBtn: {
    flex: 1,
    padding: "7px",
    borderRadius: 7,
    border: "1px solid #e5e7eb",
    background: "none",
    color: "#6b7280",
    fontSize: 13,
    cursor: "pointer",
  },
  confirmBtn: {
    flex: 1,
    padding: "7px",
    borderRadius: 7,
    border: "none",
    background: "#111827",
    color: "white",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="#9ca3af" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function CheckIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto", flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>;
}
function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
}
