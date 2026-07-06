"use client";

import { useState } from "react";
import VoiceAgentPage from "./VoiceAgentPage";

interface AgentOption {
  orgId: string;
  agentId: string;
  orgName: string;
  orgSlug: string;
}

export default function AdminVoiceAgentSelector({ agents }: { agents: AgentOption[] }) {
  const [selected, setSelected] = useState<string>(agents[0]?.orgId ?? "");
  const current = agents.find((a) => a.orgId === selected) ?? null;

  if (agents.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#6b7280" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>No voice agents configured yet</p>
        <p style={{ fontSize: 13, margin: 0 }}>Connect an ElevenLabs agent to a client workspace to see their calls here.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 24px", borderBottom: "1px solid #e5e7eb", background: "#fff",
      }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Workspace:</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{
            padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
            fontSize: 13.5, color: "#111827", background: "#fff", cursor: "pointer", fontWeight: 500,
          }}
        >
          {agents.map((a) => (
            <option key={a.orgId} value={a.orgId}>{a.orgName}</option>
          ))}
        </select>
      </div>

      {current && (
        <VoiceAgentPage
          key={current.orgId}
          agentId={current.agentId}
          orgId={current.orgId}
          isAdmin={true}
        />
      )}
    </div>
  );
}
