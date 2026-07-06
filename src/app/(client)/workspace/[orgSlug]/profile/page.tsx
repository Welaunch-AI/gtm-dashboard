import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfilePage from "@/components/profile/ProfilePage";

export default async function WorkspaceProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgSlug);
  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, slug")
    .eq(isUuid ? "id" : "slug", orgSlug)
    .maybeSingle();
  if (!org) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, org_id")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const { data: orgs } = isAdmin
    ? await supabase.from("organisations").select("id, name, slug").order("name")
    : { data: [org] };

  return (
    <ProfilePage
      userId={user.id}
      email={user.email ?? ""}
      fullName={profile?.full_name ?? null}
      role={isAdmin ? "admin" : "client"}
      orgId={org.id}
      orgs={orgs ?? []}
    />
  );
}
