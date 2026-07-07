"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false),
);

export function useConfirm() {
  return useContext(ConfirmContext);
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: (confirmed: boolean) => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      style={S.overlay}
      onClick={e => { if (e.target === e.currentTarget) onClose(false); }}
    >
      <div style={S.dialog} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div style={S.iconWrap}>
          {state.destructive !== false ? <TrashIcon /> : <AlertIcon />}
        </div>
        <h2 id="confirm-title" style={S.title}>{state.title ?? "Are you sure?"}</h2>
        <p style={S.message}>{state.message}</p>
        <div style={S.actions}>
          <button type="button" onClick={() => onClose(false)} style={S.cancelBtn}>
            {state.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            style={state.destructive !== false ? S.dangerBtn : S.confirmBtn}
          >
            {state.confirmLabel ?? (state.destructive !== false ? "Delete" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  function handleClose(confirmed: boolean) {
    state?.resolve(confirmed);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && <ConfirmDialog state={state} onClose={handleClose} />}
    </ConfirmContext.Provider>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  dialog: {
    background: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 420,
    padding: "28px 28px 24px",
    boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "#fef2f2",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px",
  },
  message: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.5,
    margin: "0 0 24px",
  },
  actions: {
    display: "flex",
    gap: 10,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  confirmBtn: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  dangerBtn: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
