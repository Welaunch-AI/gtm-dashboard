import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardView from "@/components/DashboardView";

type Props = {
  params: Promise<{ orgSlug: string }>;
};

export default async function WorkspaceDashboardPage({ params }: Props) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Retry profile fetch — the DB connection can be cold right after sign-in
  let profile: { role: string; org_id: string | null } | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    const { data } = await supabase
      .from("profiles")
      .select("role, org_id")
      .eq("id", user.id)
      .maybeSingle();
    if (data) { profile = data; break; }
  }

  if (!profile) redirect("/login");

  // Retry org lookup as well
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgSlug);
  let org: { id: string; name: string; slug: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt));
    const { data } = await (isUuid
      ? supabase.from("organisations").select("id, name, slug").or(`id.eq.${orgSlug},slug.eq.${orgSlug}`)
      : supabase.from("organisations").select("id, name, slug").eq("slug", orgSlug)
    ).maybeSingle();
    if (data) { org = data; break; }
  }

  if (!org) redirect("/login");

  if (profile.role !== "admin" && profile.org_id !== org.id) {
    redirect(`/workspace/${profile.org_id}`);
  }

  return <DashboardView orgId={org.id} orgName={org.name} isAdmin={profile.role === "admin"} />;
}
