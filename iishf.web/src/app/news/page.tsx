// src/app/news/page.tsx
import { Suspense } from "react";
import NewsPageClient from "@/components/News/NewsPageClient";

export default function NewsPage() {
  // NewsPageClient uses useSearchParams(), so it must be wrapped in Suspense.
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading news…</div>}>
      <NewsPageClient />
    </Suspense>
  );
}
