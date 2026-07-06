import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminVoiceAgentSelector from "@/components/voice/AdminVoiceAgentSelector";

export default async function AdminVoiceAgentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Each client workspace has its own ElevenLabs agent — there is no
  // "global" agent, so the admin must pick which client's calls to view.
  const { data: rows } = await supabase
    .from("org_voice_agents")
    .select("org_id, agent_id, organisations(name, slug)");

  const agents = (rows ?? []).map((r) => ({
    orgId: r.org_id,
    agentId: r.agent_id,
    orgName: (r.organisations as unknown as { name: string; slug: string } | null)?.name ?? "Unknown workspace",
    orgSlug: (r.organisations as unknown as { name: string; slug: string } | null)?.slug ?? "",
  }));

  return <AdminVoiceAgentSelector agents={agents} />;
}
