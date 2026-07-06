import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KnowledgePage from "@/components/knowledge/KnowledgePage";

export default async function WorkspaceKnowledgeBasePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase.from("organisations").select("id").eq("slug", orgSlug).single();
  if (!org) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  return <KnowledgePage orgId={org.id} isAdmin={isAdmin} canEdit={true} />;
}
