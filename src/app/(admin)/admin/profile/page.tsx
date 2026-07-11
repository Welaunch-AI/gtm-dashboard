import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfilePage from "@/components/profile/ProfilePage";

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, org_id, avatar_url")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, name, slug, logo_url")
    .order("name");

  return (
    <ProfilePage
      userId={user.id}
      email={user.email ?? ""}
      fullName={profile.full_name}
      avatarUrl={profile.avatar_url}
      role="admin"
      orgId={null}
      orgs={orgs ?? []}
    />
  );
}
