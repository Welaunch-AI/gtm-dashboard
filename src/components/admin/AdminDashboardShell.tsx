"use client";

import { useRouter } from "next/navigation";
import DashboardView from "@/components/DashboardView";

interface Org { id: string; name: string; slug: string }

export default function AdminDashboardShell({
  orgs,
  selectedOrg,
}: {
  orgs: Org[];
  selectedOrg: Org | null;
}) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Org selector bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 28px", borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0,
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#6b7280" }}>Viewing dashboard for:</span>
        <select
          value={selectedOrg?.id ?? ""}
          onChange={e => router.push(`/admin?orgId=${e.target.value}`)}
          style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13, color: "#111827", background: "#fff", cursor: "pointer", outline: "none" }}
        >
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      {/* Dashboard content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {selectedOrg ? (
          <DashboardView orgId={selectedOrg.id} orgName={selectedOrg.name} isAdmin={true} />
        ) : (
          <div style={{ padding: "60px 32px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
            No workspaces found. Create a client workspace first.
          </div>
        )}
      </div>
    </div>
  );
}
