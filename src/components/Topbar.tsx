"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import AvatarImage from "@/components/ui/AvatarImage";

type Org = { id: string; name: string; slug: string; logo_url?: string | null };

type Props = {
  role: "admin" | "client";
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  orgs: Org[];
  currentOrg: Org | null;
};

export default function Topbar({ role, fullName, email, avatarUrl, orgs, currentOrg }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const displayName = fullName || email.split("@")[0];
  const avatarLabel = fullName || email;

  return (
    <header style={S.topbar}>
      {/* Aligned to the sidebar's width + padding so the switcher sits directly above the nav */}
      <div style={S.left}>
        <WorkspaceSwitcher orgs={orgs} currentOrg={currentOrg} isAdmin={role === "admin"} />
      </div>

      <div style={S.right}>
        <div ref={ref} style={{ position: "relative" }}>
          <button onClick={() => setOpen(!open)} style={S.profileBtn}>
            <AvatarImage src={avatarUrl} label={avatarLabel} size={32} />
            <div style={S.profileInfo}>
              <span style={S.profileName}>{displayName}</span>
              <span style={S.profileRole}>{role}</span>
            </div>
            <ChevronDown />
          </button>

          {open && (
            <div style={S.dropdown}>
              <div style={S.dropdownHeader}>
                <p style={S.dropdownName}>{displayName}</p>
                <p style={S.dropdownEmail}>{email}</p>
              </div>
              <div style={S.divider} />
              <button onClick={handleSignOut} style={S.signOutBtn}>
                <LogOutIcon />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const S: Record<string, React.CSSProperties> = {
  topbar: {
    height: 58,
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  // Fixed to the same width + horizontal padding as the Sidebar (220px, 10px)
  // so the workspace switcher lines up exactly above the nav items below it.
  left: {
    display: "flex",
    alignItems: "center",
    width: 220,
    minWidth: 220,
    padding: "0 10px",
    borderRight: "1px solid #e5e7eb",
    boxSizing: "border-box",
  },
  right: { display: "flex", alignItems: "center", padding: "0 24px" },
  profileBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    cursor: "pointer",
    padding: "6px 12px 6px 8px",
    borderRadius: 10,
    transition: "background 0.1s",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#111827",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  profileInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 1,
  },
  profileName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
    lineHeight: 1.2,
  },
  profileRole: {
    fontSize: 11,
    color: "#9ca3af",
    textTransform: "capitalize",
    lineHeight: 1.2,
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    minWidth: 210,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    zIndex: 100,
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: "14px 16px",
  },
  dropdownName: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#111827",
    marginBottom: 2,
  },
  dropdownEmail: {
    fontSize: 12,
    color: "#9ca3af",
  },
  divider: { height: 1, background: "#f3f4f6" },
  signOutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    padding: "11px 16px",
    border: "none",
    background: "none",
    color: "#6b7280",
    fontSize: 13.5,
    cursor: "pointer",
    textAlign: "left",
  },
};

function ChevronDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function LogOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
