"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface InviteData {
  email: string;
  full_name: string | null;
  org_name: string | null;
}

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [accountReadyManualLogin, setAccountReadyManualLogin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();
        if (!res.ok) { setLoadError(data.error ?? "This invite link is invalid."); return; }
        setInvite(data);
        setFullName(data.full_name ?? "");
      } catch {
        setLoadError("Could not load this invite. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (password !== confirmPassword) { setSubmitError("Passwords don't match."); return; }
    if (password.length < 8) { setSubmitError("Password must be at least 8 characters."); return; }

    setSubmitting(true);
    const res = await fetch(`/api/invites/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, full_name: fullName }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setSubmitError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    setDone(true);

    // Sign the new user straight in and drop them into their workspace.
    // Signing in immediately after an admin-side user creation can briefly
    // race the auth backend, so retry a couple of times before giving up.
    const supabase = createClient();
    let signInErr: { message: string } | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 600 * attempt));
      const { error } = await supabase.auth.signInWithPassword({ email: invite!.email, password });
      signInErr = error;
      if (!error) break;
    }

    if (signInErr) {
      setSubmitting(false);
      setAccountReadyManualLogin(true);
      return;
    }

    // Resolve the org slug now (while we have a warm session) so we can
    // navigate directly to /workspace/<slug> rather than the UUID path.
    const supabase2 = createClient();
    const { data: profileRow } = await supabase2
      .from("profiles")
      .select("role, org_id")
      .eq("id", (await supabase2.auth.getUser()).data.user!.id)
      .maybeSingle();

    if (profileRow?.role === "admin") {
      window.location.href = "/admin";
      return;
    }

    if (profileRow?.org_id) {
      const { data: orgRow } = await supabase2
        .from("organisations")
        .select("slug")
        .eq("id", profileRow.org_id)
        .maybeSingle();
      window.location.href = `/workspace/${orgRow?.slug || profileRow.org_id}`;
      return;
    }

    window.location.href = "/";
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.1) 0%, transparent 50%), #0b0d17",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        pointerEvents: "none",
      }} />

      <div className="invite-card">
        <div className="invite-logo">
          <span className="invite-logo-icon">W</span>
          <span className="invite-logo-text">WeLaunch</span>
        </div>

        {loading ? (
          <p className="invite-loading">Loading your invite…</p>
        ) : loadError ? (
          <>
            <h1 className="invite-title">Invite unavailable</h1>
            <p className="invite-subtitle">{loadError}</p>
            <a href="/login" className="invite-link-btn">Go to login</a>
          </>
        ) : accountReadyManualLogin ? (
          <>
            <h1 className="invite-title">Account activated 🎉</h1>
            <p className="invite-subtitle">
              Your password is set. We couldn&apos;t sign you in automatically, but you can log in right away with your new password.
            </p>
            <a href={`/login?email=${encodeURIComponent(invite?.email ?? "")}`} className="invite-link-btn">Go to login</a>
          </>
        ) : done ? (
          <>
            <h1 className="invite-title">You&apos;re all set 🎉</h1>
            <p className="invite-subtitle">Signing you in…</p>
          </>
        ) : (
          <>
            <h1 className="invite-title">Welcome to WeLaunch</h1>
            <p className="invite-subtitle">
              {invite?.org_name ? `You've been invited to the ${invite.org_name} workspace.` : "Set a password to activate your account."}
            </p>

            <form onSubmit={handleSubmit} className="invite-form">
              <div className="field-group">
                <label className="field-label">Email address</label>
                <input value={invite?.email ?? ""} disabled className="field-input field-input-disabled" />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="field-input"
                  placeholder="Your full name"
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="password">Create a password</label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input"
                  placeholder="Min. 8 characters"
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="field-input"
                  placeholder="Repeat password"
                />
              </div>

              {submitError && <div className="invite-error">{submitError}</div>}

              <button type="submit" disabled={submitting} className="invite-btn">
                {submitting ? (
                  <span className="invite-btn-inner">
                    <span className="spinner" />
                    Activating…
                  </span>
                ) : "Activate account & sign in"}
              </button>
            </form>
          </>
        )}

        <style>{`
          .invite-card {
            width: 100%;
            max-width: 420px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px;
            padding: 44px 40px;
            backdrop-filter: blur(20px);
            position: relative;
            z-index: 1;
          }
          .invite-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 32px;
          }
          .invite-logo-icon {
            width: 34px;
            height: 34px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 800;
            color: white;
          }
          .invite-logo-text {
            font-size: 18px;
            font-weight: 700;
            color: white;
            letter-spacing: -0.3px;
          }
          .invite-title {
            font-size: 24px;
            font-weight: 700;
            color: white;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
          }
          .invite-subtitle {
            font-size: 14px;
            color: rgba(255,255,255,0.45);
            margin-bottom: 28px;
            line-height: 1.5;
          }
          .invite-loading { color: rgba(255,255,255,0.5); font-size: 14px; }
          .invite-form {
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
          .field-group {
            display: flex;
            flex-direction: column;
            gap: 7px;
          }
          .field-label {
            font-size: 12.5px;
            font-weight: 500;
            color: rgba(255,255,255,0.5);
            letter-spacing: 0.2px;
            text-transform: uppercase;
          }
          .field-input {
            padding: 12px 14px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.06);
            color: white;
            font-size: 14.5px;
            outline: none;
            transition: border-color 0.15s, background 0.15s;
            width: 100%;
            box-sizing: border-box;
          }
          .field-input::placeholder { color: rgba(255,255,255,0.25); }
          .field-input:focus {
            border-color: rgba(99,102,241,0.6);
            background: rgba(255,255,255,0.08);
          }
          .field-input-disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .invite-error {
            font-size: 13px;
            color: #f87171;
            background: rgba(239,68,68,0.12);
            border: 1px solid rgba(239,68,68,0.2);
            border-radius: 8px;
            padding: 10px 13px;
          }
          .invite-btn {
            margin-top: 4px;
            padding: 13px;
            border-radius: 10px;
            border: none;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: opacity 0.15s, transform 0.15s;
            letter-spacing: -0.2px;
          }
          .invite-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
          .invite-btn:disabled { opacity: 0.6; cursor: not-allowed; }
          .invite-btn-inner {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .invite-link-btn {
            display: inline-block;
            margin-top: 8px;
            padding: 12px 20px;
            border-radius: 10px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
          }
          .spinner {
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
