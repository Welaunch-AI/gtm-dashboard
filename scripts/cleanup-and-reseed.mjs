/**
 * Deletes ALL existing demo records for Frannexus and re-inserts cleanly from CSV.
 * Usage: node scripts/cleanup-and-reseed.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const ORG_ID = "29674a7c-2290-49fb-b769-d8cfe2a1b53f"; // Frannexus
const CSV_PATH = "C:\\Users\\user\\Downloads\\Frannexus - WeLaunch - Appointments Booked  - Meetings Booked  (1).csv";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8").replace(/^\uFEFF/, "");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

// Proper RFC-4180 parser that handles multi-line quoted cells
function parseCSV(text) {
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const results = [];
  let row = [], cur = "", inQuote = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuote) {
      if (ch === '"' && s[i + 1] === '"') { cur += '"'; i++; }      // escaped quote
      else if (ch === '"') inQuote = false;                           // closing quote
      else cur += ch;                                                  // content (incl. \n)
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(cur); cur = ""; }
      else if (ch === "\n") {
        row.push(cur); cur = "";
        // Only save non-blank rows
        if (row.some(c => c.trim() !== "")) results.push(row.map(c => c.trim()));
        row = [];
      } else {
        cur += ch;
      }
    }
  }
  // Last field
  row.push(cur);
  if (row.some(c => c.trim() !== "")) results.push(row.map(c => c.trim()));

  return results;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // Step 1: Count + delete all existing demo records for Frannexus
  const { count } = await sb
    .from("crm_contacts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ORG_ID)
    .eq("record_type", "demo");

  console.log(`Found ${count} existing demo records for Frannexus. Deleting all...`);

  const { error: delErr } = await sb
    .from("crm_contacts")
    .delete()
    .eq("org_id", ORG_ID)
    .eq("record_type", "demo");

  if (delErr) { console.error("Delete failed:", delErr.message); process.exit(1); }
  console.log("✓ All existing demo records deleted.\n");

  // Step 2: Parse CSV
  const text = readFileSync(CSV_PATH, "utf8");
  const rows = parseCSV(text);

  if (rows.length < 2) { console.error("CSV has no data rows."); process.exit(1); }

  const headers = rows[0];
  console.log("Headers:", headers.filter(Boolean).join(" | "));

  // Find column indices
  const ci = (pattern) => headers.findIndex(h => pattern.test(h));
  const COL = {
    name:           ci(/^name$/i),
    scheduled_on:   ci(/scheduled\s*on/i),
    campaign:       ci(/^campaign/i),
    status:         ci(/^status/i),
    call_taken_by:  ci(/call\s*taken\s*by/i),
    comments:       ci(/^comments/i),
    remarks:        ci(/^remarks/i),
    ai_memory:      ci(/ai\s*memory/i),
    calendly_notes: ci(/calendly\s*notes/i),
  };
  console.log("Column indices:", COL, "\n");

  const g = (row, key) => {
    const idx = COL[key];
    if (idx < 0 || idx === undefined || idx >= row.length) return null;
    return row[idx]?.trim() || null;
  };

  const dataRows = rows.slice(1);
  console.log(`Total parsed rows: ${dataRows.length}`);

  // Build records — only keep rows where Name column has a proper name (not a fragment)
  const records = [];
  for (const row of dataRows) {
    const name = g(row, "name");
    // Skip rows where "name" looks like a data fragment (starts with $, +1, numbers, questions, etc.)
    if (!name) continue;
    if (/^\$|^\+1|^\d+\s*–|^have you|^what'?s|^when |^how much|^would you|^please |^phone |^questions|^keep my|^leave my|^explore|^invest|^right away|^within|^both$|^yes$|^no$|^career|^investment strategy|^ai:|^crystal|^lead:/i.test(name)) {
      console.log(`  [SKIP] Fragment row: "${name.substring(0, 60)}"`);
      continue;
    }

    records.push({
      org_id:          ORG_ID,
      record_type:     "demo",
      contact_name:    name,
      scheduled_label: g(row, "scheduled_on"),
      campaign:        g(row, "campaign"),
      demo_status:     g(row, "status"),
      call_taken_by:   g(row, "call_taken_by"),
      comments:        g(row, "comments"),
      remarks:         g(row, "remarks"),
      ai_memory:       g(row, "ai_memory"),
      calendly_notes:  g(row, "calendly_notes"),
      updated_at:      new Date().toISOString(),
    });
  }

  console.log(`\nValid records to insert: ${records.length}`);

  // Step 3: Insert in batches
  const BATCH = 50;
  let total = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);

    // Try with calendly_notes first
    let { data, error } = await sb.from("crm_contacts").insert(batch).select("id");

    if (error && (error.message.includes("calendly_notes") || error.code === "42703")) {
      // Retry without calendly_notes column
      console.warn("  calendly_notes column missing — inserting without it...");
      const stripped = batch.map(({ calendly_notes: _, ...rest }) => rest);
      const res = await sb.from("crm_contacts").insert(stripped).select("id");
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error(`  ✗ Batch ${i+1}-${i+BATCH} failed:`, error.message);
    } else {
      total += data?.length ?? 0;
      console.log(`  ✓ Batch ${i+1}-${Math.min(i+BATCH, records.length)}: inserted ${data?.length ?? 0} rows`);
    }
  }

  console.log(`\n✅ Done! ${total} clean records inserted into Demo Tracker for Frannexus.`);
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
