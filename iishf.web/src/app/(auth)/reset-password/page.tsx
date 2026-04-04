"use client";

import React, { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";

function ResetPasswordForm() {
  const params = useSearchParams();
  const emailFromUrl = params.get("email") ?? "";
  const tokenFromUrl = params.get("token") ?? "";

  const [email, setEmail] = useState(emailFromUrl);
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Reset failed. The link may have expired.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Password updated</h1>
          <p className={styles.subtitle}>Your password has been changed successfully.</p>
          <div className={styles.formSuccess}>
            You can now sign in with your new password.
          </div>
          <hr className={styles.divider} />
          <div className={styles.links}>
            <Link className={styles.link} href="/login">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Enter your new password below.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <div className={styles.formError}>{error}</div>}

          {!emailFromUrl && (
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="email">Email address</label>
              <input
                id="email"
                className={styles.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          {!tokenFromUrl && (
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="token">Reset token</label>
              <input
                id="token"
                className={styles.input}
                type="text"
                placeholder="Paste token from your email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              className={styles.input}
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "Updating…" : "Set New Password"}
          </button>
        </form>

        <hr className={styles.divider} />

        <div className={styles.links}>
          <Link className={styles.link} href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
