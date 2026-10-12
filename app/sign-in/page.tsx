"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <Link className="brand auth-brand" href="/" aria-label="GreenMeter home">
          <span className="meter-logo" aria-hidden="true"><i /></span>
          <span>Green</span><span>Meter</span>
        </Link>
        <p className="auth-eyebrow">Your household workspace</p>
        <h1 id="sign-in-title">Sign in to save your utility history</h1>
        <p>Keep electricity, water, and natural-gas readings private to your account and available across devices.</p>
        <button className="primary-button auth-submit" type="button" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
          Continue with GitHub
        </button>
        <p className="auth-note">GreenMeter receives your account ID, name, email address, and profile image for sign-in. It does not receive your GitHub password.</p>
        <Link className="auth-back" href="/dashboard">Continue with the public demo</Link>
      </section>
    </main>
  );
}
