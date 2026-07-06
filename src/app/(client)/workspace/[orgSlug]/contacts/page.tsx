import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CRMPage from "@/components/crm/CRMPage";

export default async function WorkspaceContactsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgSlug);
  const { data: org } = await supabase.from("organisations").select("id").eq(isUuid ? "id" : "slug", orgSlug).maybeSingle();
  if (!org) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  return (
    <CRMPage
      mode="contacts" orgId={org.id} isAdmin={true}
      userName={profile?.full_name ?? user.email?.split("@")[0] ?? "User"}
      userRole={profile?.role ?? "client"} userId={user.id}
    />
  );
}
