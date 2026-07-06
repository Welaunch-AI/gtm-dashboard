import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MarketingPage from "@/components/marketing/MarketingPage";

export default async function WorkspaceMarketingPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: org } = await supabase.from("organisations").select("id").eq("slug", orgSlug).single();
  if (!org) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  const authorName = profile?.full_name ?? user.email?.split("@")[0] ?? "User";
  return <MarketingPage orgId={org.id} isAdmin={true} authorName={authorName} />;
}
