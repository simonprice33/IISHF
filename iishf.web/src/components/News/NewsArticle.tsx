"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { buildNewsThumbUrl } from "@/lib/newsShared";
import { formatDateUKFromUtcIso } from "@/lib/date";
import styles from "./NewsArticle.module.css";

type ArticleData = {
  id: string;
  title: string;
  author?: string | null;
  postDate?: string | null;
  createDate?: string | null;
  leadIn?: string | null;
  articleImage?: unknown | null;
  content?: string | null;
  categories?: string[];
};

type RelatedArticle = {
  id: string;
  title: string;
  url: string;
  leadIn?: string | null;
  articleImage?: unknown | null;
};

type Props = {
  slug: string;
};

function normalizeIsoToUtc(value?: string | null): string | null {
  if (!value) return null;
  const s = value.trim();
  if (!s) return null;
  if (/[zZ]$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) return s;
  return `${s}Z`;
}

export function NewsArticle({ slug }: Props) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchArticle() {
      try {
        setLoading(true);
        setError(null);

        // Fetch article by route path
        const res = await fetch(
          `/api/umbraco/delivery/api/v2/content/item/news/${encodeURIComponent(slug)}/`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Article not found");
          }
          throw new Error(`Failed to load article: ${res.status}`);
        }

        const data = await res.json();
        const props = data.properties ?? {};

        const articleData: ArticleData = {
          id: data.id ?? "",
          title: props.articleTitle ?? data.name ?? "Untitled",
          author: props.author ?? null,
          postDate: normalizeIsoToUtc(props.postDate) ?? null,
          createDate: data.createDate ?? null,
          leadIn: props.leadIn ?? null,
          articleImage: props.articleImage ?? null,
          content: props.articleContent?.markup ?? null,
          categories: Array.isArray(props.newsCategories)
            ? props.newsCategories.filter(Boolean)
            : [],
        };

        if (!cancelled) {
          setArticle(articleData);
        }

        // Fetch other news for sidebar
        const newsRes = await fetch(
          `/api/umbraco/delivery/api/v2/content?fetch=children:news&take=100`,
          { cache: "no-store" }
        );

        if (newsRes.ok) {
          const newsData = await newsRes.json();
          const items = Array.isArray(newsData.items) ? newsData.items : [];
          
          const related: RelatedArticle[] = items
            .filter((item: any) => item.id !== data.id) // Exclude current article
            .slice(0, 3)
            .map((item: any) => ({
              id: item.id,
              title: item.properties?.articleTitle ?? item.name ?? "Untitled",
              url: item.route?.path ?? "#",
              leadIn: item.properties?.leadIn ?? null,
              articleImage: item.properties?.articleImage ?? null,
            }));

          if (!cancelled) {
            setRelatedArticles(related);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchArticle();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>Loading article...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.error}>
          <h1>Article Not Found</h1>
          <p>{error ?? "The requested article could not be found."}</p>
          <Link href="/news" className={styles.backLinkError}>
            ← Back to News
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = buildNewsThumbUrl(article.articleImage);
  const displayDate = formatDateUKFromUtcIso(article.postDate ?? article.createDate ?? null);

  return (
    <div className={styles.page}>
      {/* Hero Image Header */}
      {imageUrl && (
        <div
          className={styles.hero}
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          <div className={styles.heroOverlay}></div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* Article Content - Left Column */}
          <main className={styles.mainContent}>
            <article className={styles.article}>
              {/* Back link */}
              <Link href="/news" className={styles.backLink}>
                ← Back to News
              </Link>

              {/* Title */}
              <h1 className={styles.title}>{article.title}</h1>

              {/* Article Content */}
              {article.content && (
                <div
                  className={styles.content}
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              )}

              {/* Author & Date */}
              <div className={styles.authorSection}>
                {article.author && (
                  <span>Authored By: {article.author}</span>
                )}
                {displayDate && <span>{displayDate}</span>}
              </div>

              {/* Social Share */}
              <footer className={styles.shareFooter}>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.shareLink}
                >
                  <svg className={styles.shareIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.shareLink}
                >
                  <svg className={styles.shareIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </footer>

              {/* Tags */}
              {article.categories && article.categories.length > 0 && (
                <div className={styles.tags}>
                  {article.categories.map((cat) => (
                    <Link
                      key={cat}
                      href={`/news?cat=${encodeURIComponent(cat)}`}
                      className={styles.tag}
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          </main>

          {/* Sidebar - Right Column */}
          <aside className={styles.sidebar}>
            <h2 className={styles.sidebarTitle}>Other News</h2>

            {relatedArticles.map((related) => {
              const relatedThumb = buildNewsThumbUrl(related.articleImage);
              return (
                <Link key={related.id} href={related.url} className={styles.relatedCard}>
                  {relatedThumb && (
                    <img
                      src={relatedThumb}
                      alt={related.title}
                      className={styles.relatedImage}
                      loading="lazy"
                    />
                  )}
                  <div className={styles.relatedBody}>
                    <h5 className={styles.relatedTitle}>{related.title}</h5>
                    {related.leadIn && (
                      <p className={styles.relatedText}>{related.leadIn}</p>
                    )}
                  </div>
                  <div className={styles.relatedOverlay}>
                    <span className={styles.relatedOverlayText}>Read Now</span>
                  </div>
                </Link>
              );
            })}
          </aside>
        </div>
      </div>
    </div>
  );
}