// src/lib/date.ts

/**
 * Formats an ISO date string into dd/MM/yyyy (UK) using LOCAL timezone.
 * (Keep this for any existing uses that expect local behaviour.)
 */
export function formatDateUK(value?: string): string {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats an ISO date string into dd/MM/yyyy (UK) using UTC timezone.
 * This avoids "date shifting" when Umbraco returns a time without timezone suffix.
 */
export function formatDateUKFromUtcIso(iso?: string | null): string {
  if (!iso) return "";

  const s = iso.trim();
  if (!s) return "";

  // If Umbraco returns "2026-01-06T00:00:00" (no timezone), treat it as UTC.
  const hasTz = /[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s);
  const normalized = hasTz ? s : `${s}Z`;

  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
