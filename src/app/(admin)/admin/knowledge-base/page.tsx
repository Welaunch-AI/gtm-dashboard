import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import KnowledgePage from "@/components/knowledge/KnowledgePage";

export default async function AdminKnowledgeBasePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <KnowledgePage orgId={null} isAdmin={true} />;
}
