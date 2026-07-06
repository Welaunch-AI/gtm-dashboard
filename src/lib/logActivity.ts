import { createClient } from "@/lib/supabase/client";

interface LogParams {
  orgId: string | null;
  orgName?: string | null;
  userId: string;
  userName: string;
  userRole: string;
  eventType: string;
  description: string;
  targetLabel?: string | null;
}

export async function logActivity(params: LogParams) {
  try {
    const sb = createClient();
    await sb.from("activity_log").insert({
      org_id: params.orgId,
      org_name: params.orgName ?? null,
      user_id: params.userId,
      user_name: params.userName,
      user_role: params.userRole,
      event_type: params.eventType,
      description: params.description,
      target_label: params.targetLabel ?? null,
    });
  } catch {
    // Never throw — logging failures should never break the main action
  }
}
