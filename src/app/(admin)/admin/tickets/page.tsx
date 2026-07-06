import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TicketsPage from "@/components/tickets/TicketsPage";

export default async function AdminTicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  return (
    <TicketsPage
      orgId={null}
      isAdmin={true}
      userName={profile.full_name ?? user.email?.split("@")[0] ?? "Admin"}
      userRole="admin"
      userId={user.id}
    />
  );
}
