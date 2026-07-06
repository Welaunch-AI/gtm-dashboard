import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VoiceAgentPage from "@/components/voice/VoiceAgentPage";

export default async function WorkspaceVoiceAgentPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organisations")
    .select("id")
    .eq("slug", orgSlug)
    .single();
  if (!org) redirect("/login");

  const { data: voiceAgent } = await supabase
    .from("org_voice_agents")
    .select("agent_id")
    .eq("org_id", org.id)
    .maybeSingle();

  if (!voiceAgent) {
    return (
      <div style={{ padding: 40, color: "#6b7280", fontSize: 15 }}>
        No voice agent configured for this workspace.
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  return (
    <VoiceAgentPage
      agentId={voiceAgent.agent_id}
      orgId={org.id}
      isAdmin={isAdmin}
    />
  );
}
