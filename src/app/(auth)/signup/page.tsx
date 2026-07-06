"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Supabase sends a confirmation email by default.
    // If email confirmation is disabled in the project, the user is signed in immediately.
    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Check your email</h1>
          <p style={styles.subtitle}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account, then{" "}
            <span
              style={styles.link}
              onClick={() => router.push("/login")}
              role="button"
            >
              sign in
            </span>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>WeLaunch</h1>
        <p style={styles.subtitle}>Create your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label} htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={styles.input}
            placeholder="Jane Smith"
          />

          <label style={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            placeholder="you@example.com"
          />

          <label style={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            placeholder="Min. 8 characters"
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{" "}
          <Link href="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f5",
  },
  card: {
    background: "#ffffff",
    borderRadius: 12,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    marginBottom: 4,
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 28,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#333",
    marginBottom: 2,
    marginTop: 12,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 14,
    outline: "none",
    width: "100%",
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    marginTop: 8,
  },
  button: {
    marginTop: 20,
    padding: "11px 0",
    borderRadius: 8,
    border: "none",
    background: "#111",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  footer: {
    marginTop: 20,
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  link: {
    color: "#111",
    fontWeight: 600,
    textDecoration: "underline",
    cursor: "pointer",
  },
};
