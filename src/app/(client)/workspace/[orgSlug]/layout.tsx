import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

type Props = {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
};

export default async function WorkspaceLayout({ children, params }: Props) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Retry profile fetch — the DB connection can be cold right after sign-in
  let profile: { role: string; full_name: string | null; org_id: string | null } | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name, org_id")
      .eq("id", user.id)
      .maybeSingle();
    if (data) { profile = data; break; }
  }

  if (!profile) redirect("/login");

  // orgSlug can be either a slug ("frannexus") or a raw org id (uuid).
  // Comparing a non-uuid string against the uuid `id` column in the same
  // .or() filter makes Postgres throw a cast error and silently fails the
  // whole query — so only include the id.eq clause when it's actually a uuid.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgSlug);

  // Retry org lookup — on Supabase's free tier the PostgREST connection can
  // be cold right after sign-in even though auth is already warm.
  let org: { id: string; name: string; slug: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt));
    const { data } = await (isUuid
      ? supabase.from("organisations").select("id, name, slug").or(`id.eq.${orgSlug},slug.eq.${orgSlug}`)
      : supabase.from("organisations").select("id, name, slug").eq("slug", orgSlug)
    ).maybeSingle();
    if (data) { org = data; break; }
  }

  if (!org) {
    if (profile.role === "admin") redirect("/admin");
    if (profile.org_id) {
      // Last-resort: look up the slug for this profile's org
      let slug: string | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 300 * attempt));
        const { data } = await supabase.from("organisations").select("slug").eq("id", profile.org_id).maybeSingle();
        if (data) { slug = data.slug; break; }
      }
      // Guard against redirecting to the same URL we're already on (would loop)
      const target = slug || profile.org_id;
      if (target !== orgSlug) redirect(`/workspace/${target}`);
      // Same URL — can't redirect, just render a "connection error" page
      redirect("/login");
    }
    redirect("/login");
  }

  // Clients can only access their own org
  if (profile.role !== "admin" && profile.org_id !== org.id) {
    // Use slug to avoid UUID loops
    const clientTarget = org.slug || profile.org_id;
    redirect(`/workspace/${clientTarget}`);
  }

  // Admins get all orgs for workspace switcher
  const { data: allOrgs } = profile.role === "admin"
    ? await supabase.from("organisations").select("id, name, slug").order("name")
    : { data: [org] };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f9fafb" }}>
      <Topbar
        role={profile.role as "admin" | "client"}
        fullName={profile.full_name}
        email={user.email ?? ""}
        orgs={allOrgs ?? []}
        currentOrg={org}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          role={profile.role as "admin" | "client"}
          orgSlug={org.slug || org.id}
        />
        <main style={{ flex: 1, overflowY: "auto", background: "#f9fafb" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
