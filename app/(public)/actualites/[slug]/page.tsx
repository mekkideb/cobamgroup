import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import ArticleDocumentReader from "@/components/staff/articles/article-document-reader";
import PublicArticleMeta from "@/components/public/articles/public-article-meta";
import PublicArticleSuggestions from "@/components/public/articles/public-article-suggestions";
import { findPublicArticleBySlug } from "@/features/articles/public";

export const dynamic = "force-dynamic";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await findPublicArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article introuvable | COBAM GROUP",
    };
  }

  return {
    title: `${article.title} | COBAM GROUP`,
    description: article.descriptionSeo ?? article.excerpt,
  };
}

export default async function PublicArticleDetailPage({
  params,
}: ArticlePageProps) {
  const { slug } = await params;
  const article = await findPublicArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white text-cobam-dark-blue">
      <section className="border-b border-slate-200 bg-cobam-light-bg/80">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">

          <div className="space-y-6">
            {article.categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {article.categories.map((category) => (
                  <span
                    key={category.id}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                    style={{
                      borderColor: `${category.color}33`,
                      backgroundColor: `${category.color}14`,
                      color: category.color,
                    }}
                  >
                    <span>{category.name}</span>
                    <span>{category.score}%</span>
                  </span>
                ))}
              </div>
            ) : null}

            <h1
              className="max-w-4xl text-4xl font-bold leading-tight text-cobam-dark-blue sm:text-5xl"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              {article.title}
            </h1>

            <PublicArticleMeta
              authors={article.authors}
              createdAt={article.createdAt}
              updatedAt={article.updatedAt}
            />

            {article.coverImageUrl ? (
              <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-[16/9]">
                  <Image
                    src={article.coverImageUrl}
                    alt={article.coverImageAlt ?? article.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ArticleDocumentReader content={article.content} />
        </div>
      </section>

      <section className="border-t border-slate-200 bg-cobam-light-bg/60 py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PublicArticleSuggestions articles={article.suggestions} />
        </div>
      </section>
    </main>
  );
}
