/**
 * One-time bulk import of Frannexus contacts from CSV/XLSX exports.
 * Usage: node scripts/import-frannexus-contacts.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

const ORG_ID = "29674a7c-2290-49fb-b769-d8cfe2a1b53f";
const BATCH_SIZE = 500;

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

function parseDate(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;

  // Excel serial date number
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    if (n >= 25000 && n <= 60000) {
      const base = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(base.getTime() + n * 86400000);
      const y = d.getUTCFullYear();
      if (y >= 1990 && y <= 2035) return d.toISOString();
    }
    return null;
  }

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    let year = parseInt(slash[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    if (year < 1990 || year > 2035) return null;
    const d = new Date(year, parseInt(slash[1], 10) - 1, parseInt(slash[2], 10));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return null;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    if (y >= 1990 && y <= 2035) return d.toISOString();
  }
  return null;
}

function clean(v) {
  const s = String(v ?? "").trim();
  return s || null;
}

function uniqueTags(...items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const t = clean(item);
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      out.push(t);
    }
  }
  return out.length ? out : null;
}

function makeContact({
  contact_name,
  phone,
  email,
  lead_source,
  tags,
  remarks,
  last_activity_at,
}) {
  const name = clean(contact_name);
  const em = clean(email);
  const ph = clean(phone);
  if (!name && !em && !ph) return null;

  return {
    org_id: ORG_ID,
    record_type: "contact",
    company: null,
    contact_name: name,
    phone: ph,
    email: em,
    status: "Lead",
    lead_source: clean(lead_source) || "Other",
    tags: tags?.length ? tags : null,
    industry: null,
    deal_size: null,
    scheduled_at: null,
    demo_status: null,
    remarks: clean(remarks),
    last_activity_at: last_activity_at || null,
    created_by: null,
    updated_at: new Date().toISOString(),
  };
}

function dedupeKey(c) {
  if (c.email) return `email:${c.email.toLowerCase()}`;
  if (c.phone && c.contact_name) return `phone:${c.phone}|${c.contact_name.toLowerCase()}`;
  if (c.phone) return `phone:${c.phone}`;
  if (c.contact_name) return `name:${c.contact_name.toLowerCase()}`;
  return null;
}

function readSheet(path, sheetName = null) {
  const wb = XLSX.readFile(path);
  const name = sheetName ?? wb.SheetNames[0];
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
}

function rowToMap(headers, row) {
  const map = {};
  headers.forEach((h, i) => {
    const key = String(h).trim();
    if (key) map[key] = row[i];
  });
  return map;
}

function parseStandardCsv(path, sourceLabel) {
  const rows = readSheet(path);
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => String(h).trim());
  const contacts = [];

  for (const row of dataRows) {
    if (!row.some((c) => String(c).trim())) continue;
    const r = rowToMap(headers, row);
    const first = clean(r["First Name"]);
    const last = clean(r["Last Name"]);
    const name = [first, last].filter(Boolean).join(" ") || null;

    contacts.push(
      makeContact({
        contact_name: name,
        phone: r["Phone"],
        email: r["Email"],
        lead_source: r["Lead Source"] || "Other",
        tags: uniqueTags(
          sourceLabel,
          r["Candidate Pipeline Classification"],
          r["Lead Origin"],
          r["2nd Lead Origin"],
          r["3rd Lead Origin"]
        ),
        remarks: [
          r["Lead ID"] ? `Lead ID: ${r["Lead ID"]}` : null,
          r["Create Date"] ? `Created: ${r["Create Date"]}` : null,
        ]
          .filter(Boolean)
          .join("; ") || null,
        last_activity_at: parseDate(r["Last Activity"]),
      })
    );
  }
  return contacts.filter(Boolean);
}

function parseTgafe2026(path) {
  const rows = readSheet(path);
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => String(h).trim());
  const contacts = [];

  for (const row of dataRows) {
    if (!row.some((c) => String(c).trim())) continue;
    const r = rowToMap(headers, row);
    const name = [r["First Name"], r["Last Name"]].filter((x) => clean(x)).join(" ") || null;
    contacts.push(
      makeContact({
        contact_name: name,
        phone: r["Phone"],
        email: r["Email"],
        lead_source: r["Source"] || "Event",
        tags: uniqueTags("TGAFE 2026", r["Source"]),
        remarks: null,
        last_activity_at: null,
      })
    );
  }
  return contacts.filter(Boolean);
}

function parseFcctgafe(path) {
  const rows = readSheet(path, "FCCTGAFE");
  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => String(h).trim());
  const contacts = [];

  for (const row of dataRows) {
    if (!row.some((c) => String(c).trim())) continue;
    const r = rowToMap(headers, row);
    const phone = clean(r["Person - Phone"]) || clean(r["Alt phone"]);
    contacts.push(
      makeContact({
        contact_name: r["Person - Name"],
        phone,
        email: r["Person - Email"],
        lead_source: r["Person - Lead Source"] || "Event",
        tags: uniqueTags("FCCTGAFE", r["Person - Lead Source"]),
        remarks: r["Date Added"] ? `Added: ${r["Date Added"]}` : null,
        last_activity_at: parseDate(r["Date Added"]),
      })
    );
  }
  return contacts.filter(Boolean);
}

async function main() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const sources = [
    {
      label: "Engaged In Process",
      path: "c:/Users/Sivasish/Downloads/Engaged In Process Leads.csv",
      parse: (p) => parseStandardCsv(p, "Engaged In Process"),
    },
    {
      label: "Partially Engaged",
      path: "c:/Users/Sivasish/Downloads/Partially Engaged Leads (1).csv",
      parse: (p) => parseStandardCsv(p, "Partially Engaged"),
    },
    {
      label: "Boneyard",
      path: "c:/Users/Sivasish/Downloads/Boneyard Leads.csv",
      parse: (p) => parseStandardCsv(p, "Boneyard"),
    },
    {
      label: "TGAFE 2026",
      path: "c:/Users/Sivasish/Downloads/TGAFE 2026 for AI (1).xlsx",
      parse: parseTgafe2026,
    },
    {
      label: "FCCTGAFE",
      path: "c:/Users/Sivasish/Downloads/Adam Gruen Call Center and 2024 & 2025 TGAFE (1).xlsx",
      parse: parseFcctgafe,
    },
  ];

  const all = [];
  for (const src of sources) {
    const list = src.parse(src.path);
    console.log(`${src.label}: ${list.length} contacts parsed`);
    all.push(...list);
  }

  const seen = new Set();
  const unique = [];
  let skippedDupes = 0;
  for (const c of all) {
    const key = dedupeKey(c);
    if (!key) continue;
    if (seen.has(key)) {
      skippedDupes++;
      continue;
    }
    seen.add(key);
    unique.push(c);
  }

  console.log(`Total parsed: ${all.length}, unique: ${unique.length}, intra-file dupes skipped: ${skippedDupes}`);

  // Skip emails already in DB (paginate — default limit is 1000)
  const existingEmails = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page, error: exErr } = await sb
      .from("crm_contacts")
      .select("email")
      .eq("org_id", ORG_ID)
      .not("email", "is", null)
      .range(from, from + pageSize - 1);
    if (exErr) throw exErr;
    if (!page?.length) break;
    for (const r of page) {
      if (r.email) existingEmails.add(r.email.toLowerCase());
    }
    if (page.length < pageSize) break;
    from += pageSize;
  }
  const toInsert = unique.filter((c) => !c.email || !existingEmails.has(c.email.toLowerCase()));
  console.log(`Skipping ${unique.length - toInsert.length} already in DB; inserting ${toInsert.length}`);

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await sb.from("crm_contacts").insert(batch);
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
      throw error;
    }
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${toInsert.length}`);
  }

  const { count } = await sb
    .from("crm_contacts")
    .select("*", { count: "exact", head: true })
    .eq("org_id", ORG_ID)
    .eq("record_type", "contact");

  console.log(`Done. Frannexus contacts in DB: ${count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
