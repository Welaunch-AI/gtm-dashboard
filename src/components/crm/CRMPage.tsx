"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { logActivity } from "@/lib/logActivity";
import { EMPTY_VALUE, formatDateEST, formatDateTimeEST, formatDateTimeOrdinalEST, cleanScheduledLabel } from "@/lib/datetime";

// ─── Custom field types ───────────────────────────────────────────────────────

export interface CustomFieldDef {
  id: string;
  org_id: string | null;
  mode: "demo" | "contacts";
  name: string;
  field_type: "text" | "textarea" | "number" | "select" | "date" | "checkbox";
  options: string[];
  position: number;
  created_at: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export type CRMMode = "demo" | "contacts";

const DEMO_STATUSES = ["New", "Contacted", "Demo Booked", "Won", "Lost"];
const DEMO_CALL_STATUSES = ["Scheduled", "No Show", "Call Done", "Rescheduled", "N/A", "Need to Update"];
const CONTACT_STATUSES = ["Lead", "Customer", "Partner", "Vendor", "Other"];
const LEAD_SOURCES = ["Website", "Referral", "LinkedIn", "Cold Outreach", "Event", "Other"];
const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Retail", "Manufacturing", "Education", "Real Estate", "Other"];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  New:          { bg: "#eff6ff", color: "#2563eb" },
  Contacted:    { bg: "#fef3c7", color: "#d97706" },
  "Demo Booked":{ bg: "#f0fdf4", color: "#15803d" },
  Won:          { bg: "#dcfce7", color: "#16a34a" },
  Lost:         { bg: "#fee2e2", color: "#dc2626" },
  "No Show":    { bg: "#fee2e2", color: "#dc2626" },
  "Call Done":  { bg: "#dcfce7", color: "#16a34a" },
  Rescheduled:  { bg: "#fef3c7", color: "#d97706" },
  "N/A":        { bg: "#f3f4f6", color: "#6b7280" },
  "Need to Update": { bg: "#eff6ff", color: "#2563eb" },
  Scheduled:    { bg: "#eff6ff", color: "#2563eb" },
  Lead:         { bg: "#eff6ff", color: "#2563eb" },
  Customer:     { bg: "#dcfce7", color: "#16a34a" },
  Partner:      { bg: "#faf5ff", color: "#7c3aed" },
  Vendor:       { bg: "#fff7ed", color: "#ea580c" },
  Other:        { bg: "#f3f4f6", color: "#6b7280" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  org_id: string | null;
  record_type: string;
  custom_fields: Record<string, unknown>;
  company: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  lead_source: string | null;
  tags: string[] | null;
  industry: string | null;
  deal_size: string | null;
  scheduled_at: string | null;
  demo_status: string | null;
  remarks: string | null;
  campaign: string | null;
  call_taken_by: string | null;
  comments: string | null;
  ai_memory: string | null;
  scheduled_label: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  contact_id: string;
  author_name: string | null;
  author_role: string | null;
  content: string;
  created_at: string;
}

interface ColDef {
  key: keyof Contact | string;
  label: string;
  width: number;
  visible: boolean;
}

interface Props {
  mode: CRMMode;
  orgId: string | null;
  isAdmin: boolean;
  userName: string;
  userRole: string;
  userId: string;
  customFieldDefs?: CustomFieldDef[];
}

// ─── Column definitions ───────────────────────────────────────────────────────

function getDefaultCols(mode: CRMMode): ColDef[] {
  const base: ColDef[] = [
    { key: "company",         label: "Company",          width: 160, visible: true },
    { key: "contact_name",    label: "Contact",          width: 140, visible: true },
    { key: "lead_source",     label: "Lead source",      width: 130, visible: true },
    { key: "phone",           label: "Phone",            width: 130, visible: true },
    { key: "email",           label: "Email",            width: 180, visible: true },
    { key: "status",          label: "Status",           width: 130, visible: true },
    { key: "tags",            label: "Tags",             width: 140, visible: true },
    { key: "last_activity_at",label: "Last activity",    width: 130, visible: true },
    { key: "industry",        label: "Industry",         width: 130, visible: true },
    { key: "deal_size",       label: "Deal size",        width: 110, visible: true },
  ];
  if (mode === "demo") {
    return [
      { key: "contact_name",    label: "Name",              width: 140, visible: true },
      { key: "scheduled_label", label: "Scheduled On",      width: 180, visible: true },
      { key: "campaign",        label: "Campaign",          width: 160, visible: true },
      { key: "demo_status",     label: "Status",            width: 120, visible: true },
      { key: "call_taken_by",   label: "Call Taken By",     width: 120, visible: true },
      { key: "comments",        label: "Comments",          width: 200, visible: true },
      { key: "remarks",         label: "Remarks",           width: 160, visible: true },
      { key: "ai_memory",       label: "AI Memory",         width: 180, visible: false },
      { key: "status",          label: "Pipeline",          width: 120, visible: false },
      { key: "phone",           label: "Phone",             width: 130, visible: false },
      { key: "email",           label: "Email",             width: 180, visible: false },
      { key: "lead_source",     label: "Lead source",       width: 130, visible: false },
      { key: "tags",            label: "Tags",              width: 140, visible: false },
      { key: "scheduled_at",    label: "Scheduled (ET)",    width: 150, visible: false },
      { key: "last_activity_at",label: "Last activity",     width: 130, visible: false },
    ];
  }
  return base;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return EMPTY_VALUE;
  return formatDateEST(iso);
}
function fmtDateTime(iso: string | null) {
  if (!iso) return EMPTY_VALUE;
  return formatDateTimeOrdinalEST(iso);
}
function fmtScheduledLabel(label: string | null, iso: string | null): string {
  if (label) return cleanScheduledLabel(label);
  if (!iso) return EMPTY_VALUE;
  return formatDateTimeOrdinalEST(iso);
}

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: "#9ca3af", fontSize: 13 }}>{EMPTY_VALUE}</span>;
  const c = STATUS_COLORS[value] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: c.bg, color: c.color, whiteSpace: "nowrap",
    }}>{value}</span>
  );
}

function TagChips({ tags }: { tags: string[] | null }) {
  if (!tags || tags.length === 0) return <span style={{ color: "#9ca3af", fontSize: 13 }}>{EMPTY_VALUE}</span>;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {tags.slice(0, 3).map((t) => (
        <span key={t} style={{
          padding: "1px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb",
        }}>{t}</span>
      ))}
      {tags.length > 3 && <span style={{ fontSize: 11, color: "#9ca3af" }}>+{tags.length - 3}</span>}
    </div>
  );
}

function cellValue(contact: Contact, col: ColDef): React.ReactNode {
  const val = contact[col.key as keyof Contact];
  if (col.key === "status") return <StatusBadge value={contact.status} />;
  if (col.key === "demo_status") return <StatusBadge value={contact.demo_status} />;
  if (col.key === "tags") return <TagChips tags={contact.tags} />;
  if (col.key === "last_activity_at") return <span style={{ fontSize: 13, color: "#6b7280" }}>{fmtDate(contact.last_activity_at)}</span>;
  if (col.key === "scheduled_at") return <span style={{ fontSize: 13 }}>{fmtDateTime(contact.scheduled_at)}</span>;
  if (col.key === "scheduled_label") return <span style={{ fontSize: 13, whiteSpace: "pre-line" }}>{fmtScheduledLabel(contact.scheduled_label, contact.scheduled_at)}</span>;
  if (col.key === "comments" || col.key === "remarks" || col.key === "ai_memory" || col.key === "campaign") {
    const text = String(val ?? "");
    if (!text) return <span style={{ color: "#d1d5db", fontSize: 13 }}>{EMPTY_VALUE}</span>;
    return <span style={{ fontSize: 13, color: "#374151" }} title={text}>{text.length > 80 ? text.slice(0, 80) + "…" : text}</span>;
  }
  if (!val) return <span style={{ color: "#d1d5db", fontSize: 13 }}>{EMPTY_VALUE}</span>;
  return <span style={{ fontSize: 13, color: "#374151" }}>{String(val)}</span>;
}

// ─── Custom Field Manager ─────────────────────────────────────────────────────

const CF_TYPES: { value: CustomFieldDef["field_type"]; label: string }[] = [
  { value: "text",     label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number",   label: "Number" },
  { value: "select",   label: "Dropdown" },
  { value: "date",     label: "Date" },
  { value: "checkbox", label: "Checkbox (Yes/No)" },
];

function CustomFieldManager({ mode, orgId, defs, onClose, onChanged }: {
  mode: CRMMode; orgId: string | null;
  defs: CustomFieldDef[];
  onClose: () => void;
  onChanged: (defs: CustomFieldDef[]) => void;
}) {
  const confirm = useConfirm();
  const [list, setList] = useState<CustomFieldDef[]>(defs);
  const [editing, setEditing] = useState<CustomFieldDef | null>(null);
  const [creating, setCreating] = useState(false);

  const blank = (): Omit<CustomFieldDef, "id" | "created_at"> => ({
    org_id: orgId, mode, name: "", field_type: "text", options: [], position: list.length,
  });
  const [form, setForm] = useState(blank());
  const [optionInput, setOptionInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startCreate() {
    setForm(blank());
    setOptionInput("");
    setEditing(null);
    setCreating(true);
    setError("");
  }

  function startEdit(def: CustomFieldDef) {
    setForm({ org_id: def.org_id, mode: def.mode, name: def.name, field_type: def.field_type, options: [...def.options], position: def.position });
    setOptionInput("");
    setEditing(def);
    setCreating(true);
    setError("");
  }

  async function save() {
    if (!form.name.trim()) { setError("Field name is required."); return; }
    setSaving(true);
    const sb = createClient();
    if (editing) {
      const { data, error: e } = await sb.from("crm_custom_field_defs")
        .update({ name: form.name.trim(), field_type: form.field_type, options: form.options, position: form.position })
        .eq("id", editing.id).select().single();
      if (e) { setError(e.message); setSaving(false); return; }
      const next = list.map(d => d.id === editing.id ? data as CustomFieldDef : d);
      setList(next); onChanged(next);
    } else {
      const { data, error: e } = await sb.from("crm_custom_field_defs")
        .insert({ org_id: orgId, mode, name: form.name.trim(), field_type: form.field_type, options: form.options, position: form.position })
        .select().single();
      if (e) { setError(e.message); setSaving(false); return; }
      const next = [...list, data as CustomFieldDef];
      setList(next); onChanged(next);
    }
    setSaving(false);
    setCreating(false);
    setEditing(null);
  }

  async function deleteDef(def: CustomFieldDef) {
    if (!(await confirm({ title: "Delete field", message: `Delete "${def.name}"? Existing values will be lost.`, confirmLabel: "Delete field", destructive: true }))) return;
    await createClient().from("crm_custom_field_defs").delete().eq("id", def.id);
    const next = list.filter(d => d.id !== def.id);
    setList(next); onChanged(next);
  }

  return (
    <div style={Ov}>
      <div style={{ ...Md, maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={MdHd}>
          <h2 style={MdTt}>Custom fields - {mode === "demo" ? "Demo Tracker" : "Contacts"}</h2>
          <button onClick={onClose} style={ClBtn}><X /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {!creating ? (
            <>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                Custom fields appear in the Add/Edit form and contact detail for every {mode === "demo" ? "demo" : "contact"} record.
              </p>
              {list.length === 0 && (
                <div style={{ padding: "28px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  No custom fields yet. Click "New field" to add one.
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {list.sort((a, b) => a.position - b.position).map(def => (
                  <div key={def.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>{def.name}</p>
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                        {CF_TYPES.find(t => t.value === def.field_type)?.label ?? def.field_type}
                        {def.field_type === "select" && def.options.length > 0 && ` · ${def.options.join(", ")}`}
                      </p>
                    </div>
                    <button onClick={() => startEdit(def)} style={{ ...SmBtn, fontSize: 12 }}>Edit</button>
                    <button onClick={() => deleteDef(def)} style={{ ...SmBtn, fontSize: 12, color: "#dc2626", borderColor: "#fecaca" }}>Delete</button>
                  </div>
                ))}
              </div>
              <button onClick={startCreate} style={{ ...CfBtn, alignSelf: "flex-start", display: "flex", gap: 6, alignItems: "center" }}>
                <Plus /> New field
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button onClick={() => setCreating(false)} style={{ ...SmBtn, alignSelf: "flex-start", fontSize: 12 }}>← Back</button>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>
                {editing ? "Edit field" : "New field"}
              </h3>
              <Field label="Field name">
                <Inp value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Budget, Region, Priority…" />
              </Field>
              <Field label="Field type">
                <select value={form.field_type} onChange={e => setForm(f => ({ ...f, field_type: e.target.value as CustomFieldDef["field_type"], options: [] }))} style={Sel}>
                  {CF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              {form.field_type === "select" && (
                <Field label="Dropdown options">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {form.options.map(opt => (
                      <span key={opt} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 12, background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                        {opt}
                        <button onClick={() => setForm(f => ({ ...f, options: f.options.filter(o => o !== opt) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={optionInput} onChange={e => setOptionInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const v = optionInput.trim(); if (v && !form.options.includes(v)) setForm(f => ({ ...f, options: [...f.options, v] })); setOptionInput(""); }}}
                      placeholder="Type option + Enter" style={{ ...InpSt, flex: 1 }} />
                    <button onClick={() => { const v = optionInput.trim(); if (v && !form.options.includes(v)) setForm(f => ({ ...f, options: [...f.options, v] })); setOptionInput(""); }} style={SmBtn}>Add</button>
                  </div>
                </Field>
              )}
              {error && <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setCreating(false)} style={CcBtn}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ ...CfBtn, opacity: saving ? 0.5 : 1 }}>{saving ? "Saving…" : editing ? "Save changes" : "Create field"}</button>
              </div>
            </div>
          )}
        </div>
        {!creating && (
          <div style={{ padding: "12px 24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={CcBtn}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Custom field input renderer ──────────────────────────────────────────────

function CustomFieldInput({ def, value, onChange }: {
  def: CustomFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = value === undefined || value === null ? "" : String(value);
  if (def.field_type === "checkbox") {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "#374151" }}>
        <input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)} style={{ accentColor: "#111827", width: 15, height: 15 }} />
        {value ? "Yes" : "No"}
      </label>
    );
  }
  if (def.field_type === "select") {
    return (
      <select value={str} onChange={e => onChange(e.target.value)} style={Sel}>
        <option value="">Select…</option>
        {def.options.map(o => <option key={o}>{o}</option>)}
      </select>
    );
  }
  if (def.field_type === "textarea") {
    return (
      <textarea value={str} onChange={e => onChange(e.target.value)} rows={3}
        style={{ ...InpSt, resize: "vertical", width: "100%", boxSizing: "border-box" }} />
    );
  }
  if (def.field_type === "date") {
    return <input type="date" value={str} onChange={e => onChange(e.target.value)} style={InpSt} />;
  }
  return <input type={def.field_type === "number" ? "number" : "text"} value={str} onChange={e => onChange(e.target.value)} style={InpSt} />;
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function ContactModal({
  mode, orgId, userId, contact, customFieldDefs,
  onClose, onSaved,
}: {
  mode: CRMMode; orgId: string | null; userId: string;
  contact: Contact | null;
  customFieldDefs: CustomFieldDef[];
  onClose: () => void;
  onSaved: (c: Contact) => void;
}) {
  const statuses = mode === "demo" ? DEMO_STATUSES : CONTACT_STATUSES;
  const [form, setForm] = useState({
    company: contact?.company ?? "",
    contact_name: contact?.contact_name ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    status: contact?.status ?? statuses[0],
    lead_source: contact?.lead_source ?? "Website",
    industry: contact?.industry ?? "",
    deal_size: contact?.deal_size ?? "",
    scheduled_at: contact?.scheduled_at ? contact.scheduled_at.slice(0, 16) : "",
    scheduled_label: contact?.scheduled_label ?? "",
    demo_status: contact?.demo_status ?? "",
    remarks: contact?.remarks ?? "",
    comments: contact?.comments ?? "",
    campaign: contact?.campaign ?? "",
    call_taken_by: contact?.call_taken_by ?? "",
    ai_memory: contact?.ai_memory ?? "",
    tagInput: "",
    tags: contact?.tags ?? [] as string[],
  });
  const [customValues, setCustomValues] = useState<Record<string, unknown>>(
    contact?.custom_fields ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string | string[]) { setForm((p) => ({ ...p, [k]: v })); }

  function addTag() {
    const t = form.tagInput.trim();
    if (t && !form.tags.includes(t)) set("tags", [...form.tags, t]);
    set("tagInput", "");
  }
  function removeTag(t: string) { set("tags", form.tags.filter((x) => x !== t)); }

  async function handleSave() {
    setSaving(true); setError("");
    const supabase = createClient();
    const payload = {
      org_id: orgId,
      record_type: mode === "demo" ? "demo" : "contact",
      company: form.company.trim() || null,
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      status: form.status,
      lead_source: form.lead_source,
      tags: form.tags,
      industry: form.industry.trim() || null,
      deal_size: form.deal_size.trim() || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      scheduled_label: form.scheduled_label.trim() || null,
      demo_status: form.demo_status || null,
      remarks: form.remarks.trim() || null,
      comments: form.comments.trim() || null,
      campaign: form.campaign.trim() || null,
      call_taken_by: form.call_taken_by.trim() || null,
      ai_memory: form.ai_memory.trim() || null,
      custom_fields: customValues as Record<string, string | number | boolean | null>,
      updated_at: new Date().toISOString(),
    };
    let result;
    if (contact) {
      result = await supabase.from("crm_contacts").update(payload).eq("id", contact.id).select().single();
    } else {
      result = await supabase.from("crm_contacts").insert({ ...payload, created_by: userId }).select().single();
    }
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data as Contact);
    onClose();
  }

  const isDemo = mode === "demo";
  return (
    <div style={Ov}>
      <div style={{ ...Md, maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={MdHd}>
          <h2 style={MdTt}>{contact ? "Edit contact" : "Add contact"}</h2>
          <button onClick={onClose} style={ClBtn}><X /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={Grid2}>
            <Field label="Company"><Inp value={form.company} onChange={(v) => set("company", v)} placeholder="Acme Inc." /></Field>
            <Field label="Contact name"><Inp value={form.contact_name} onChange={(v) => set("contact_name", v)} placeholder="Jane Smith" /></Field>
            <Field label="Phone"><Inp value={form.phone} onChange={(v) => set("phone", v)} placeholder="+1 555-0100" /></Field>
            <Field label="Email"><Inp value={form.email} onChange={(v) => set("email", v)} placeholder="jane@acme.com" /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} style={Sel}>
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Lead source">
              <select value={form.lead_source} onChange={(e) => set("lead_source", e.target.value)} style={Sel}>
                {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* Tags */}
          <Field label="Tags">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {form.tags.map((t) => (
                <span key={t} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 12, background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
                  {t}
                  <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={form.tagInput}
                onChange={(e) => set("tagInput", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Type tag + Enter"
                style={{ ...InpSt, flex: 1 }}
              />
              <button onClick={addTag} style={SmBtn}>Add</button>
            </div>
          </Field>

          {/* Qualification */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase", margin: "0 0 10px" }}>Qualification</p>
            <div style={Grid2}>
              <Field label="Industry">
                <select value={form.industry} onChange={(e) => set("industry", e.target.value)} style={Sel}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Deal size"><Inp value={form.deal_size} onChange={(v) => set("deal_size", v)} placeholder="e.g. $5,000" /></Field>
            </div>
          </div>

          {/* Demo-specific fields */}
          {isDemo && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase", margin: "0 0 10px" }}>Demo</p>
              <div style={Grid2}>
                <Field label="Scheduled On">
                  <textarea
                    value={form.scheduled_label}
                    onChange={(e) => set("scheduled_label", e.target.value)}
                    rows={2}
                    style={{ ...InpSt, resize: "vertical", width: "100%", boxSizing: "border-box" }}
                    placeholder="Sunday, June 7, 9-9.30pm (EST)"
                  />
                </Field>
                <Field label="Campaign"><Inp value={form.campaign} onChange={(v) => set("campaign", v)} placeholder="AI SMS Campaign" /></Field>
                <Field label="Status">
                  <select value={form.demo_status} onChange={(e) => set("demo_status", e.target.value)} style={Sel}>
                    <option value="">{EMPTY_VALUE}</option>
                    {DEMO_CALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Call taken by"><Inp value={form.call_taken_by} onChange={(v) => set("call_taken_by", v)} placeholder="Seth / Adam" /></Field>
                <Field label="Scheduled (ET)">
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => set("scheduled_at", e.target.value)}
                    style={InpSt}
                  />
                </Field>
              </div>
              <Field label="Comments">
                <textarea
                  value={form.comments}
                  onChange={(e) => set("comments", e.target.value)}
                  rows={3}
                  style={{ ...InpSt, resize: "vertical", width: "100%", boxSizing: "border-box" }}
                  placeholder="Follow-up notes…"
                />
              </Field>
              <Field label="Remarks">
                <textarea
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  rows={2}
                  style={{ ...InpSt, resize: "vertical", width: "100%", boxSizing: "border-box" }}
                  placeholder="Additional remarks…"
                />
              </Field>
              <Field label="AI Memory (Conversation)">
                <textarea
                  value={form.ai_memory}
                  onChange={(e) => set("ai_memory", e.target.value)}
                  rows={4}
                  style={{ ...InpSt, resize: "vertical", width: "100%", boxSizing: "border-box" }}
                  placeholder="AI conversation transcript…"
                />
              </Field>
            </div>
          )}

          {/* Custom fields */}
          {customFieldDefs.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#9ca3af", textTransform: "uppercase", margin: "0 0 10px" }}>Custom fields</p>
              <div style={Grid2}>
                {customFieldDefs.sort((a, b) => a.position - b.position).map(def => (
                  <div key={def.id} style={def.field_type === "textarea" ? { gridColumn: "1 / -1" } : {}}>
                    <Field label={def.name}>
                      <CustomFieldInput
                        def={def}
                        value={customValues[def.id]}
                        onChange={v => setCustomValues(prev => ({ ...prev, [def.id]: v }))}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p style={{ color: "#dc2626", fontSize: 12, margin: 0 }}>{error}</p>}
        </div>
        <div style={{ padding: "12px 24px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={CcBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...CfBtn, opacity: saving ? 0.5 : 1 }}>
            {saving ? "Saving…" : contact ? "Save changes" : "Add contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contact Detail drawer ────────────────────────────────────────────────────

function ContactDetail({
  contact: initial, mode, isAdmin, userName, userRole, userId, customFieldDefs,
  onClose, onUpdated, onDelete,
}: {
  contact: Contact; mode: CRMMode; isAdmin: boolean;
  userName: string; userRole: string; userId: string;
  customFieldDefs: CustomFieldDef[];
  onClose: () => void;
  onUpdated: (c: Contact) => void;
  onDelete: (id: string) => void;
}) {
  const [contact, setContact] = useState(initial);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteSuccess, setPromoteSuccess] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();

  useEffect(() => {
    createClient().from("crm_notes").select("*").eq("contact_id", contact.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => { setNotes((data as Note[]) ?? []); setLoadingNotes(false); });
  }, [contact.id]);

  useEffect(() => { notesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [notes]);

  async function postNote() {
    if (!newNote.trim()) return;
    setPosting(true);
    const { data } = await createClient().from("crm_notes").insert({
      contact_id: contact.id, author_name: userName, author_role: userRole, content: newNote.trim(),
    }).select().single();
    setPosting(false);
    if (data) { setNotes((p) => [...p, data as Note]); setNewNote(""); }
    // bump last_activity_at
    const updated = await createClient().from("crm_contacts")
      .update({ last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", contact.id).select().single();
    if (updated.data) { setContact(updated.data as Contact); onUpdated(updated.data as Contact); }
  }

  async function handleDelete() {
    if (!(await confirm({
      title: "Delete contact",
      message: "Delete this contact? This cannot be undone.",
      confirmLabel: "Delete contact",
      destructive: true,
    }))) return;
    await createClient().from("crm_contacts").delete().eq("id", contact.id);
    onDelete(contact.id);
    onClose();
  }

  async function handlePromoteToDemo() {
    if (!(await confirm({
      title: "Promote to Demo Tracker",
      message: `Create a demo record for "${contact.company || contact.contact_name || "this contact"}" in the Demo Tracker?`,
      confirmLabel: "Promote",
      destructive: false,
    }))) return;
    setPromoting(true);
    const sb = createClient();
    await sb.from("crm_contacts").insert({
      org_id: contact.org_id,
      record_type: "demo",
      company: contact.company,
      contact_name: contact.contact_name,
      phone: contact.phone,
      email: contact.email,
      status: "New",
      lead_source: contact.lead_source,
      tags: contact.tags,
      industry: contact.industry,
      deal_size: contact.deal_size,
      remarks: contact.remarks,
      campaign: contact.campaign,
      updated_at: new Date().toISOString(),
    });
    setPromoting(false);
    setPromoteSuccess(true);
    setTimeout(() => setPromoteSuccess(false), 3000);
  }

  const sc = STATUS_COLORS[contact.status ?? ""] ?? { bg: "#f3f4f6", color: "#6b7280" };

  return (
    <>
      {editing && (
        <ContactModal
          mode={mode} orgId={contact.org_id} userId={userId}
          contact={contact}
          customFieldDefs={customFieldDefs}
          onClose={() => setEditing(false)}
          onSaved={(c) => { setContact(c); onUpdated(c); setEditing(false); }}
        />
      )}
      <div style={Ov} onClick={onClose}>
        <div
          style={{ ...Md, maxWidth: 580, maxHeight: "92vh", display: "flex", flexDirection: "column", marginLeft: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ ...MdHd, borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ ...MdTt, marginBottom: 4 }}>{contact.company || contact.contact_name || "Unknown"}</h2>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color }}>{contact.status ?? EMPTY_VALUE}</span>
                {contact.contact_name && <span style={{ fontSize: 13, color: "#6b7280" }}>{contact.contact_name}</span>}
                {contact.email && <span style={{ fontSize: 13, color: "#2563eb" }}>{contact.email}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {isAdmin && <button onClick={() => setEditing(true)} style={SmBtn}>Edit</button>}
              {isAdmin && mode === "contacts" && (
                <button
                  onClick={handlePromoteToDemo}
                  disabled={promoting}
                  style={{
                    ...SmBtn,
                    color: promoteSuccess ? "#15803d" : "#6d28d9",
                    borderColor: promoteSuccess ? "#bbf7d0" : "#ddd6fe",
                    background: promoteSuccess ? "#f0fdf4" : "#fff",
                    opacity: promoting ? 0.6 : 1,
                    cursor: promoting ? "not-allowed" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {promoteSuccess ? "Promoted!" : promoting ? "Promoting..." : "Promote to Demo"}
                </button>
              )}
              {isAdmin && <button onClick={handleDelete} style={{ ...SmBtn, color: "#dc2626", borderColor: "#fecaca" }}>Delete</button>}
              <button onClick={onClose} style={ClBtn}><X /></button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Fields grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
              {([
                ["Phone", contact.phone],
                ["Email", contact.email],
                ["Lead source", contact.lead_source],
                ["Industry", contact.industry],
                ["Deal size", contact.deal_size],
                ["Last activity", fmtDate(contact.last_activity_at)],
                ...(mode === "demo" ? [
                  ["Scheduled On", fmtScheduledLabel(contact.scheduled_label, contact.scheduled_at)],
                  ["Campaign", contact.campaign],
                  ["Status", contact.demo_status],
                  ["Call taken by", contact.call_taken_by],
                ] : []),
              ] as [string, string | null][]).map(([label, val]) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>{label}</p>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{val || EMPTY_VALUE}</p>
                </div>
              ))}
            </div>

            {contact.comments && (
              <div>
                <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Comments</p>
                <p style={{ fontSize: 13, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>{contact.comments}</p>
              </div>
            )}

            {contact.remarks && (
              <div>
                <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Remarks</p>
                <p style={{ fontSize: 13, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", margin: 0, lineHeight: 1.6, whiteSpace: "pre-line" }}>{contact.remarks}</p>
              </div>
            )}

            {contact.ai_memory && (
              <div>
                <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>AI Memory</p>
                <p style={{ fontSize: 13, color: "#374151", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", margin: 0, lineHeight: 1.6, whiteSpace: "pre-line", maxHeight: 240, overflowY: "auto" }}>{contact.ai_memory}</p>
              </div>
            )}

            {contact.tags && contact.tags.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Tags</p>
                <TagChips tags={contact.tags} />
              </div>
            )}

            {/* Custom fields */}
            {customFieldDefs.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Custom fields</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
                  {customFieldDefs.sort((a, b) => a.position - b.position).map(def => {
                    const val = contact.custom_fields?.[def.id];
                    const display = def.field_type === "checkbox"
                      ? (val ? "Yes" : "No")
                      : (val !== undefined && val !== null && val !== "" ? String(val) : EMPTY_VALUE);
                    return (
                      <div key={def.id} style={def.field_type === "textarea" ? { gridColumn: "1 / -1" } : {}}>
                        <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 2px" }}>{def.name}</p>
                        <p style={{ fontSize: 13, color: "#374151", margin: 0, whiteSpace: "pre-line" }}>{display}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity / Notes */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 12px" }}>Activity log</p>
              {loadingNotes ? (
                <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading…</p>
              ) : notes.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af" }}>No activity logged yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {notes.map((n) => (
                    <div key={n.id} style={{
                      background: n.author_role === "admin" ? "#eff6ff" : "#f9fafb",
                      border: `1px solid ${n.author_role === "admin" ? "#bfdbfe" : "#e5e7eb"}`,
                      borderRadius: 8, padding: "10px 14px",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{n.author_name ?? "User"}</span>
                          {n.author_role === "admin" && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, background: "#dbeafe", color: "#2563eb", padding: "1px 6px", borderRadius: 4 }}>WeLaunch</span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>{fmtDateTime(n.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>{n.content}</p>
                    </div>
                  ))}
                  <div ref={notesEndRef} />
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postNote(); }}
                  placeholder="Log a note or conversation…"
                  rows={3}
                  style={{ ...InpSt, width: "100%", resize: "vertical", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                  <button onClick={postNote} disabled={posting || !newNote.trim()}
                    style={{ ...CfBtn, opacity: posting || !newNote.trim() ? 0.5 : 1, display: "flex", gap: 6, alignItems: "center" }}>
                    <Send />{posting ? "Posting…" : "Log note"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Column Manager ───────────────────────────────────────────────────────────

function ColumnManager({ cols, onChange, onClose }: {
  cols: ColDef[]; onChange: (c: ColDef[]) => void; onClose: () => void;
}) {
  const [local, setLocal] = useState(cols);
  const toggle = (key: string) =>
    setLocal((p) => p.map((c) => c.key === key ? { ...c, visible: !c.visible } : c));
  return (
    <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 300, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: 12, minWidth: 200 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 10px" }}>Columns ({local.filter((c) => c.visible).length}/{local.length})</p>
      {local.map((col) => (
        <label key={col.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 13, color: "#374151" }}>
          <input type="checkbox" checked={col.visible} onChange={() => toggle(col.key as string)} />
          {col.label}
        </label>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={onClose} style={CcBtn}>Cancel</button>
        <button onClick={() => { onChange(local); onClose(); }} style={CfBtn}>Apply</button>
      </div>
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ mode, orgId, userId, onClose, onImported }: {
  mode: CRMMode; orgId: string | null; userId: string;
  onClose: () => void; onImported: (contacts: Contact[]) => void;
}) {
  const [step, setStep] = useState<"upload" | "map" | "importing">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const statuses = mode === "demo" ? DEMO_STATUSES : CONTACT_STATUSES;

  const FIELDS = [
    { key: "company", label: "Company" },
    { key: "contact_name", label: "Contact name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "status", label: "Status" },
    { key: "lead_source", label: "Lead source" },
    { key: "industry", label: "Industry" },
    { key: "deal_size", label: "Deal size" },
    { key: "remarks", label: "Remarks" },
    { key: "tags", label: "Tags (comma-separated)" },
  ];

  function parseCSV(text: string) {
    const lines = text.trim().split("\n");
    const hdrs = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rs = lines.slice(1).map((l) => l.split(",").map((v) => v.trim().replace(/^"|"$/g, "")));
    setHeaders(hdrs);
    setRows(rs);
    // Auto-map headers to fields
    const autoMap: Record<string, string> = {};
    for (const f of FIELDS) {
      const match = hdrs.find((h) => h.toLowerCase().replace(/\s/g, "_") === f.key || h.toLowerCase() === f.label.toLowerCase());
      if (match) autoMap[f.key] = match;
    }
    setMapping(autoMap);
    setStep("map");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { parseCSV(ev.target?.result as string); }
      catch { setError("Could not parse CSV. Make sure it has a header row."); }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setStep("importing");
    const supabase = createClient();
    const records = rows.map((row) => {
      const rec: Record<string, unknown> = {
        org_id: orgId, record_type: mode === "demo" ? "demo" : "contact",
        created_by: userId, updated_at: new Date().toISOString(),
      };
      for (const [field, col] of Object.entries(mapping)) {
        const idx = headers.indexOf(col);
        if (idx >= 0) {
          const val = row[idx]?.trim() ?? "";
          if (field === "tags") rec[field] = val ? val.split(",").map((t) => t.trim()) : [];
          else if (field === "status") rec[field] = statuses.includes(val) ? val : statuses[0];
          else rec[field] = val || null;
        }
      }
      return rec;
    }).filter((r) => r.company || r.contact_name || r.email);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await supabase
      .from("crm_contacts").insert(records as any).select();
    if (err) { setError(err.message); setStep("map"); return; }
    onImported((data as Contact[]) ?? []);
    onClose();
  }

  return (
    <div style={Ov}>
      <div style={{ ...Md, maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={MdHd}>
          <h2 style={MdTt}>Import contacts</h2>
          <button onClick={onClose} style={ClBtn}><X /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {step === "upload" && (
            <>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Upload a CSV file with headers. Duplicates are skipped based on email.</p>
              <input type="file" accept=".csv" onChange={handleFile} style={{ fontSize: 14 }} />
              {error && <p style={{ color: "#dc2626", fontSize: 12 }}>{error}</p>}
            </>
          )}
          {step === "map" && (
            <>
              <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>Map your CSV columns to fields. <strong>{rows.length}</strong> rows found.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {FIELDS.map((f) => (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "#374151", minWidth: 160, fontWeight: 500 }}>{f.label}</span>
                    <select
                      value={mapping[f.key] ?? ""}
                      onChange={(e) => setMapping((p) => ({ ...p, [f.key]: e.target.value }))}
                      style={{ ...Sel, flex: 1 }}
                    >
                      <option value="">- skip -</option>
                      {headers.map((h) => <option key={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {error && <p style={{ color: "#dc2626", fontSize: 12 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setStep("upload")} style={CcBtn}>Back</button>
                <button onClick={handleImport} style={CfBtn}>Import {rows.length} rows</button>
              </div>
            </>
          )}
          {step === "importing" && <p style={{ fontSize: 14, color: "#6b7280" }}>Importing…</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Filter dropdown button ───────────────────────────────────────────────────

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== options[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: 7,
          border: `1px solid ${active ? "#111827" : "#e5e7eb"}`,
          background: active ? "#f9fafb" : "#fff",
          color: active ? "#111827" : "#6b7280",
          fontSize: 12, fontWeight: active ? 600 : 500,
          cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        {label}
        {active && <span style={{ color: "#374151" }}>· {value}</span>}
        <ChevronDown />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
          boxShadow: "0 8px 20px rgba(0,0,0,0.08)", padding: "4px 0", minWidth: 160,
        }}>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "7px 12px", border: "none", background: value === opt ? "#f3f4f6" : "none",
                fontSize: 13, color: value === opt ? "#111827" : "#374151",
                fontWeight: value === opt ? 600 : 400, cursor: "pointer",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Board View ───────────────────────────────────────────────────────────────

function BoardView({ contacts, mode, onSelect }: {
  contacts: Contact[]; mode: CRMMode; onSelect: (c: Contact) => void;
}) {
  const statuses = mode === "demo" ? DEMO_STATUSES : CONTACT_STATUSES;
  return (
    <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
      {statuses.map((s) => {
        const group = contacts.filter((c) => c.status === s);
        const sc = STATUS_COLORS[s] ?? { bg: "#f3f4f6", color: "#6b7280" };
        return (
          <div key={s} style={{ minWidth: 220, maxWidth: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.color }}>{s}</span>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>{group.length}</span>
            </div>
            {group.map((c) => (
              <div key={c.id} onClick={() => onSelect(c)} style={{
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
                padding: "12px 14px", cursor: "pointer", transition: "box-shadow 0.1s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>{c.company || EMPTY_VALUE}</p>
                {c.contact_name && <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px" }}>{c.contact_name}</p>}
                {c.email && <p style={{ fontSize: 12, color: "#2563eb", margin: "0 0 4px" }}>{c.email}</p>}
                {c.tags && c.tags.length > 0 && <TagChips tags={c.tags} />}
              </div>
            ))}
            {group.length === 0 && <p style={{ fontSize: 12, color: "#d1d5db", textAlign: "center", padding: 16 }}>Empty</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main CRMPage ─────────────────────────────────────────────────────────────

export default function CRMPage({ mode, orgId, isAdmin, userName, userRole, userId }: Props) {
  const title = mode === "demo" ? "Demo Tracker" : "Contacts";
  const subtitle = mode === "demo"
    ? "Every demo booking across all clients · the response CRM."
    : "Every contact across all clients · the response CRM.";
  const statuses = mode === "demo" ? DEMO_STATUSES : CONTACT_STATUSES;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "board">("list");
  const [cols, setCols] = useState<ColDef[]>(() => getDefaultCols(mode));
  const [showColMgr, setShowColMgr] = useState(false);
  const [showCfMgr, setShowCfMgr] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All statuses");
  const [filterTag, setFilterTag] = useState("All tags");
  const [filterSource, setFilterSource] = useState("All lead sources");
  const [sortKey, setSortKey] = useState<string>("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const colMgrRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("crm_contacts")
      .select("*")
      .eq("record_type", mode === "demo" ? "demo" : "contact")
      .order(sortKey, { ascending: sortDir === "asc" });
    if (orgId) q = q.eq("org_id", orgId);
    const { data } = await q;
    setContacts((data as Contact[]) ?? []);
    setLoading(false);
  }, [mode, orgId, sortKey, sortDir]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchContacts();
    // Load custom field definitions
    const sb = createClient();
    let q = sb.from("crm_custom_field_defs").select("*").eq("mode", mode).order("position");
    if (orgId) q = (q as typeof q).eq("org_id", orgId); else q = (q as typeof q).is("org_id", null);
    q.then(({ data }) => setCustomFieldDefs((data ?? []) as CustomFieldDef[]));
  }, [fetchContacts, mode, orgId]);

  // Re-fetch when sort changes
  const prevSort = useRef({ sortKey, sortDir });
  useEffect(() => {
    if (prevSort.current.sortKey !== sortKey || prevSort.current.sortDir !== sortDir) {
      prevSort.current = { sortKey, sortDir };
      hasFetched.current = false;
      fetchContacts();
    }
  }, [sortKey, sortDir, fetchContacts]);

  // All tags for filter
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags ?? []))).sort();

  // Filtered contacts (client-side)
  const filtered = contacts.filter((c) => {
    if (filterStatus !== "All statuses" && c.status !== filterStatus) return false;
    if (filterTag !== "All tags" && !(c.tags ?? []).includes(filterTag)) return false;
    if (filterSource !== "All lead sources" && c.lead_source !== filterSource) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![c.company, c.contact_name, c.email, c.phone].some((f) => f?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function toggleRow(id: string) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map((c) => c.id)));
  }

  // CSV export
  function exportCSV() {
    const visibleCols = cols.filter((c) => c.visible);
    const header = visibleCols.map((c) => c.label).join(",");
    const rows = (selectedRows.size > 0 ? filtered.filter((c) => selectedRows.has(c.id)) : filtered)
      .map((c) =>
        visibleCols.map((col) => {
          const v = c[col.key as keyof Contact];
          if (Array.isArray(v)) return `"${v.join(", ")}"`;
          if (v == null) return "";
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(",")
      );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${mode === "demo" ? "demo-tracker" : "contacts"}-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  function handleDelete(id: string) {
    setContacts((p) => p.filter((c) => c.id !== id));
    setSelectedContact(null);
  }

  const visibleCols = cols.filter((c) => c.visible);

  return (
    <div style={{ padding: "24px 32px", minHeight: "100%", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>{title}</h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "2px 0 0" }}>{subtitle}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* List / Board toggle */}
          <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            {(["list", "board"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: "6px 14px", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
                background: view === v ? "#111827" : "#fff",
                color: view === v ? "#fff" : "#6b7280",
              }}>
                {v === "list" ? <span style={{ display: "flex", gap: 5, alignItems: "center" }}><ListIcon />{" "}List</span>
                  : <span style={{ display: "flex", gap: 5, alignItems: "center" }}><BoardIcon />{" "}Board</span>}
              </button>
            ))}
          </div>
          {/* Manage columns */}
          <div style={{ position: "relative" }} ref={colMgrRef}>
            <button onClick={() => setShowColMgr((p) => !p)} style={{ ...OutBtn, display: "flex", gap: 5, alignItems: "center" }}>
              <ColumnsIcon />Columns
            </button>
            {showColMgr && (
              <ColumnManager cols={cols} onChange={setCols} onClose={() => setShowColMgr(false)} />
            )}
          </div>
          {/* Custom fields manager (admin only) */}
          {isAdmin && (
            <button onClick={() => setShowCfMgr(true)} style={{ ...OutBtn, display: "flex", gap: 5, alignItems: "center" }}>
              <FieldsIcon />Custom fields{customFieldDefs.length > 0 && ` (${customFieldDefs.length})`}
            </button>
          )}
          <button onClick={() => setShowImport(true)} style={{ ...OutBtn, display: "flex", gap: 5, alignItems: "center" }}>
            <UploadIcon />Import
          </button>
          <button onClick={exportCSV} style={{ ...OutBtn, display: "flex", gap: 5, alignItems: "center" }}>
            <DownloadIcon />Export
          </button>
          <button onClick={() => setShowAdd(true)} style={{ ...CfBtn, display: "flex", gap: 6, alignItems: "center" }}>
            <Plus />Add contact
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 360, marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}><SearchIcon /></span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or contact…"
          style={{ ...InpSt, paddingLeft: 32, width: "100%", boxSizing: "border-box" }}
        />
      </div>

      {/* Filters toolbar — compact buttons above the list */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap",
      }}>
        <FilterDropdown
          label="Status"
          value={filterStatus}
          options={["All statuses", ...statuses]}
          onChange={setFilterStatus}
        />
        <FilterDropdown
          label="Tags"
          value={filterTag}
          options={["All tags", ...allTags]}
          onChange={setFilterTag}
        />
        <FilterDropdown
          label="Lead source"
          value={filterSource}
          options={["All lead sources", ...LEAD_SOURCES]}
          onChange={setFilterSource}
        />
        <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 4 }}>
          {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
        </span>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setShowColMgr((p) => !p)}
            style={{ ...OutBtn, display: "flex", gap: 5, alignItems: "center", fontSize: 12, padding: "5px 10px" }}
          >
            <ColumnsIcon />Columns {visibleCols.length}/{cols.length}
          </button>
        </div>
      </div>

      {/* Table or Board */}
      {view === "board" ? (
        <BoardView contacts={filtered} mode={mode} onSelect={setSelectedContact} />
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", flex: 1 }}>
          {/* Header row */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "9px 16px", borderBottom: "1px solid #f3f4f6",
            background: "#f9fafb", gap: 0, minWidth: "max-content",
          }}>
            <div style={{ width: 32, flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={selectedRows.size === filtered.length && filtered.length > 0}
                onChange={toggleAll}
              />
            </div>
            {visibleCols.map((col) => (
              <button key={col.key as string}
                onClick={() => handleSort(col.key as string)}
                style={{
                  width: col.width, minWidth: col.width, flexShrink: 0,
                  background: "none", border: "none", cursor: "pointer", padding: "0 4px",
                  textAlign: "left", display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em",
                }}
              >
                {col.label}
                {sortKey === col.key && (
                  <span style={{ color: "#374151" }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>No contacts match your filters.</div>
          ) : (
            filtered.map((c, idx) => (
              <div key={c.id}
                onClick={() => setSelectedContact(c)}
                style={{
                  display: "flex", alignItems: "center",
                  padding: "10px 16px", gap: 0,
                  borderBottom: idx < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
                  cursor: "pointer", minWidth: "max-content",
                  background: selectedRows.has(c.id) ? "#fafafa" : "transparent",
                }}
                onMouseEnter={(e) => { if (!selectedRows.has(c.id)) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { if (!selectedRows.has(c.id)) e.currentTarget.style.background = ""; }}
              >
                <div style={{ width: 32, flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); toggleRow(c.id); }}>
                  <input type="checkbox" checked={selectedRows.has(c.id)} onChange={() => toggleRow(c.id)} onClick={(e) => e.stopPropagation()} />
                </div>
                {visibleCols.map((col) => (
                  <div key={col.key as string} style={{ width: col.width, minWidth: col.width, flexShrink: 0, padding: "0 4px", overflow: "hidden" }}>
                    {cellValue(c, col)}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showCfMgr && (
        <CustomFieldManager
          mode={mode} orgId={orgId} defs={customFieldDefs}
          onClose={() => setShowCfMgr(false)}
          onChanged={setCustomFieldDefs}
        />
      )}
      {showAdd && (
        <ContactModal
          mode={mode} orgId={orgId} userId={userId} contact={null}
          customFieldDefs={customFieldDefs}
          onClose={() => setShowAdd(false)}
          onSaved={(c) => {
            setContacts((p) => [c, ...p]);
            logActivity({ orgId, userId, userName, userRole, eventType: "Contact added", description: `${userName} added "${c.company || c.contact_name || "contact"}"`, targetLabel: c.company || c.contact_name || undefined });
          }}
        />
      )}
      {showImport && (
        <ImportModal
          mode={mode} orgId={orgId} userId={userId}
          onClose={() => setShowImport(false)}
          onImported={(imported) => setContacts((p) => [...imported, ...p])}
        />
      )}
      {selectedContact && (
        <ContactDetail
          contact={selectedContact} mode={mode} isAdmin={isAdmin}
          userName={userName} userRole={userRole} userId={userId}
          customFieldDefs={customFieldDefs}
          onClose={() => setSelectedContact(null)}
          onUpdated={(c) => {
            setContacts((p) => p.map((x) => x.id === c.id ? c : x));
            setSelectedContact(c);
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}
function Inp({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={InpSt} />;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const Ov: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, animation: "fadeIn 0.15s ease" };
const Md: React.CSSProperties = { background: "#fff", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", width: "100%", overflow: "hidden", animation: "modalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)" };
const MdHd: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px 16px", gap: 12, borderBottom: "1px solid #f3f4f6" };
const MdTt: React.CSSProperties = { fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 };
const ClBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, border: "none", background: "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", flexShrink: 0 };
const InpSt: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" };
const Sel: React.CSSProperties = { padding: "7px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, color: "#374151", background: "#fff", cursor: "pointer", width: "100%" };
const Grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" };
const CcBtn: React.CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: 13, cursor: "pointer" };
const CfBtn: React.CSSProperties = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const SmBtn: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 12, cursor: "pointer" };
const OutBtn: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: 13, cursor: "pointer", fontWeight: 500 };

// ─── Icons ────────────────────────────────────────────────────────────────────

function X() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function Plus() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function Send() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function ListIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function BoardIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function ColumnsIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>; }
function FieldsIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="14" x2="6" y2="20"/><line x1="18" y1="10" x2="18" y2="20"/></svg>; }
function UploadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>; }
function DownloadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
