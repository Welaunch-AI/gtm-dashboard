export type VoiceOutcome = "Not Qualified" | "Qualified" | "Meeting Booked" | "Untagged" | "success";

export interface VoiceConversationLike {
  call_duration_secs: number;
  call_successful?: string;
  outcome_override?: string | null;
  analysis?: { call_successful?: string };
}

export function resolveVoiceOutcome(c: VoiceConversationLike): VoiceOutcome {
  if (c.outcome_override) return c.outcome_override as VoiceOutcome;
  const raw = c.analysis?.call_successful ?? c.call_successful ?? "";
  if (raw === "success") return "Qualified";
  if (raw === "failure") return "Not Qualified";
  return "Untagged";
}

export interface VoiceStats {
  totalCalls: number;
  meetingsBooked: number;
  qualified: number;
  avgDurationSecs: number;
}

export function computeVoiceStats(conversations: VoiceConversationLike[]): VoiceStats {
  const totalCalls = conversations.length;
  const meetingsBooked = conversations.filter((c) => resolveVoiceOutcome(c) === "Meeting Booked").length;
  const qualified = conversations.filter((c) => resolveVoiceOutcome(c) === "Qualified").length;
  const avgDurationSecs = totalCalls > 0
    ? Math.round(conversations.reduce((s, c) => s + c.call_duration_secs, 0) / totalCalls)
    : 0;
  return { totalCalls, meetingsBooked, qualified, avgDurationSecs };
}

export function formatVoiceDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}
