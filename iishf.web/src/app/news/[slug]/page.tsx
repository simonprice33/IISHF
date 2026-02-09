import { NewsArticle } from "@/components/News/NewsArticle";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  return <NewsArticle slug={slug} />;
}