"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  email: string;
  fullName: string | null;
  role: "admin" | "client";
  orgId: string | null;
  orgs: { id: string; name: string; slug: string }[];
}

interface ClientUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  org_id: string | null;
}

interface Invite {
  id: string;
  token: string;
  email: string;
  full_name: string | null;
  org_id: string | null;
  role: string;
  expired: boolean;
  link: string;
  created_at: string;
}

// ─── Shared small components ──────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #f3f4f6" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: "#6b7280", margin: "3px 0 0" }}>{subtitle}</p>}
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

function PwInput({ value, onChange, placeholder, onEnter }: { value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••"}
        onKeyDown={e => { if (e.key === "Enter" && onEnter) onEnter(); }}
        style={{ ...inputStyle, paddingRight: 40 }}
      />
      <button type="button" onClick={() => setShow(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 2 }} title={show ? "Hide" : "Show"}>
        {show
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  );
}

function AdminPwInput({ value, onChange, onEnter, onEscape }: { value: string; onChange: (v: string) => void; onEnter?: () => void; onEscape?: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <input
        autoFocus
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && onEnter) onEnter(); if (e.key === "Escape" && onEscape) onEscape(); }}
        placeholder="New password (min 8)"
        style={{ ...inputStyle, width: 160, fontSize: 13, paddingRight: 36 }}
      />
      <button type="button" onClick={() => setShow(v => !v)} style={{ position: "absolute", right: 8, border: "none", background: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 2 }} title={show ? "Hide" : "Show"}>
        {show
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #e5e7eb", fontSize: 14, color: "#111827",
  outline: "none", boxSizing: "border-box", background: "#fff",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 20px", borderRadius: 8, border: "none",
  background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
  background: "#fff", color: "#6b7280", fontSize: 13, cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca",
  background: "#fff", color: "#dc2626", fontSize: 13, cursor: "pointer",
};

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      padding: "12px 18px", borderRadius: 10,
      background: type === "success" ? "#111827" : "#ef4444",
      color: "#fff", fontSize: 13, fontWeight: 500,
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    }}>{msg}</div>
  );
}

// ─── Own profile section ──────────────────────────────────────────────────────

function OwnProfile({ userId, email, fullName }: { userId: string; email: string; fullName: string | null }) {
  const [name, setName] = useState(fullName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveName() {
    setSavingName(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() || null }).eq("id", userId);
    setSavingName(false);
    if (error) showToast(error.message, "error");
    else showToast("Name updated.", "success");
  }

  async function savePassword() {
    if (newPw !== confirmPw) { showToast("Passwords don't match.", "error"); return; }
    if (newPw.length < 8) { showToast("Password must be at least 8 characters.", "error"); return; }
    setSavingPw(true);
    const supabase = createClient();
    // Re-authenticate with current password first
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: currentPw });
    if (signInErr) { setSavingPw(false); showToast("Current password is incorrect.", "error"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) showToast(error.message, "error");
    else {
      showToast("Password changed.", "success");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Avatar initials
  const initials = name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : email.slice(0, 2).toUpperCase();

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Avatar */}
      <Section title="Profile" subtitle="Your public display name and avatar.">
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "#111827",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>{initials}</div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 }}>{name || email}</p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "2px 0 0" }}>{email}</p>
          </div>
        </div>
        <Field label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" style={{ ...inputStyle, maxWidth: 360 }} />
        </Field>
        <button onClick={saveName} disabled={savingName} style={{ ...btnPrimary, opacity: savingName ? 0.5 : 1 }}>
          {savingName ? "Saving…" : "Save name"}
        </button>
      </Section>

      {/* Password */}
      <Section title="Change password" subtitle="Enter your current password to set a new one.">
        <div style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 0 }}>
          <Field label="Current password">
            <PwInput value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
          </Field>
          <Field label="New password">
            <PwInput value={newPw} onChange={setNewPw} placeholder="Min. 8 characters" />
          </Field>
          <Field label="Confirm new password">
            <PwInput value={confirmPw} onChange={setConfirmPw} placeholder="Repeat new password" onEnter={savePassword} />
          </Field>
        </div>
        <button onClick={savePassword} disabled={savingPw || !currentPw || !newPw || !confirmPw}
          style={{ ...btnPrimary, opacity: savingPw || !currentPw || !newPw || !confirmPw ? 0.5 : 1 }}>
          {savingPw ? "Updating…" : "Update password"}
        </button>
      </Section>

      {/* Sign out */}
      <Section title="Sign out" subtitle="Sign out of this device.">
        <button onClick={handleSignOut} style={btnDanger}>Sign out</button>
      </Section>
    </>
  );
}

// ─── User row in admin panel ──────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 7, border: "1px solid #e5e7eb",
  fontSize: 12.5, color: "#374151", background: "#fff", cursor: "pointer", fontWeight: 500,
};

function UserRow({
  user,
  orgs,
  isSelf,
  onPasswordChange,
  onRoleOrgChange,
  onDelete,
}: {
  user: ClientUser;
  orgs: { id: string; name: string }[];
  isSelf: boolean;
  onPasswordChange: (userId: string, newPw: string) => Promise<void>;
  onRoleOrgChange: (userId: string, updates: { role?: "admin" | "client"; org_id?: string | null }) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}) {
  const [showPw, setShowPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  async function save() {
    if (newPw.length < 8) return;
    setSaving(true);
    await onPasswordChange(user.id, newPw);
    setSaving(false);
    setNewPw("");
    setShowPw(false);
  }

  async function handleRoleChange(role: "admin" | "client") {
    setUpdating(true);
    await onRoleOrgChange(user.id, { role, org_id: role === "admin" ? null : user.org_id });
    setUpdating(false);
  }

  async function handleOrgChange(orgId: string) {
    setUpdating(true);
    await onRoleOrgChange(user.id, { org_id: orgId || null });
    setUpdating(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid #f3f4f6", flexWrap: "wrap" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", background: user.role === "admin" ? "#ede9fe" : "#e5e7eb",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, color: user.role === "admin" ? "#7c3aed" : "#374151", flexShrink: 0,
      }}>{initials}</div>

      <div style={{ flex: 1, minWidth: 140 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>
          {user.full_name || user.email}{isSelf && <span style={{ color: "#9ca3af", fontWeight: 400 }}> (you)</span>}
        </p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "1px 0 0" }}>{user.email}</p>
      </div>

      <select
        value={user.role}
        disabled={isSelf || updating}
        onChange={(e) => handleRoleChange(e.target.value as "admin" | "client")}
        style={{ ...selectStyle, opacity: isSelf ? 0.6 : 1, cursor: isSelf ? "not-allowed" : "pointer" }}
        title={isSelf ? "You can't change your own role" : "Change role"}
      >
        <option value="client">Client</option>
        <option value="admin">Admin</option>
      </select>

      <select
        value={user.org_id ?? ""}
        disabled={user.role === "admin" || updating}
        onChange={(e) => handleOrgChange(e.target.value)}
        style={{ ...selectStyle, opacity: user.role === "admin" ? 0.5 : 1, cursor: user.role === "admin" ? "not-allowed" : "pointer", minWidth: 130 }}
        title={user.role === "admin" ? "Admins aren't scoped to a workspace" : "Change workspace"}
      >
        <option value="">No workspace</option>
        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>

      {showPw ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <AdminPwInput
            value={newPw}
            onChange={setNewPw}
            onEnter={save}
            onEscape={() => { setShowPw(false); setNewPw(""); }}
          />
          <button onClick={save} disabled={saving || newPw.length < 8}
            style={{ ...btnPrimary, padding: "7px 14px", fontSize: 12, opacity: saving || newPw.length < 8 ? 0.5 : 1 }}>
            {saving ? "…" : "Save"}
          </button>
          <button onClick={() => { setShowPw(false); setNewPw(""); }} style={{ ...btnSecondary, padding: "7px 10px", fontSize: 12 }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowPw(true)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>Change password</button>
          {!isSelf && <button onClick={() => onDelete(user.id)} style={{ ...btnDanger, fontSize: 12, padding: "6px 12px" }}>Remove</button>}
        </div>
      )}
    </div>
  );
}

// ─── Admin user management panel ─────────────────────────────────────────────

function AdminUserPanel({ orgs, currentUserId }: { orgs: { id: string; name: string; slug: string }[]; currentUserId: string }) {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOrg, setFilterOrg] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{ email: string; full_name: string; org_id: string; role: "admin" | "client" }>({
    email: "", full_name: "", org_id: orgs[0]?.id ?? "", role: "client",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const hasFetched = useRef(false);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchAll() {
    setLoading(true);
    const usersUrl = filterOrg !== "all" ? `/api/admin/users?orgId=${filterOrg}` : "/api/admin/users";
    const invitesUrl = filterOrg !== "all" ? `/api/admin/invites?orgId=${filterOrg}` : "/api/admin/invites";
    const [usersRes, invitesRes] = await Promise.all([fetch(usersUrl), fetch(invitesUrl)]);
    const usersData = await usersRes.json();
    const invitesData = await invitesRes.json();
    setUsers(usersData.users ?? []);
    setInvites(invitesData.invites ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filter changes
  const prevFilter = useRef(filterOrg);
  useEffect(() => {
    if (prevFilter.current !== filterOrg) {
      prevFilter.current = filterOrg;
      hasFetched.current = false;
      fetchAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOrg]);

  async function handleCreate() {
    if (!form.email) { setCreateError("Email is required."); return; }
    setCreating(true); setCreateError(""); setGeneratedLink(null);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateError(data.error ?? "Failed to create invite."); return; }
    setGeneratedLink(data.invite.link);
    setInvites((p) => [data.invite, ...p]);
  }

  function resetCreateForm() {
    setShowCreate(false);
    setCreateError("");
    setGeneratedLink(null);
    setForm({ email: "", full_name: "", org_id: orgs[0]?.id ?? "", role: "client" });
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function revokeInvite(inviteId: string) {
    if (!confirm("Revoke this invite link? It will no longer work.")) return;
    const res = await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    if (res.ok) { setInvites((p) => p.filter((i) => i.id !== inviteId)); showToast("Invite revoked.", "success"); }
    else { const d = await res.json(); showToast(d.error ?? "Failed.", "error"); }
  }

  async function handlePasswordChange(userId: string, newPw: string) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password: newPw }),
    });
    if (res.ok) showToast("Password updated.", "success");
    else { const d = await res.json(); showToast(d.error ?? "Failed.", "error"); }
  }

  async function handleRoleOrgChange(userId: string, updates: { role?: "admin" | "client"; org_id?: string | null }) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...updates }),
    });
    if (res.ok) {
      setUsers((p) => p.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
      showToast("Updated.", "success");
    } else {
      const d = await res.json();
      showToast(d.error ?? "Failed.", "error");
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Remove this user? They will no longer be able to log in.")) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) { setUsers((p) => p.filter((u) => u.id !== userId)); showToast("User removed.", "success"); }
    else { const d = await res.json(); showToast(d.error ?? "Failed.", "error"); }
  }

  const filteredUsers = filterOrg === "all" ? users : users.filter((u) => u.org_id === filterOrg);
  const filteredInvites = filterOrg === "all" ? invites : invites.filter((i) => i.org_id === filterOrg);

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <Section title="Client accounts" subtitle="Send a magic invite link — the client sets their own password, no email or password to hand over.">
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <select
            value={filterOrg}
            onChange={(e) => setFilterOrg(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", background: "#fff", cursor: "pointer" }}
          >
            <option value="all">All workspaces</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>{filteredUsers.length} account{filteredUsers.length !== 1 ? "s" : ""}</span>
          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => (showCreate ? resetCreateForm() : setShowCreate(true))} style={{ ...btnPrimary, display: "flex", gap: 6, alignItems: "center" }}>
              <PlusIcon /> Invite user
            </button>
          </div>
        </div>

        {/* Create/invite form */}
        {showCreate && (
          <div style={{
            background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10,
            padding: "16px 18px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 12,
          }}>
            {!generatedLink ? (
              <>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>Invite a new user</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "-6px 0 0" }}>
                  We&apos;ll pre-fill their name and email — they just pick a password.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Full name</label>
                    <input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                      placeholder="Jane Smith" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="jane@client.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Role</label>
                    <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as "admin" | "client" }))}
                      style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="client">Client</option>
                      <option value="admin">Admin (agency team)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Workspace</label>
                    <select value={form.org_id} onChange={(e) => setForm((p) => ({ ...p, org_id: e.target.value }))}
                      disabled={form.role === "admin"}
                      style={{ ...inputStyle, cursor: form.role === "admin" ? "not-allowed" : "pointer", opacity: form.role === "admin" ? 0.5 : 1 }}>
                      <option value="">No workspace</option>
                      {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    {form.role === "admin" && <p style={{ fontSize: 11, color: "#9ca3af", margin: "5px 0 0" }}>Admins see every workspace — no assignment needed.</p>}
                  </div>
                </div>
                {createError && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>{createError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={resetCreateForm} style={btnSecondary}>Cancel</button>
                  <button onClick={handleCreate} disabled={creating} style={{ ...btnPrimary, opacity: creating ? 0.5 : 1 }}>
                    {creating ? "Generating…" : "Generate invite link"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>Invite link ready</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "-6px 0 0" }}>
                  Send this link to {form.email}. It expires in 14 days and can only be used once.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input readOnly value={generatedLink} onFocus={(e) => e.target.select()}
                    style={{ ...inputStyle, fontSize: 12.5, color: "#374151" }} />
                  <button onClick={() => copyLink(generatedLink)} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={resetCreateForm} style={btnSecondary}>Done</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Pending invites */}
        {!loading && filteredInvites.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
              Pending invites
            </p>
            {filteredInvites.map((inv) => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: "#fef3c7",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}><ClockIcon /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>
                    {inv.full_name || inv.email}
                    {inv.expired && <span style={{ marginLeft: 8, fontSize: 11, color: "#dc2626", fontWeight: 700 }}>EXPIRED</span>}
                  </p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "1px 0 0" }}>
                    {inv.email} · {inv.role === "admin" ? "Admin" : orgs.find((o) => o.id === inv.org_id)?.name ?? "No workspace"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => copyLink(inv.link)} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>Copy link</button>
                  <button onClick={() => revokeInvite(inv.id)} style={{ ...btnDanger, fontSize: 12, padding: "6px 12px" }}>Revoke</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* User list */}
        {loading ? (
          <p style={{ fontSize: 13, color: "#9ca3af", padding: "12px 0" }}>Loading accounts…</p>
        ) : filteredUsers.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af", padding: "12px 0" }}>No client accounts yet. Invite one above.</p>
        ) : (
          <div>
            {filteredUsers.map((u) => (
              <UserRow
                key={u.id} user={u} orgs={orgs}
                isSelf={u.id === currentUserId}
                onPasswordChange={handlePasswordChange}
                onRoleOrgChange={handleRoleOrgChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────

export default function ProfilePage({ userId, email, fullName, role, orgId: _orgId, orgs }: Props) {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Profile & Settings</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Manage your account and, if you&apos;re an admin, your team&apos;s access.</p>
      </div>

      <OwnProfile userId={userId} email={email} fullName={fullName} />

      {role === "admin" && <AdminUserPanel orgs={orgs} currentUserId={userId} />}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function ClockIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
