"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

type Member = {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
};

export default function MyAccountPage() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setMember(data);
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    fetchMe();
  }, [router]);

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/login");
    }
  }

  if (loading) {
    return (
      <div className={styles.accountPage}>
        <div className={styles.accountInner}>
          <p style={{ color: "#aaa" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className={styles.accountPage}>
      <div className={styles.accountInner}>
        <h1 className={styles.accountTitle}>
          My <span style={{ color: "#f7941d" }}>Account</span>
        </h1>
        <p className={styles.accountSubtitle}>Manage your IISHF member profile.</p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Profile</h2>

          <div className={styles.profileRow}>
            <span className={styles.profileLabel}>Name</span>
            <span className={styles.profileValue}>{member.name}</span>
          </div>

          <div className={styles.profileRow}>
            <span className={styles.profileLabel}>Email</span>
            <span className={styles.profileValue}>{member.email}</span>
          </div>

          <div className={styles.profileRow}>
            <span className={styles.profileLabel}>Status</span>
            <span
              className={`${styles.badge} ${
                member.isEmailVerified ? styles.badgeVerified : styles.badgePending
              }`}
            >
              {member.isEmailVerified ? "Verified" : "Pending verification"}
            </span>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account Actions</h2>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
