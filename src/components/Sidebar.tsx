"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  role: "admin" | "client";
  orgSlug?: string;
};

const CLIENT_NAV = [
  { href: "", label: "Dashboard", icon: GridIcon },
  { href: "/tasks", label: "Tasks", icon: CheckIcon },
  { href: "/knowledge-base", label: "Knowledge Base", icon: BookIcon },
  { href: "/marketing", label: "Marketing", icon: MegaphoneIcon },
  { href: "/voice-agent", label: "Voice Agent", icon: PhoneIcon },
  { href: "/tickets", label: "Tickets", icon: TicketIcon },
  { href: "/demo-tracker", label: "Demo Tracker", icon: TargetIcon },
  { href: "/contacts", label: "Contacts", icon: UsersIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
];

const ADMIN_INTERNAL = [
  { href: "/marketing-dump", label: "Marketing Dump", icon: LayersIcon },
  { href: "/activity-log", label: "Activity Log", icon: ActivityIcon },
];

export default function Sidebar({ role, orgSlug }: Props) {
  const pathname = usePathname();
  // Base must reflect where we currently are, not just the user's role:
  // an admin *viewing* a workspace still needs links to stay inside
  // /workspace/<orgSlug>/..., otherwise every nav click bounces them back
  // to the admin home (which looks like the workspace "reset").
  const base = orgSlug ? `/workspace/${orgSlug}` : "/admin";

  function isActive(href: string) {
    const full = base + href;
    if (href === "") return pathname === base || pathname === base + "/";
    return pathname.startsWith(full);
  }

  return (
    <aside style={S.sidebar}>
      <nav style={S.nav}>
        <div style={S.section}>
          {CLIENT_NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={base + href}
              style={{
                ...S.navItem,
                ...(isActive(href) ? S.navItemActive : {}),
              }}
            >
              <span style={{ ...S.navIcon, ...(isActive(href) ? S.navIconActive : {}) }}>
                <Icon />
              </span>
              <span style={{
                color: isActive(href) ? "#ffffff" : "#374151",
                fontSize: 13.5,
                fontWeight: isActive(href) ? 650 : 500,
                letterSpacing: "-0.1px",
              }}>
                {label}
              </span>
            </Link>
          ))}
        </div>

        {role === "admin" && (
          <div style={S.section}>
            <span style={S.sectionLabel}>Internal</span>
            {ADMIN_INTERNAL.map(({ href, label, icon: Icon }) => {
              const internalActive = pathname.startsWith(`/admin${href}`);
              return (
                <Link
                  key={href}
                  href={`/admin${href}`}
                  style={{
                    ...S.navItem,
                    ...(internalActive ? S.navItemActive : {}),
                  }}
                >
                  <span style={{ ...S.navIcon, ...(internalActive ? S.navIconActive : {}) }}>
                    <Icon />
                  </span>
                  <span style={{ color: internalActive ? "#ffffff" : "#374151", fontSize: 13.5, fontWeight: internalActive ? 650 : 500, letterSpacing: "-0.1px" }}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}

const S: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 224,
    minWidth: 224,
    height: "100%",
    background: "#f9fafb",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #e5e7eb",
    padding: "14px 10px",
  },
  nav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: 600,
    color: "#9ca3af",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    padding: "10px 10px 6px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.1s ease, color 0.1s ease",
    textDecoration: "none",
    willChange: "background",
  },
  navItemActive: {
    background: "#111827",
  },
  navIcon: {
    width: 16,
    height: 16,
    color: "#6b7280",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.1s ease",
  },
  navIconActive: {
    color: "#ffffff",
  },
};

// ── Icons (inline SVGs) ───────────────────────────────────────────────────────

function GridIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function CheckIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>;
}
function BookIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
}
function MegaphoneIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>;
}
function PhoneIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>;
}
function TicketIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 010-6h20a3 3 0 010 6"/><path d="M2 15a3 3 0 000 6h20a3 3 0 000-6"/><path d="M2 9h20M2 15h20"/></svg>;
}
function TargetIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
}
function UsersIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function LayersIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
}
function ActivityIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function ProfileIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
