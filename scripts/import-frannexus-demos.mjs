/**
 * Import Frannexus demo tracker appointments from CSV.
 * Usage: node scripts/import-frannexus-demos.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

const ORG_ID = "29674a7c-2290-49fb-b769-d8cfe2a1b53f";
const CSV_PATH = "c:/Users/Sivasish/Downloads/Frannexus - WeLaunch - Appointments Booked  - Meetings Booked .csv";

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

function clean(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

function mapStatus(status) {
  const s = clean(status);
  if (!s) return null;
  if (DEMO_CALL_STATUSES.includes(s)) return s;
  return s;
}

const DEMO_CALL_STATUSES = ["Scheduled", "No Show", "Call Done", "Rescheduled", "N/A", "Need to Update"];

function parseScheduledDate(label) {
  if (!label) return null;
  const firstLine = label.split("\n")[0]?.trim() ?? "";
  const year = 2025;
  const d = new Date(`${firstLine}, ${year}`);
  if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 2024 && d.getFullYear() <= 2027) {
    return d.toISOString();
  }
  return null;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const wb = XLSX.readFile(CSV_PATH);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

  const records = rows
    .map((r) => {
      const name = clean(r["Name "] ?? r["Name"]);
      if (!name) return null;
      const scheduledLabel = clean(r["Scheduled On "] ?? r["Scheduled On"]);
      const extra = clean(r["__EMPTY"]);
      let demoStatus = mapStatus(r["Status "] ?? r["Status"]);
      let remarks = clean(r["Remarks "] ?? r["Remarks"]);
      if (!demoStatus && extra === "Need to Update") {
        demoStatus = "Need to Update";
      }
      return {
        org_id: ORG_ID,
        record_type: "demo",
        contact_name: name,
        status: "Demo Booked",
        lead_source: "Other",
        campaign: clean(r["Campaign "] ?? r["Campaign"]),
        scheduled_label: scheduledLabel,
        scheduled_at: parseScheduledDate(scheduledLabel),
        demo_status: demoStatus,
        call_taken_by: clean(r["Call Taken By "] ?? r["Call Taken By"]),
        comments: clean(r["Comments "] ?? r["Comments"]),
        remarks,
        ai_memory: clean(r["AI Memory (Conversation) "] ?? r["AI Memory (Conversation)"]),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  console.log(`Parsed ${records.length} demo appointments`);

  const { data: existing } = await sb
    .from("crm_contacts")
    .select("contact_name, scheduled_label")
    .eq("org_id", ORG_ID)
    .eq("record_type", "demo");

  const seen = new Set(
    (existing ?? []).map((r) => `${(r.contact_name ?? "").toLowerCase()}|${(r.scheduled_label ?? "").toLowerCase()}`)
  );

  const toInsert = records.filter((r) => {
    const key = `${r.contact_name.toLowerCase()}|${(r.scheduled_label ?? "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Inserting ${toInsert.length} new demos (${records.length - toInsert.length} skipped as duplicates)`);

  if (toInsert.length === 0) {
    console.log("Nothing new to insert.");
    return;
  }

  const { error } = await sb.from("crm_contacts").insert(toInsert);
  if (error) throw error;

  const { count } = await sb
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("org_id", ORG_ID)
    .eq("record_type", "demo");

  console.log(`Done. Frannexus demo tracker total: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
