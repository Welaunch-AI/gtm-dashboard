"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function EyeIcon({ off }: { off?: boolean }) {
  if (off) return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get("email");
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      setError(authError?.message ?? "Invalid credentials");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, org_id")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      setError("Could not load your profile. Please try again.");
      setLoading(false);
      return;
    }

    let workspacePath = "/login";
    if (profile.role === "admin") {
      workspacePath = "/admin";
    } else if (profile.org_id) {
      const { data: orgRow } = await supabase
        .from("organisations")
        .select("slug")
        .eq("id", profile.org_id)
        .maybeSingle();
      workspacePath = `/workspace/${orgRow?.slug || profile.org_id}`;
    }

    const safeNext =
      next !== "/" &&
      next.startsWith("/") &&
      next !== "/workspace" &&
      !next.startsWith("/workspace?")
        ? next
        : workspacePath;

    window.location.href = safeNext;
  }

  return (
    <div style={{
      width: "100%", maxWidth: 420,
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 20,
      padding: "44px 40px",
      boxShadow: "0 4px 32px rgba(0,0,0,0.07)",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
        <div style={{
          width: 36, height: 36,
          background: "#111827",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px",
        }}>W</div>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.4px" }}>WeLaunch</span>
      </div>

      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.6px", marginBottom: 6 }}>
        Welcome back
      </h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 32 }}>
        Sign in to your workspace
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{
              padding: "11px 14px", borderRadius: 10,
              border: "1.5px solid #e5e7eb", background: "#f9fafb",
              color: "#111827", fontSize: 14.5, outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = "#111827")}
            onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: "11px 44px 11px 14px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: "#f9fafb",
                color: "#111827", fontSize: 14.5, outline: "none",
                width: "100%", boxSizing: "border-box" as const,
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target.style.borderColor = "#111827")}
              onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                border: "none", background: "none", cursor: "pointer",
                color: "#9ca3af", display: "flex", alignItems: "center", padding: 2,
              }}
              title={showPwd ? "Hide password" : "Show password"}
            >
              <EyeIcon off={showPwd} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            fontSize: 13, color: "#dc2626",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 8, padding: "10px 14px",
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 4, padding: "13px",
            borderRadius: 10, border: "none",
            background: "#111827", color: "white",
            fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "-0.2px", opacity: loading ? 0.7 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: 24, fontSize: 13.5, color: "#9ca3af", textAlign: "center" }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" style={{ color: "#111827", fontWeight: 600, textDecoration: "none" }}>
          Request access
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9fafb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
