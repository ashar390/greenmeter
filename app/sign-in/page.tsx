"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type FormMode = "sign-in" | "register";

export default function SignInPage() {
  const [mode, setMode] = useState<FormMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function changeMode(nextMode: FormMode) {
    setMode(nextMode);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) {
          setError(result.error || "Your account could not be created.");
          return;
        }
      }

      const sessionResponse = await fetch("/api/auth/email-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const sessionResult = await sessionResponse.json() as { error?: string };

      if (!sessionResponse.ok) {
        setError(mode === "register"
          ? "Your account was created, but sign-in did not complete. Try signing in."
          : sessionResult.error || "Email or password is incorrect.");
        if (mode === "register") setMode("sign-in");
        return;
      }

      window.location.assign("/dashboard");
    } catch {
      setError("GreenMeter could not reach the account service. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <Link className="brand auth-brand" href="/" aria-label="GreenMeter home">
          <span className="meter-logo" aria-hidden="true"><i /></span>
          <span>Green</span><span>Meter</span>
        </Link>
        <p className="auth-eyebrow">Your household workspace</p>
        <h1 id="sign-in-title">{mode === "register" ? "Create your GreenMeter account" : "Welcome back"}</h1>
        <p>{mode === "register"
          ? "Start a private workspace for your household utility history."
          : "Sign in to review and update your household utility history."}</p>

        <div className="auth-mode" aria-label="Choose an account action">
          <button type="button" className={mode === "sign-in" ? "active" : ""} onClick={() => changeMode("sign-in")}>Sign in</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>Create account</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              Name
              <input autoComplete="name" maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} />
            </label>
          )}
          <label>
            Email address
            <input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={10} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {mode === "register" && <p className="auth-password-hint">Use at least 10 characters with a letter and a number.</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>
        <button className="auth-provider" type="button" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
          Continue with GitHub
        </button>
        <p className="auth-note">GitHub is optional. GreenMeter never receives your GitHub password.</p>
        <Link className="auth-back" href="/dashboard">Continue with the public demo</Link>
      </section>
    </main>
  );
}
