import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const { data: orgs } = await supabase.from("organisations").select("id, name, slug").order("name");
  const { orgId } = await searchParams;
  const selectedOrgId = orgId ?? orgs?.[0]?.id ?? null;
  const selectedOrg = orgs?.find(o => o.id === selectedOrgId) ?? null;

  return (
    <AdminDashboardShell
      orgs={orgs ?? []}
      selectedOrg={selectedOrg}
    />
  );
}
