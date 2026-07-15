/**
 * Seeds all rows from the Frannexus appointments CSV into crm_contacts (record_type = 'demo').
 * Usage: node scripts/seed-demo-tracker.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8").replace(/^\uFEFF/, "");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return env;
}

// RFC-4180 compliant CSV parser
function parseCSV(text) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const results = [];
  let row = [], cur = "", inQuote = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuote) {
      if (ch === '"' && normalized[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === ',') { row.push(cur.trim()); cur = ""; }
      else if (ch === "\n") {
        row.push(cur.trim()); cur = "";
        if (row.some(c => c !== "")) results.push(row);
        row = [];
      } else cur += ch;
    }
  }
  row.push(cur.trim());
  if (row.some(c => c !== "")) results.push(row);
  return results;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // List orgs so we can find the right one
  const { data: orgs, error: orgsErr } = await sb.from("organisations").select("id, name, slug").order("name");
  if (orgsErr) { console.error("Could not list orgs:", orgsErr.message); process.exit(1); }

  console.log("\nAvailable organisations:");
  orgs.forEach((o, i) => console.log(`  [${i}] ${o.name} (${o.id})`));

  // Auto-pick Frannexus or first org
  let org = orgs.find(o => o.name.toLowerCase().includes("frannexus") || o.slug?.toLowerCase().includes("frannexus"));
  if (!org) org = orgs[0];
  if (!org) { console.error("No organisation found."); process.exit(1); }
  console.log(`\nInserting into org: ${org.name} (${org.id})\n`);

  const csvPath = "C:\\Users\\user\\Downloads\\Frannexus - WeLaunch - Appointments Booked  - Meetings Booked  (1).csv";
  const text = readFileSync(csvPath, "utf8");
  const rows = parseCSV(text);

  if (rows.length < 2) { console.error("CSV has no data rows."); process.exit(1); }

  // Header row — map to field positions
  const headers = rows[0];
  console.log("Headers found:", headers.slice(0, 9).join(" | "));

  // Column indices (using first 9 columns)
  const COL = {
    name:           headers.findIndex(h => /^name/i.test(h.trim())),
    scheduled_on:   headers.findIndex(h => /scheduled\s*on/i.test(h.trim())),
    campaign:       headers.findIndex(h => /^campaign/i.test(h.trim())),
    status:         headers.findIndex(h => /^status/i.test(h.trim())),
    call_taken_by:  headers.findIndex(h => /call\s*taken\s*by/i.test(h.trim())),
    comments:       headers.findIndex(h => /^comments/i.test(h.trim())),
    remarks:        headers.findIndex(h => /^remarks/i.test(h.trim())),
    ai_memory:      headers.findIndex(h => /ai\s*memory/i.test(h.trim())),
    calendly_notes: headers.findIndex(h => /calendly\s*notes/i.test(h.trim())),
  };
  console.log("Column mapping:", COL);

  const g = (row, key) => {
    const idx = COL[key];
    if (idx < 0 || idx >= row.length) return null;
    const v = row[idx]?.trim();
    return v || null;
  };

  const VALID_DEMO_STATUSES = ["Scheduled", "No Show", "Call Done", "Rescheduled", "N/A", "Need to Update"];

  const records = rows.slice(1).map(row => {
    const name = g(row, "name");
    const statusRaw = g(row, "status");
    const demoStatus = VALID_DEMO_STATUSES.includes(statusRaw) ? statusRaw : (statusRaw || null);

    return {
      org_id:         org.id,
      record_type:    "demo",
      contact_name:   name,
      scheduled_label: g(row, "scheduled_on"),
      campaign:       g(row, "campaign"),
      demo_status:    demoStatus,
      call_taken_by:  g(row, "call_taken_by"),
      comments:       g(row, "comments"),
      remarks:        g(row, "remarks"),
      ai_memory:      g(row, "ai_memory"),
      // calendly_notes inserted separately if column exists
      updated_at:     new Date().toISOString(),
    };
  }).filter(r => r.contact_name || r.scheduled_label || r.campaign);

  const calendlyNotes = rows.slice(1).map(row => {
    const idx = COL.calendly_notes;
    if (idx < 0 || idx >= row.length) return null;
    return row[idx]?.trim() || null;
  });

  console.log(`\nParsed ${records.length} records to insert.`);

  // Try inserting with calendly_notes
  const recordsWithNotes = records.map((r, i) => ({ ...r, calendly_notes: calendlyNotes[i] }));

  const BATCH = 50;
  let total = 0;

  for (let i = 0; i < recordsWithNotes.length; i += BATCH) {
    const batch = recordsWithNotes.slice(i, i + BATCH);
    const { data, error } = await sb.from("crm_contacts").insert(batch).select("id");

    if (error) {
      // Retry without calendly_notes if column missing
      if (error.message.includes("calendly_notes") || error.code === "42703") {
        console.warn("  calendly_notes column not found — inserting without it...");
        const batchBase = records.slice(i, i + BATCH);
        const { data: d2, error: e2 } = await sb.from("crm_contacts").insert(batchBase).select("id");
        if (e2) { console.error(`  Batch ${i}-${i+BATCH} failed:`, e2.message); continue; }
        total += d2?.length ?? 0;
        console.log(`  ✓ Batch ${i+1}-${Math.min(i+BATCH, records.length)}: ${d2?.length ?? 0} rows`);
      } else {
        console.error(`  Batch ${i}-${i+BATCH} failed:`, error.message);
      }
    } else {
      total += data?.length ?? 0;
      console.log(`  ✓ Batch ${i+1}-${Math.min(i+BATCH, recordsWithNotes.length)}: ${data?.length ?? 0} rows`);
    }
  }

  console.log(`\n✅ Done! Inserted ${total} records into Demo Tracker for "${org.name}".`);
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
