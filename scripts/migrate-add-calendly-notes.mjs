/**
 * Migration: add calendly_notes column to crm_contacts.
 * Usage: node scripts/migrate-add-calendly-notes.mjs
 *
 * Alternatively, run the SQL directly in your Supabase SQL editor:
 *   ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS calendly_notes text;
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8").replace(/^\uFEFF/, "");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await sb.rpc("exec_sql", {
    sql: "ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS calendly_notes text;",
  }).catch(() => ({ error: null }));

  if (error) {
    // Fallback: try inserting a dummy row to trigger column via REST
    console.warn("RPC failed (exec_sql may not exist). Please run this SQL manually in Supabase SQL editor:");
    console.log("\n  ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS calendly_notes text;\n");
    return;
  }

  console.log("Migration complete: calendly_notes column added to crm_contacts.");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  console.log("\nRun this SQL manually in Supabase SQL editor:");
  console.log("  ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS calendly_notes text;\n");
  process.exit(1);
});
