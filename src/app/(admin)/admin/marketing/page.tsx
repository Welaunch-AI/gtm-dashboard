import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MarketingPage from "@/components/marketing/MarketingPage";

export default async function AdminMarketingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const authorName = profile?.full_name ?? user.email?.split("@")[0] ?? "Admin";
  return <MarketingPage orgId={null} isAdmin={true} authorName={authorName} />;
}
