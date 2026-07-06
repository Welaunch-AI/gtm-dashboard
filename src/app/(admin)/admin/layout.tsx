import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Retry profile fetch — the DB connection can be cold right after sign-in
  let profile: { role: string; full_name: string | null } | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (data) { profile = data; break; }
  }

  if (profile?.role !== "admin") redirect("/login");

  // Fetch all organisations for the workspace switcher
  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, name, slug")
    .order("name");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f9fafb" }}>
      <Topbar
        role="admin"
        fullName={profile.full_name}
        email={user.email ?? ""}
        orgs={orgs ?? []}
        currentOrg={null}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar role="admin" />
        <main style={{ flex: 1, overflowY: "auto", background: "#f9fafb" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
