import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TasksPage from "@/components/tasks/TasksPage";

export default async function WorkspaceTasksPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org } = await supabase.from("organisations").select("id, name").eq("slug", orgSlug).single();
  if (!org) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();

  return (
    <TasksPage
      orgId={org.id}
      orgName={org.name}
      authorName={profile?.full_name ?? user.email?.split("@")[0] ?? "User"}
      userId={user.id}
      userRole={profile?.role ?? "client"}
    />
  );
}
