// src/app/news/page.tsx
import NewsPageClient from "@/components/News/NewsPageClient";

export default function NewsPage() {
  // Client component fetches and manages filters/paging via query string,
  // so this server page stays simple and stable.
  return <NewsPageClient />;
}
