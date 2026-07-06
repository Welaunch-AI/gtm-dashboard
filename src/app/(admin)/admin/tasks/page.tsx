import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TasksPage from "@/components/tasks/TasksPage";

export default async function AdminTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, org_id, full_name").eq("id", user.id).single();

  return (
    <TasksPage
      orgId={null}
      authorName={profile?.full_name ?? user.email?.split("@")[0] ?? "Admin"}
    />
  );
}
