import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ActivityLogPage from "@/components/admin/ActivityLogPage";

export default async function AdminActivityLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const { data: orgs } = await supabase.from("organisations").select("id, name").order("name");

  return <ActivityLogPage orgs={orgs ?? []} />;
}
