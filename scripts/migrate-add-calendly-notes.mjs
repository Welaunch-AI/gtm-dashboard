/**
 * Migration: add calendly_notes column to crm_contacts.
 * Usage: node scripts/migrate-add-calendly-notes.mjs
 */

import { readFileSync } from "fs";

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
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  // Extract project ref from URL: https://<ref>.supabase.co
  const projectRef = url.replace("https://", "").split(".")[0];

  console.log(`Running migration on project: ${projectRef}`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      query: "ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS calendly_notes text;",
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Management API failed:", text);
    console.log("\nPlease run this SQL manually in your Supabase dashboard → SQL editor:");
    console.log("  ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS calendly_notes text;\n");
    process.exit(1);
  }

  console.log("Migration complete! calendly_notes column added to crm_contacts.");
  console.log("Response:", text);
}

main().catch((err) => {
  console.error("Migration error:", err.message);
  process.exit(1);
});
