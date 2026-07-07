"use client";

import { useEffect, useRef, useState } from "react";

export type ActionMenuItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
};

type Props = {
  items: ActionMenuItem[];
  buttonStyle?: React.CSSProperties;
  align?: "left" | "right";
};

export default function ActionMenu({ items, buttonStyle, align = "right" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: "relative", flexShrink: 0 }}
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        style={{ ...S.menuBtn, ...buttonStyle }}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <DotsIcon />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            ...S.dropdown,
            ...(align === "right" ? { right: 0 } : { left: 0 }),
          }}
        >
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              style={{
                ...S.menuItem,
                ...(item.danger ? S.menuItemDanger : {}),
              }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                item.onClick();
                setOpen(false);
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = item.danger ? "#fef2f2" : "#f9fafb";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  menuBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#9ca3af",
    padding: 6,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 50,
    minWidth: 160,
    padding: "4px 0",
    overflow: "hidden",
  },
  menuItem: {
    width: "100%",
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 500,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    textAlign: "left",
    color: "#374151",
    whiteSpace: "nowrap",
  },
  menuItemDanger: {
    color: "#dc2626",
  },
};

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}
