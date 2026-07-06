"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/logActivity";

// ── Types ─────────────────────────────────────────────────────────────────────

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "To Do" | "In Progress" | "In Review" | "Done";
  priority: "Low" | "Medium" | "High";
  section: string | null;
  owner_name: string | null;
  due_date: string | null;
  created_at: string;
  org_id: string | null;
};

type Subtask = {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
};

type Comment = {
  id: string;
  task_id: string;
  author: string | null;
  content: string;
  created_at: string;
};

type Goal = {
  id: string;
  title: string;
  period: "week" | "month";
  completed: boolean;
  org_id: string | null;
};

const STATUSES = ["To Do", "In Progress", "In Review", "Done"] as const;
const PRIORITIES = ["Low", "Medium", "High"] as const;
const SECTIONS = ["Onboarding", "Strategy", "Content", "Outreach", "Reporting", "Other"];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "To Do":      { bg: "#f3f4f6", color: "#374151" },
  "In Progress": { bg: "#dbeafe", color: "#1d4ed8" },
  "In Review":  { bg: "#fef3c7", color: "#92400e" },
  "Done":       { bg: "#d1fae5", color: "#065f46" },
};
const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  Low:    { bg: "#f0fdf4", color: "#16a34a" },
  Medium: { bg: "#fef9c3", color: "#a16207" },
  High:   { bg: "#fee2e2", color: "#b91c1c" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ text, colorMap }: { text: string; colorMap: Record<string, { bg: string; color: string }> }) {
  const c = colorMap[text] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: c.bg, color: c.color, letterSpacing: "0.2px", whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}

function Select({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <span style={S.fieldLabel}>{label}</span>}
      <select value={value} onChange={e => onChange(e.target.value)} style={S.select}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Modal({ children, onClose, width = 560 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...S.modal, maxWidth: width }}>
        {children}
      </div>
    </div>
  );
}

// ── New Task Modal ─────────────────────────────────────────────────────────────

function NewTaskModal({ orgId, authorName, onClose, onCreated }: { orgId: string | null; authorName: string; onClose: () => void; onCreated: (t: Task) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [section, setSection] = useState("Onboarding");
  const [owner, setOwner] = useState(authorName);
  const [status, setStatus] = useState<Task["status"]>("To Do");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.from("tasks").insert({
      title: title.trim(), description: description.trim() || null,
      section, owner_name: owner || null, status, priority,
      due_date: dueDate || null, org_id: orgId,
    }).select().single();
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (data) onCreated(data as Task);
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <div style={S.modalHeader}>
        <h2 style={S.modalTitle}>New task</h2>
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>
      <div style={S.modalBody}>
        <div style={S.fieldGroup}>
          <span style={S.fieldLabel}>Title</span>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs doing?" style={S.input} onKeyDown={e => e.key === "Enter" && handleCreate()} />
        </div>
        <div style={S.fieldGroup}>
          <span style={S.fieldLabel}>Description</span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add more detail..." style={{ ...S.input, minHeight: 80, resize: "vertical" }} />
        </div>
        <div style={S.twoCol}>
          <Select label="Section" value={section} options={SECTIONS} onChange={setSection} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={S.fieldLabel}>Owner</span>
            <input value={owner} onChange={e => setOwner(e.target.value)} style={S.input} placeholder="Owner name" />
          </div>
        </div>
        <div style={S.twoCol}>
          <Select label="Status" value={status} options={[...STATUSES]} onChange={v => setStatus(v as Task["status"])} />
          <Select label="Priority" value={priority} options={[...PRIORITIES]} onChange={v => setPriority(v as Task["priority"])} />
        </div>
        <div style={S.fieldGroup}>
          <span style={S.fieldLabel}>Due date</span>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={S.input} />
        </div>
        {error && <p style={{ color: "#dc2626", fontSize: 12 }}>{error}</p>}
      </div>
      <div style={S.modalFooter}>
        <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
        <button onClick={handleCreate} disabled={loading} style={S.primaryBtn}>
          {loading ? "Creating…" : "Create task"}
        </button>
      </div>
    </Modal>
  );
}

// ── Task Detail Modal ─────────────────────────────────────────────────────────

function TaskDetailModal({ task, authorName, onClose, onUpdated, onDeleted }: { task: Task; authorName: string; onClose: () => void; onUpdated: (t: Task) => void; onDeleted: (id: string) => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [owner, setOwner] = useState(task.owner_name ?? "");
  const [section, setSection] = useState(task.section ?? "Onboarding");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.from("subtasks").select("*").eq("task_id", task.id).order("created_at").then(({ data }) => setSubtasks(data ?? []));
    sb.from("task_comments").select("*").eq("task_id", task.id).order("created_at").then(({ data }) => setComments(data ?? []));
  }, [task.id]);

  async function save(patch: Partial<Task>) {
    setSaving(true);
    const sb = createClient();
    const { data } = await sb.from("tasks").update(patch).eq("id", task.id).select().single();
    setSaving(false);
    if (data) onUpdated(data as Task);
  }

  async function handleBlurTitle() { if (title !== task.title) save({ title }); }
  async function handleBlurDesc() { if (description !== (task.description ?? "")) save({ description: description || null }); }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    const sb = createClient();
    const { data } = await sb.from("subtasks").insert({ task_id: task.id, title: newSubtask.trim() }).select().single();
    if (data) setSubtasks(p => [...p, data as Subtask]);
    setNewSubtask("");
  }

  async function toggleSubtask(sub: Subtask) {
    const sb = createClient();
    await sb.from("subtasks").update({ completed: !sub.completed }).eq("id", sub.id);
    setSubtasks(p => p.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s));
  }

  async function deleteSubtask(id: string) {
    const sb = createClient();
    await sb.from("subtasks").delete().eq("id", id);
    setSubtasks(p => p.filter(s => s.id !== id));
  }

  async function handlePostComment() {
    if (!newComment.trim()) return;
    const sb = createClient();
    const { data } = await sb.from("task_comments").insert({ task_id: task.id, author: authorName, content: newComment.trim() }).select().single();
    if (data) setComments(p => [...p, data as Comment]);
    setNewComment("");
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    const sb = createClient();
    await sb.from("tasks").delete().eq("id", task.id);
    onDeleted(task.id);
    onClose();
  }

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Modal onClose={onClose} width={640}>
      <div style={S.modalHeader}>
        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={handleBlurTitle} style={{ ...S.input, fontWeight: 700, fontSize: 17, border: "none", padding: "0", background: "transparent", flex: 1 }} />
        <button onClick={onClose} style={S.closeBtn}><XIcon /></button>
      </div>
      <div style={{ ...S.modalBody, gap: 20 }}>
        <div style={S.twoCol}>
          <Select label="Status" value={status} options={[...STATUSES]} onChange={v => { setStatus(v as Task["status"]); save({ status: v as Task["status"] }); }} />
          <Select label="Priority" value={priority} options={[...PRIORITIES]} onChange={v => { setPriority(v as Task["priority"]); save({ priority: v as Task["priority"] }); }} />
        </div>
        <div style={S.twoCol}>
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Owner</span>
            <input value={owner} onChange={e => setOwner(e.target.value)} onBlur={() => save({ owner_name: owner || null })} style={S.input} placeholder="—" />
          </div>
          <Select label="Section" value={section} options={SECTIONS} onChange={v => { setSection(v); save({ section: v }); }} />
        </div>
        <div style={S.twoCol}>
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Due date</span>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} onBlur={() => save({ due_date: dueDate || null })} style={S.input} />
          </div>
          <div style={S.fieldGroup}>
            <span style={S.fieldLabel}>Created</span>
            <p style={{ fontSize: 13, color: "#6b7280", paddingTop: 8 }}>{fmt(task.created_at)} · by {authorName}</p>
          </div>
        </div>
        <div style={S.fieldGroup}>
          <span style={S.fieldLabel}>Description</span>
          <textarea value={description} onChange={e => setDescription(e.target.value)} onBlur={handleBlurDesc} style={{ ...S.input, minHeight: 80, resize: "vertical" }} placeholder="Add details..." />
        </div>

        {/* Subtasks */}
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 10 }}>Subtasks</p>
          {subtasks.length === 0 && <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>No subtasks yet.</p>}
          {subtasks.map(sub => (
            <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <input type="checkbox" checked={sub.completed} onChange={() => toggleSubtask(sub)} style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#111827" }} />
              <span style={{ flex: 1, fontSize: 13, color: sub.completed ? "#9ca3af" : "#374151", textDecoration: sub.completed ? "line-through" : "none" }}>{sub.title}</span>
              <button onClick={() => deleteSubtask(sub.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#d1d5db", padding: 2 }}><XIcon size={12} /></button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddSubtask()} placeholder="Add subtask..." style={{ ...S.input, flex: 1 }} />
            <button onClick={handleAddSubtask} style={{ ...S.primaryBtn, padding: "8px 14px" }}>+ Add</button>
          </div>
        </div>

        {/* Comments */}
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 10 }}>Comments</p>
          {comments.length === 0 && <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>No comments yet.</p>}
          {comments.map(c => (
            <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{c.author ?? "Unknown"}</span>
                <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{fmt(c.created_at)}</span>
              </div>
              <p style={{ fontSize: 13, color: "#374151" }}>{c.content}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment..." style={{ ...S.input, flex: 1, minHeight: 60, resize: "vertical" }} />
            <button onClick={handlePostComment} style={{ ...S.primaryBtn, alignSelf: "flex-end" }}>Post</button>
          </div>
        </div>

        {saving && <p style={{ fontSize: 12, color: "#9ca3af" }}>Saving…</p>}
      </div>
      <div style={{ ...S.modalFooter, justifyContent: "space-between" }}>
        <button onClick={handleDelete} style={S.deleteBtn}><TrashIcon /> Delete task</button>
        <button onClick={onClose} style={S.primaryBtn}>Close</button>
      </div>
    </Modal>
  );
}

// ── Goals Sidebar ─────────────────────────────────────────────────────────────

function GoalsSidebar({ orgId }: { orgId: string | null }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newWeek, setNewWeek] = useState("");
  const [newMonth, setNewMonth] = useState("");

  useEffect(() => {
    const sb = createClient();
    const q = sb.from("goals").select("*").order("created_at");
    (orgId ? q.eq("org_id", orgId) : q).then(({ data }) => setGoals(data ?? []));
  }, [orgId]);

  async function addGoal(period: "week" | "month") {
    const title = period === "week" ? newWeek.trim() : newMonth.trim();
    if (!title) return;
    const sb = createClient();
    const { data } = await sb.from("goals").insert({ title, period, org_id: orgId }).select().single();
    if (data) setGoals(p => [...p, data as Goal]);
    period === "week" ? setNewWeek("") : setNewMonth("");
  }

  async function toggleGoal(g: Goal) {
    const sb = createClient();
    await sb.from("goals").update({ completed: !g.completed }).eq("id", g.id);
    setGoals(p => p.map(x => x.id === g.id ? { ...x, completed: !x.completed } : x));
  }

  async function deleteGoal(id: string) {
    const sb = createClient();
    await sb.from("goals").delete().eq("id", id);
    setGoals(p => p.filter(g => g.id !== id));
  }

  const week = goals.filter(g => g.period === "week");
  const month = goals.filter(g => g.period === "month");

  function GoalGroup({ period, list, newVal, setNew }: { period: "week" | "month"; list: Goal[]; newVal: string; setNew: (v: string) => void }) {
    const done = list.filter(g => g.completed).length;
    return (
      <div style={S.goalGroup}>
        <div style={S.goalGroupHeader}>
          <span style={S.goalGroupTitle}>{period === "week" ? "This Week's Goals" : "This Month's Goals"}</span>
          <span style={S.goalCount}>{done} / {list.length} done</span>
        </div>
        {list.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af", padding: "6px 0" }}>No goals yet.</p>}
        {list.map(g => (
          <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0" }}>
            <input type="checkbox" checked={g.completed} onChange={() => toggleGoal(g)} style={{ cursor: "pointer", accentColor: "#111827" }} />
            <span style={{ flex: 1, fontSize: 13, color: g.completed ? "#9ca3af" : "#374151", textDecoration: g.completed ? "line-through" : "none" }}>{g.title}</span>
            <button onClick={() => deleteGoal(g.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#d1d5db" }}><XIcon size={11} /></button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input value={newVal} onChange={e => setNew(e.target.value)} onKeyDown={e => e.key === "Enter" && addGoal(period)} placeholder="+ Add goal" style={{ ...S.input, fontSize: 12.5, padding: "5px 8px", flex: 1 }} />
          {newVal && <button onClick={() => addGoal(period)} style={{ ...S.primaryBtn, padding: "5px 10px", fontSize: 12 }}>Add</button>}
        </div>
      </div>
    );
  }

  return (
    <aside style={S.goalsSidebar}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <TargetIcon />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }}>Goals</span>
      </div>
      <GoalGroup period="week" list={week} newVal={newWeek} setNew={setNewWeek} />
      <GoalGroup period="month" list={month} newVal={newMonth} setNew={setNewMonth} />
    </aside>
  );
}

// ── Main TasksPage ─────────────────────────────────────────────────────────────

type Props = { orgId: string | null; authorName: string; userId?: string; userRole?: string; orgName?: string };

export default function TasksPage({ orgId, authorName, userId, userRole, orgName }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState("All statuses");
  const [filterOwner, setFilterOwner] = useState("All owners");
  const [view, setView] = useState<"list" | "board">("list");

  const load = useCallback(async () => {
    setLoading(true);
    const sb = createClient();
    const q = sb.from("tasks").select("*").order("created_at", { ascending: false });
    if (orgId) q.eq("org_id", orgId);
    const { data } = await q;
    setTasks(data ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter(t => {
    if (filterStatus !== "All statuses" && t.status !== filterStatus) return false;
    if (filterOwner !== "All owners" && t.owner_name !== filterOwner) return false;
    return true;
  });

  const owners = ["All owners", ...Array.from(new Set(tasks.map(t => t.owner_name).filter(Boolean))) as string[]];

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).replace(",", "") : "—";

  return (
    <div style={S.pageWrap}>
      <div style={S.mainCol}>
        {/* Header */}
        <div style={S.pageHeader}>
          <div>
            <h1 style={S.pageTitle}>Tasks</h1>
            <p style={S.pageSubtitle}>Track everything in flight between you and the WeLaunch team.</p>
          </div>
          <button onClick={() => setShowNew(true)} style={S.newTaskBtn}>
            <PlusIcon /> New task
          </button>
        </div>

        {/* Filters & view toggle */}
        <div style={S.toolbar}>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={S.filterSelect}>
              <option>All statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={S.filterSelect}>
              {owners.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={S.viewToggle}>
            <button onClick={() => setView("list")} style={{ ...S.viewBtn, ...(view === "list" ? S.viewBtnActive : {}) }}>
              <ListIcon /> List
            </button>
            <button onClick={() => setView("board")} style={{ ...S.viewBtn, ...(view === "board" ? S.viewBtnActive : {}) }}>
              <BoardIcon /> Board
            </button>
          </div>
        </div>

        {/* Task list */}
        {view === "list" ? (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr style={S.thead}>
                  {["Title", "Status", "Priority", "Owner", "Due date"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>No tasks match these filters.</td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id} style={S.tr} onClick={() => setSelected(t)}>
                    <td style={S.tdTitle}>
                      <span style={S.taskIcon}>☰</span>
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 500, color: "#111827" }}>{t.title}</p>
                        {t.section && <p style={{ fontSize: 11.5, color: "#9ca3af" }}>{t.section}</p>}
                      </div>
                    </td>
                    <td style={S.td}><Badge text={t.status} colorMap={STATUS_COLORS} /></td>
                    <td style={S.td}><Badge text={t.priority} colorMap={PRIORITY_COLORS} /></td>
                    <td style={S.td}><span style={{ fontSize: 13, color: "#374151" }}>{t.owner_name ?? "—"}</span></td>
                    <td style={S.td}><span style={{ fontSize: 13, color: "#374151" }}>{fmt(t.due_date)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Board view */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 4 }}>
            {STATUSES.map(col => (
              <div key={col} style={S.boardCol}>
                <div style={S.boardColHeader}>
                  <Badge text={col} colorMap={STATUS_COLORS} />
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.filter(t => t.status === col).length}</span>
                </div>
                {filtered.filter(t => t.status === col).map(t => (
                  <div key={t.id} style={S.boardCard} onClick={() => setSelected(t)}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 8 }}>{t.title}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Badge text={t.priority} colorMap={PRIORITY_COLORS} />
                      <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{fmt(t.due_date)}</span>
                    </div>
                    {t.owner_name && <p style={{ fontSize: 11.5, color: "#6b7280", marginTop: 6 }}>{t.owner_name}</p>}
                  </div>
                ))}
                <button onClick={() => setShowNew(true)} style={S.boardAddBtn}>+ Add task</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goals sidebar */}
      <GoalsSidebar orgId={orgId} />

      {/* Modals */}
      {showNew && (
        <NewTaskModal orgId={orgId} authorName={authorName} onClose={() => setShowNew(false)} onCreated={t => {
          setTasks(p => [t, ...p]);
          if (userId && userRole) logActivity({ orgId, userId, userName: authorName, userRole, eventType: "Task created", description: `${authorName} created "${t.title}"`, targetLabel: t.title });
        }} />
      )}
      {selected && (
        <TaskDetailModal
          task={selected}
          authorName={authorName}
          onClose={() => setSelected(null)}
          onUpdated={t => { setTasks(p => p.map(x => x.id === t.id ? t : x)); setSelected(t); }}
          onDeleted={id => {
            const t = tasks.find(x => x.id === id);
            setTasks(p => p.filter(x => x.id !== id)); setSelected(null);
            if (userId && userRole && t) logActivity({ orgId, userId, userName: authorName, userRole, eventType: "Task updated", description: `${authorName} deleted "${t.title}"`, targetLabel: t.title });
          }}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  pageWrap: { display: "flex", gap: 0, padding: "28px 28px 28px 28px", height: "100%", overflow: "hidden" },
  mainCol: { flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0, overflow: "auto", paddingRight: 24 },
  pageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.4px" },
  pageSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 3 },
  newTaskBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  filterSelect: { padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", fontSize: 13, color: "#374151", cursor: "pointer", outline: "none" },
  viewToggle: { display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 8, padding: 3 },
  viewBtn: { display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "none", background: "transparent", fontSize: 13, color: "#6b7280", cursor: "pointer", fontWeight: 500 },
  viewBtnActive: { background: "#ffffff", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  tableWrap: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: { background: "#f9fafb" },
  th: { textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280", letterSpacing: "0.3px", borderBottom: "1px solid #e5e7eb" },
  tr: { borderBottom: "1px solid #f3f4f6", cursor: "pointer", transition: "background 0.1s" },
  tdTitle: { padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 },
  td: { padding: "12px 16px" },
  taskIcon: { fontSize: 14, color: "#d1d5db", flexShrink: 0 },
  boardCol: { background: "#f9fafb", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 200 },
  boardColHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  boardCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", transition: "box-shadow 0.1s" },
  boardAddBtn: { border: "none", background: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer", padding: "4px 0", textAlign: "left" },
  goalsSidebar: { width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16, paddingLeft: 0, overflowY: "auto" },
  goalGroup: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 14px" },
  goalGroupHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  goalGroupTitle: { fontSize: 13, fontWeight: 600, color: "#374151" },
  goalCount: { fontSize: 11.5, color: "#9ca3af" },
  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, animation: "fadeIn 0.15s ease" },
  modal: { background: "#ffffff", borderRadius: 16, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", maxHeight: "90vh", animation: "modalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)" },
  modalHeader: { display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6" },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: 700, color: "#111827" },
  closeBtn: { width: 28, height: 28, borderRadius: 6, border: "1px solid #e5e7eb", background: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", flexShrink: 0 },
  modalBody: { padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" },
  modalFooter: { padding: "14px 24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 10 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px" },
  input: { padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13.5, color: "#111827", outline: "none", background: "#ffffff", width: "100%" },
  select: { padding: "9px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13.5, color: "#111827", outline: "none", background: "#ffffff", width: "100%", cursor: "pointer" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  primaryBtn: { padding: "9px 20px", borderRadius: 8, border: "none", background: "#111827", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  cancelBtn: { padding: "9px 20px", borderRadius: 8, border: "1px solid #e5e7eb", background: "none", color: "#374151", fontSize: 13.5, cursor: "pointer" },
  deleteBtn: { display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontSize: 13, cursor: "pointer" },
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function ListIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
function BoardIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="10"/></svg>;
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
}
function TargetIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
