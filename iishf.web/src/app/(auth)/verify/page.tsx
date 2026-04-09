"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";

function VerifyContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!email || !token) {
      setStatus("error");
      setMessage("Invalid verification link. Please check your email.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(
          `/api/auth/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
          { method: "POST" }
        );
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed. The link may have expired.");
        }
      } catch {
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    }

    verify();
  }, [email, token]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {status === "loading" && (
          <>
            <h1 className={styles.title}>Verifying…</h1>
            <p className={styles.subtitle}>Please wait while we verify your email address.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className={styles.title}>Email Verified</h1>
            <p className={styles.subtitle}>Your account is now active.</p>
            <div className={styles.formSuccess}>
              Your email has been verified successfully. You can now sign in to your account.
            </div>
            <hr className={styles.divider} />
            <div className={styles.links}>
              <Link className={styles.link} href="/login">Sign in</Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className={styles.title}>Verification Failed</h1>
            <p className={styles.subtitle}>Something went wrong.</p>
            <div className={styles.formError}>{message}</div>
            <hr className={styles.divider} />
            <div className={styles.links}>
              <Link className={styles.link} href="/register">Register again</Link>
              <span>or</span>
              <Link className={styles.link} href="/login">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div />}>
      <VerifyContent />
    </Suspense>
  );
}
