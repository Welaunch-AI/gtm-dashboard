"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChannelType = "linkedin" | "meta_ads" | "email" | "sms" | "ai_sms" | "ai_voice";

interface Channel {
  id: string;
  org_id: string;
  channel_type: ChannelType;
  enabled: boolean;
}

interface Campaign {
  id: string;
  channel_id: string;
  org_id: string;
  name: string;
  created_at: string;
}

interface Metrics {
  id: string;
  campaign_id: string;
  connections_made: number;
  replies: number;
  meetings_booked: number;
  spend: number;
  leads: number;
  cost_per_lead: number;
  ctr: number;
  sends: number;
  open_rate: number;
  reply_rate: number;
  sent: number;
  calls_made: number;
  connect_rate: number;
  warmup_done: boolean;
  domain_healthy: boolean;
  sender_reputation: number;
}

const ZERO_METRICS: Omit<Metrics, "id" | "campaign_id"> = {
  connections_made: 0, replies: 0, meetings_booked: 0,
  spend: 0, leads: 0, cost_per_lead: 0, ctr: 0,
  sends: 0, open_rate: 0, reply_rate: 0,
  sent: 0, calls_made: 0, connect_rate: 0,
  warmup_done: false, domain_healthy: false, sender_reputation: 0,
};

// ── Channel config ─────────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: React.ReactNode; color: string; bg: string; aiTag?: boolean }> = {
  linkedin:  { label: "LinkedIn",       icon: <LiIcon />,    color: "#0077b5", bg: "#dbeafe" },
  meta_ads:  { label: "Meta Ads",       icon: <MetaIcon />,  color: "#1877f2", bg: "#dbeafe" },
  email:     { label: "Email",          icon: <EmailIcon />, color: "#6366f1", bg: "#eef2ff" },
  sms:       { label: "SMS",            icon: <SmsIcon />,   color: "#059669", bg: "#d1fae5" },
  ai_sms:    { label: "AI SMS",         icon: <SmsIcon />,   color: "#7c3aed", bg: "#f5f3ff", aiTag: true },
  ai_voice:  { label: "AI Voice Agent", icon: <VoiceIcon />, color: "#dc2626", bg: "#fee2e2", aiTag: true },
};

const ALL_CHANNEL_TYPES: ChannelType[] = ["linkedin", "meta_ads", "email", "sms", "ai_sms", "ai_voice"];

// ── Metric aggregation ────────────────────────────────────────────────────────

function aggregate(metricsList: Metrics[], type: ChannelType): Partial<Metrics> {
  if (metricsList.length === 0) return {};
  const sum = (key: keyof Metrics) =>
    metricsList.reduce((a, m) => a + (Number(m[key]) || 0), 0);
  const avg = (key: keyof Metrics) => sum(key) / metricsList.length;

  switch (type) {
    case "linkedin":
      return { connections_made: sum("connections_made"), replies: sum("replies"), meetings_booked: sum("meetings_booked") };
    case "meta_ads": {
      const totalSpend = sum("spend");
      const totalLeads = sum("leads");
      return {
        spend: totalSpend, leads: totalLeads,
        cost_per_lead: totalLeads > 0 ? totalSpend / totalLeads : 0,
        ctr: avg("ctr"),
      };
    }
    case "email":
      return {
        sends: sum("sends"), open_rate: avg("open_rate"),
        reply_rate: avg("reply_rate"), meetings_booked: sum("meetings_booked"),
      };
    case "sms":
    case "ai_sms":
      return { sent: sum("sent"), replies: sum("replies"), meetings_booked: sum("meetings_booked") };
    case "ai_voice":
      return { calls_made: sum("calls_made"), connect_rate: avg("connect_rate"), meetings_booked: sum("meetings_booked") };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toFixed(decimals);
}
function fmtPct(n: number) { return n.toFixed(1) + "%"; }
function fmtMoney(n: number) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

// ── Sub-components ─────────────────────────────────────────────────────────────

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

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={S.metricTile}>
      <p style={S.metricLabel}>{label}</p>
      <p style={S.metricValue}>{value}</p>
      {sub && <p style={S.metricSub}>{sub}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: checked ? "#111827" : "#d1d5db", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 18 : 3,
        width: 14, height: 14, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

// ── Metrics display per channel ────────────────────────────────────────────────

function LinkedInMetrics({ m }: { m: Partial<Metrics> }) {
  return (
    <div style={S.metricsRow}>
      <MetricTile label="Connections Made" value={fmt(m.connections_made ?? 0)} />
      <MetricTile label="Replies" value={fmt(m.replies ?? 0)} />
      <MetricTile label="Meetings Booked" value={fmt(m.meetings_booked ?? 0)} />
    </div>
  );
}

function MetaAdsMetrics({ m, campaigns, allMetrics }: { m: Partial<Metrics>; campaigns: Campaign[]; allMetrics: Metrics[] }) {
  return (
    <>
      <div style={S.metricsRow}>
        <MetricTile label="Total Spend" value={fmtMoney(m.spend ?? 0)} />
        <MetricTile label="Leads" value={fmt(m.leads ?? 0)} />
        <MetricTile label="Cost per Lead" value={m.cost_per_lead ? fmtMoney(m.cost_per_lead) : "—"} />
        <MetricTile label="CTR" value={fmtPct(m.ctr ?? 0)} />
      </div>
      {campaigns.length > 1 && (
        <div style={{ padding: "0 0 16px 0" }}>
          <p style={S.tableTitle}>Campaigns</p>
          <div style={S.miniTable}>
            <div style={S.miniTableHead}>
              {["Campaign", "Spend", "Leads", "CPL", "CTR"].map(h => (
                <span key={h} style={S.miniTh}>{h}</span>
              ))}
            </div>
            {campaigns.map(c => {
              const cm = allMetrics.find(x => x.campaign_id === c.id);
              if (!cm) return null;
              return (
                <div key={c.id} style={S.miniTableRow}>
                  <span style={S.miniTd}>{c.name}</span>
                  <span style={S.miniTd}>{fmtMoney(cm.spend)}</span>
                  <span style={S.miniTd}>{fmt(cm.leads)}</span>
                  <span style={S.miniTd}>{cm.leads > 0 ? fmtMoney(cm.spend / cm.leads) : "—"}</span>
                  <span style={S.miniTd}>{fmtPct(cm.ctr)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function EmailMetrics({ m, campaigns, allMetrics, selectedCampaignId }: { m: Partial<Metrics>; campaigns: Campaign[]; allMetrics: Metrics[]; selectedCampaignId: string | null }) {
  const health = selectedCampaignId
    ? allMetrics.find(x => x.campaign_id === selectedCampaignId)
    : allMetrics[0];

  return (
    <>
      <div style={S.metricsRow}>
        <MetricTile label="Emails Sent" value={fmt(m.sends ?? 0)} />
        <MetricTile label="Open Rate" value={fmtPct(m.open_rate ?? 0)} />
        <MetricTile label="Reply Rate" value={fmtPct(m.reply_rate ?? 0)} />
        <MetricTile label="Meetings Booked" value={fmt(m.meetings_booked ?? 0)} />
      </div>
      {health && (
        <div style={S.inboxHealth}>
          <p style={S.tableTitle}>Inbox Health</p>
          <div style={{ display: "flex", gap: 12 }}>
            <HealthChip ok={health.warmup_done} label="Warmup" />
            <HealthChip ok={health.domain_healthy} label="Domain" />
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Reputation</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: health.sender_reputation >= 70 ? "#16a34a" : health.sender_reputation >= 40 ? "#d97706" : "#dc2626" }}>
                {health.sender_reputation}/100
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HealthChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: ok ? "#d1fae5" : "#fee2e2", border: `1px solid ${ok ? "#6ee7b7" : "#fca5a5"}` }}>
      <span style={{ fontSize: 14 }}>{ok ? "✓" : "✗"}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: ok ? "#065f46" : "#991b1b" }}>{label}</span>
    </div>
  );
}

function SmsMetrics({ m, label }: { m: Partial<Metrics>; label: string }) {
  return (
    <div style={S.metricsRow}>
      <MetricTile label={`${label} Sent`} value={fmt(m.sent ?? 0)} />
      <MetricTile label="Replies" value={fmt(m.replies ?? 0)} />
      <MetricTile label="Meetings Booked" value={fmt(m.meetings_booked ?? 0)} />
    </div>
  );
}

function VoiceMetrics({ m, autoCallCount }: { m: Partial<Metrics>; autoCallCount: number | null }) {
  const calls = autoCallCount !== null ? autoCallCount : (m.calls_made ?? 0);
  return (
    <div style={S.metricsRow}>
      <MetricTile label="Calls Made" value={fmt(calls)} sub={autoCallCount !== null ? "from ElevenLabs" : undefined} />
      <MetricTile label="Connect Rate" value={fmtPct(m.connect_rate ?? 0)} />
      <MetricTile label="Meetings Booked" value={fmt(m.meetings_booked ?? 0)} />
    </div>
  );
}

// ── Edit Metrics Modal ─────────────────────────────────────────────────────────

function EditMetricsModal({ campaign, channelType, metrics, orgId, onClose, onSaved }: {
  campaign: Campaign; channelType: ChannelType;
  metrics: Metrics | null; orgId: string;
  onClose: () => void; onSaved: (m: Metrics) => void;
}) {
  const [form, setForm] = useState<Omit<Metrics, "id" | "campaign_id">>({
    ...ZERO_METRICS, ...(metrics ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(key: keyof typeof form, val: string | boolean) {
    setForm(f => ({ ...f, [key]: typeof val === "boolean" ? val : parseFloat(val as string) || 0 }));
  }

  async function handleSave() {
    setSaving(true);
    const sb = createClient();
    let result: Metrics | null = null;
    if (metrics) {
      const { data } = await sb.from("gtm_campaign_metrics").update({ ...form, updated_at: new Date().toISOString() }).eq("id", metrics.id).select().single();
      result = data as Metrics;
    } else {
      const { data, error: err } = await sb.from("gtm_campaign_metrics").insert({ campaign_id: campaign.id, org_id: orgId, ...form }).select().single();
      if (err) { setError(err.message); setSaving(false); return; }
      result = data as Metrics;
    }
    setSaving(false);
    if (result) onSaved(result);
    onClose();
  }

  function NumField({ label, fkey, step = "1" }: { label: string; fkey: keyof typeof form; step?: string }) {
    return (
      <div style={S.fieldGroup}>
        <span style={S.fieldLabel}>{label}</span>
        <input type="number" step={step} value={(form[fkey] as number) ?? 0} onChange={e => setField(fkey, e.target.value)} style={S.input} />
      </div>
    );
  }

  function BoolField({ label, fkey }: { label: string; fkey: keyof typeof form }) {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
        <input type="checkbox" checked={!!(form[fkey])} onChange={e => setField(fkey, e.target.checked)} style={{ accentColor: "#111827" }} />
        {label}
      </label>
    );
  }

  const fields: Record<ChannelType, React.ReactNode> = {
    linkedin: <><NumField label="Connections Made" fkey="connections_made" /><NumField label="Replies" fkey="replies" /><NumField label="Meetings Booked" fkey="meetings_booked" /></>,
    meta_ads: <><NumField label="Spend ($)" fkey="spend" step="0.01" /><NumField label="Leads" fkey="leads" /><NumField label="CTR (%)" fkey="ctr" step="0.01" /></>,
    email: <><NumField label="Emails Sent" fkey="sends" /><NumField label="Open Rate (%)" fkey="open_rate" step="0.01" /><NumField label="Reply Rate (%)" fkey="reply_rate" step="0.01" /><NumField label="Meetings Booked" fkey="meetings_booked" /><BoolField label="Warmup Done" fkey="warmup_done" /><BoolField label="Domain Healthy" fkey="domain_healthy" /><NumField label="Sender Reputation (0–100)" fkey="sender_reputation" /></>,
    sms: <><NumField label="SMS Sent" fkey="sent" /><NumField label="Replies" fkey="replies" /><NumField label="Meetings Booked" fkey="meetings_booked" /></>,
    ai_sms: <><NumField label="AI SMS Sent" fkey="sent" /><NumField label="Replies" fkey="replies" /><NumField label="Meetings Booked" fkey="meetings_booked" /></>,
    ai_voice: <><NumField label="Calls Made (manual override)" fkey="calls_made" /><NumField label="Connect Rate (%)" fkey="connect_rate" step="0.01" /><NumField label="Meetings Booked" fkey="meetings_booked" /></>,
  };

  return (
    <Modal onClose={onClose} width={460}>
      <div style={S.modalHeader}>
        <h2 style={S.modalTitle}>Edit metrics — {campaign.name}</h2>
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>
      <div style={{ ...S.modalBody, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {fields[channelType]}
        {error && <p style={{ gridColumn: "1/-1", color: "#dc2626", fontSize: 12 }}>{error}</p>}
      </div>
      <div style={S.modalFooter}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={handleSave} disabled={saving} style={S.primaryBtn}>{saving ? "Saving…" : "Save metrics"}</button>
      </div>
    </Modal>
  );
}

// ── Add Campaign Modal ─────────────────────────────────────────────────────────

function AddCampaignModal({ channelType, orgId, channelId, onClose, onCreated }: {
  channelType: ChannelType; orgId: string; channelId: string;
  onClose: () => void; onCreated: (c: Campaign) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    const sb = createClient();
    const { data, error: err } = await sb.from("gtm_campaigns").insert({ channel_id: channelId, org_id: orgId, name: name.trim() }).select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    onCreated(data as Campaign);
    onClose();
  }

  return (
    <Modal onClose={onClose} width={400}>
      <div style={S.modalHeader}>
        <h2 style={S.modalTitle}>Add campaign — {CHANNEL_CONFIG[channelType].label}</h2>
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>
      <div style={S.modalBody}>
        <div style={S.fieldGroup}>
          <span style={S.fieldLabel}>Campaign name</span>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} style={S.input} placeholder="e.g. Q3 Outreach" />
        </div>
        {error && <p style={{ color: "#dc2626", fontSize: 12 }}>{error}</p>}
      </div>
      <div style={S.modalFooter}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={handleCreate} disabled={saving} style={S.primaryBtn}>{saving ? "Creating…" : "Create campaign"}</button>
      </div>
    </Modal>
  );
}

// ── Channel Section ────────────────────────────────────────────────────────────

function ChannelSection({ channel, campaigns, allMetrics, isAdmin, orgId, autoVoiceCalls, onToggle, onCampaignAdded, onMetricsSaved, onCampaignDeleted }: {
  channel: Channel;
  campaigns: Campaign[];
  allMetrics: Metrics[];
  isAdmin: boolean;
  orgId: string;
  autoVoiceCalls: number | null;
  onToggle: (enabled: boolean) => void;
  onCampaignAdded: (c: Campaign) => void;
  onMetricsSaved: (m: Metrics) => void;
  onCampaignDeleted: (id: string) => void;
}) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);

  const cfg = CHANNEL_CONFIG[channel.channel_type];

  const displayedCampaigns = selectedCampaignId
    ? campaigns.filter(c => c.id === selectedCampaignId)
    : campaigns;

  const displayedMetrics = displayedCampaigns
    .map(c => allMetrics.find(m => m.campaign_id === c.id))
    .filter(Boolean) as Metrics[];

  const agg = aggregate(displayedMetrics, channel.channel_type);

  const activeCampaign: Campaign | null =
    selectedCampaignId
      ? (campaigns.find(c => c.id === selectedCampaignId) ?? null)
      : campaigns.length === 1 ? campaigns[0] : null;

  const metricsForEdit = editCampaign ? allMetrics.find(m => m.campaign_id === editCampaign.id) ?? null : null;

  async function handleDeleteCampaign() {
    if (!activeCampaign) return;
    if (!confirm(`Delete campaign "${activeCampaign.name}"? This will also remove all its metrics.`)) return;
    setDeleting(true);
    const sb = createClient();
    await sb.from("gtm_campaigns").delete().eq("id", activeCampaign.id);
    setDeleting(false);
    setSelectedCampaignId(null);
    onCampaignDeleted(activeCampaign.id);
  }

  if (!channel.enabled && !isAdmin) return null;

  return (
    <>
      <div style={{ ...S.channelCard, opacity: channel.enabled ? 1 : 0.5 }}>
        {/* Header */}
        <div style={S.channelHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ ...S.channelIconWrap, background: cfg.bg, color: cfg.color }}>{cfg.icon}</div>
            <span style={S.channelName}>{cfg.label}</span>
            {cfg.aiTag && <span style={S.aiBadge}>AI</span>}
            {!channel.enabled && isAdmin && <span style={{ fontSize: 11, color: "#9ca3af", background: "#f3f4f6", padding: "2px 7px", borderRadius: 20, fontWeight: 600 }}>Disabled</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            {/* Campaign selector */}
            {campaigns.length > 0 && (
              <select
                value={selectedCampaignId ?? ""}
                onChange={e => setSelectedCampaignId(e.target.value || null)}
                style={S.campaignSelect}
              >
                <option value="">All campaigns</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {/* Admin controls */}
            {isAdmin && (
              <>
                <button onClick={() => setShowAddCampaign(true)} style={S.outlineSmBtn}>+ Campaign</button>
                {activeCampaign && (
                  <>
                    <button onClick={() => setEditCampaign(activeCampaign)} style={S.outlineSmBtn}>
                      <EditIcon /> Edit metrics
                    </button>
                    <button
                      onClick={handleDeleteCampaign}
                      disabled={deleting}
                      style={{ ...S.outlineSmBtn, color: "#dc2626", borderColor: "#fecaca" }}
                      title={`Delete "${activeCampaign.name}"`}
                    >
                      <TrashIcon /> {deleting ? "Deleting…" : "Delete"}
                    </button>
                  </>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: "#9ca3af", fontWeight: 500 }}>{channel.enabled ? "On" : "Off"}</span>
                  <Toggle checked={channel.enabled} onChange={onToggle} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Empty state */}
        {campaigns.length === 0 && (
          <div style={{ padding: "28px 22px", textAlign: "center" }}>
            <p style={{ fontSize: 13.5, color: "#9ca3af", fontWeight: 500 }}>
              {isAdmin ? "No campaigns yet — click \u201c+ Campaign\u201d to start tracking metrics." : "No data yet for this channel."}
            </p>
          </div>
        )}

        {/* Metrics */}
        {campaigns.length > 0 && (
          <div style={{ padding: "16px 22px 0" }}>
            {channel.channel_type === "linkedin" && <LinkedInMetrics m={agg} />}
            {channel.channel_type === "meta_ads" && (
              <MetaAdsMetrics m={agg} campaigns={displayedCampaigns} allMetrics={displayedMetrics} />
            )}
            {channel.channel_type === "email" && (
              <EmailMetrics m={agg} campaigns={displayedCampaigns} allMetrics={displayedMetrics} selectedCampaignId={selectedCampaignId} />
            )}
            {(channel.channel_type === "sms" || channel.channel_type === "ai_sms") && (
              <SmsMetrics m={agg} label={channel.channel_type === "ai_sms" ? "AI SMS" : "SMS"} />
            )}
            {channel.channel_type === "ai_voice" && (
              <VoiceMetrics m={agg} autoCallCount={autoVoiceCalls} />
            )}
          </div>
        )}
        <div style={{ height: 16 }} />
      </div>

      {/* Modals */}
      {showAddCampaign && (
        <AddCampaignModal
          channelType={channel.channel_type}
          orgId={orgId}
          channelId={channel.id}
          onClose={() => setShowAddCampaign(false)}
          onCreated={c => { onCampaignAdded(c); setSelectedCampaignId(c.id); }}
        />
      )}
      {editCampaign && (
        <EditMetricsModal
          campaign={editCampaign}
          channelType={channel.channel_type}
          metrics={metricsForEdit}
          orgId={orgId}
          onClose={() => setEditCampaign(null)}
          onSaved={m => { onMetricsSaved(m); setEditCampaign(null); }}
        />
      )}
    </>
  );
}

// ── Main DashboardView ─────────────────────────────────────────────────────────

type Props = { orgId: string; orgName?: string; isAdmin: boolean };

export default function DashboardView({ orgId, orgName, isAdmin }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [autoVoiceCalls, setAutoVoiceCalls] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = createClient();
    const [{ data: chData }, { data: cpData }, { data: mData }] = await Promise.all([
      sb.from("gtm_channels").select("*").eq("org_id", orgId),
      sb.from("gtm_campaigns").select("*").eq("org_id", orgId).order("created_at"),
      sb.from("gtm_campaign_metrics").select("*").eq("org_id", orgId),
    ]);
    setChannels((chData ?? []) as Channel[]);
    setCampaigns((cpData ?? []) as Campaign[]);
    setMetrics((mData ?? []) as Metrics[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // Auto-fetch voice call count from ElevenLabs via our API
  useEffect(() => {
    if (!orgId) return;
    const sb = createClient();
    sb.from("org_voice_agents").select("agent_id").eq("org_id", orgId).maybeSingle().then(({ data }) => {
      if (!data?.agent_id) return;
      fetch(`/api/voice-calls?agentId=${data.agent_id}&pageSize=100`)
        .then(r => r.json())
        .then(json => {
          const count = json?.conversations?.length ?? json?.total_count ?? null;
          if (count !== null) setAutoVoiceCalls(count);
        })
        .catch(() => {});
    });
  }, [orgId]);

  // Ensure all 6 channel rows exist for this org (admin seeds them on first visit)
  useEffect(() => {
    if (!isAdmin || loading || channels.length === ALL_CHANNEL_TYPES.length) return;
    const existing = new Set(channels.map(c => c.channel_type));
    const missing = ALL_CHANNEL_TYPES.filter(t => !existing.has(t));
    if (missing.length === 0) return;
    const sb = createClient();
    Promise.all(missing.map(t => sb.from("gtm_channels").upsert({ org_id: orgId, channel_type: t, enabled: true }, { onConflict: "org_id,channel_type" }).select().single()))
      .then(() => load());
  }, [isAdmin, loading, channels, orgId, load]);

  async function handleToggle(channelId: string, enabled: boolean) {
    const sb = createClient();
    await sb.from("gtm_channels").update({ enabled }).eq("id", channelId);
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, enabled } : c));
  }

  function handleCampaignAdded(c: Campaign) {
    setCampaigns(prev => [...prev, c]);
  }

  function handleCampaignDeleted(id: string) {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    setMetrics(prev => prev.filter(m => {
      const camp = campaigns.find(c => c.id === id);
      return !camp || m.campaign_id !== id;
    }));
  }

  function handleMetricsSaved(m: Metrics) {
    setMetrics(prev => {
      const idx = prev.findIndex(x => x.id === m.id);
      return idx >= 0 ? prev.map(x => x.id === m.id ? m : x) : [...prev, m];
    });
  }

  // Hero totals: sum across all enabled channels
  const enabledChannels = channels.filter(c => c.enabled);
  const totalMeetings = metrics.reduce((a, m) => a + m.meetings_booked, 0)
    + (autoVoiceCalls !== null ? 0 : 0); // voice meetings_booked already in metrics
  const totalLeads = metrics.reduce((a, m) => a + m.leads + m.connections_made + m.sent + m.sends + m.calls_made, 0);
  const totalCampaigns = campaigns.length;
  const enabledCount = enabledChannels.length;

  if (loading) {
    return (
      <div style={{ padding: "60px 32px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
        Loading dashboard…
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Reporting Dashboard</h1>
          <p style={S.pageSubtitle}>{orgName ? `${orgName} — ` : ""}A clear view of what&apos;s been delivered across all active channels.</p>
        </div>
      </div>

      {/* Hero stats */}
      <div style={S.heroRow}>
        {[
          { label: "Meetings Booked", value: fmt(totalMeetings), note: `Across ${enabledCount} active channels` },
          { label: "Campaigns Running", value: String(totalCampaigns), note: "Total across all channels" },
          { label: "Active Channels", value: String(enabledCount), note: "Currently enabled" },
        ].map(s => (
          <div key={s.label} style={S.heroCard}>
            <p style={S.heroLabel}>{s.label}</p>
            <p style={S.heroValue}>{s.value}</p>
            <p style={S.heroNote}>{s.note}</p>
          </div>
        ))}
      </div>

      {/* Channel sections — ordered */}
      {ALL_CHANNEL_TYPES.map(type => {
        const channel = channels.find(c => c.channel_type === type);
        if (!channel) return null;
        if (!channel.enabled && !isAdmin) return null;
        const channelCampaigns = campaigns.filter(c => c.channel_id === channel.id);
        const channelMetrics = metrics.filter(m => channelCampaigns.some(c => c.id === m.campaign_id));
        return (
          <ChannelSection
            key={channel.id}
            channel={channel}
            campaigns={channelCampaigns}
            allMetrics={channelMetrics}
            isAdmin={isAdmin}
            orgId={orgId}
            autoVoiceCalls={type === "ai_voice" ? autoVoiceCalls : null}
            onToggle={enabled => handleToggle(channel.id, enabled)}
            onCampaignAdded={handleCampaignAdded}
            onMetricsSaved={handleMetricsSaved}
            onCampaignDeleted={handleCampaignDeleted}
          />
        );
      })}

      {enabledChannels.length === 0 && !isAdmin && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>
          No channels are currently active. Check back soon.
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20, minHeight: "100%", overflowY: "auto" },
  pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  pageTitle: { fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.6px" },
  pageSubtitle: { fontSize: 13.5, color: "#6b7280", marginTop: 4 },
  heroRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  heroCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  heroLabel: { fontSize: 11, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.7px", fontWeight: 700, marginBottom: 8 },
  heroValue: { fontSize: 38, fontWeight: 900, color: "#0f172a", letterSpacing: "-1.5px", lineHeight: 1, marginBottom: 6 },
  heroNote: { fontSize: 12, color: "#9ca3af", fontWeight: 500 },
  channelCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" },
  channelHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: "1px solid #f3f4f6", gap: 12, flexWrap: "wrap" as const },
  channelIconWrap: { width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  channelName: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  aiBadge: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac", letterSpacing: "0.5px" },
  campaignSelect: { padding: "5px 10px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12.5, color: "#374151", cursor: "pointer", outline: "none", fontWeight: 500 },
  outlineSmBtn: { display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 7, border: "1px solid #e5e7eb", background: "none", fontSize: 12, color: "#6b7280", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" as const },
  metricsRow: { display: "flex", gap: 1, background: "#f1f5f9", borderRadius: 10, overflow: "hidden", marginBottom: 16 },
  metricTile: { flex: 1, background: "#ffffff", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 5 },
  metricLabel: { fontSize: 10.5, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.6px", fontWeight: 700 },
  metricValue: { fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.8px" },
  metricSub: { fontSize: 11, color: "#94a3b8", fontWeight: 500 },
  tableTitle: { fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: "0.6px", marginBottom: 8 },
  miniTable: { background: "#f9fafb", borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", marginBottom: 16 },
  miniTableHead: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 14px", borderBottom: "1px solid #e5e7eb", background: "#f3f4f6" },
  miniTh: { fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase" as const, letterSpacing: "0.4px" },
  miniTableRow: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "9px 14px", borderBottom: "1px solid #f3f4f6" },
  miniTd: { fontSize: 13, color: "#374151" },
  inboxHealth: { marginBottom: 16 },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 },
  modal: { background: "#ffffff", borderRadius: 16, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "90vh" },
  modalHeader: { display: "flex", alignItems: "center", gap: 12, padding: "18px 22px 14px", borderBottom: "1px solid #f3f4f6" },
  modalTitle: { flex: 1, fontSize: 15, fontWeight: 700, color: "#111827" },
  closeBtn: { width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" },
  modalBody: { padding: "18px 22px", overflowY: "auto" },
  modalFooter: { padding: "12px 22px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 10 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 5 },
  fieldLabel: { fontSize: 11.5, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.4px" },
  input: { padding: "8px 11px", borderRadius: 7, border: "1px solid #e5e7eb", fontSize: 13, color: "#111827", outline: "none", background: "#fff", width: "100%", boxSizing: "border-box" as const },
  primaryBtn: { padding: "8px 18px", borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  cancelBtn: { padding: "8px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "none", color: "#374151", fontSize: 13, cursor: "pointer" },
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function EditIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>; }
function XIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function LiIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="#0077B5"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>; }
function MetaIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877f2"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/></svg>; }
function EmailIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function SmsIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>; }
function VoiceIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.69A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>; }
