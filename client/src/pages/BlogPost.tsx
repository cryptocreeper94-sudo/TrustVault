import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowLeft, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@shared/schema";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function readingTime(content: string) {
  const text = content.replace(/<[^>]*>/g, "");
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["/api/blog/posts/by-slug", params.slug],
    enabled: !!params.slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="h-6 w-1/3 shimmer rounded mb-4" />
          <div className="h-10 w-2/3 shimmer rounded mb-6" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 w-full shimmer rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
          <p className="text-muted-foreground mb-4">This blog post doesn't exist or has been removed.</p>
          <Link href="/blog">
            <Button data-testid="link-back-blog">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {post.metaDescription && (
        <head>
          <title>{post.title} | DW Media Studio Blog</title>
          <meta name="description" content={post.metaDescription} />
          {post.keywords && (
            <meta name="keywords" content={post.keywords.join(", ")} />
          )}
          <meta property="og:title" content={post.title} />
          <meta property="og:description" content={post.metaDescription} />
          <meta property="og:type" content="article" />
          {post.coverImageUrl && (
            <meta property="og:image" content={post.coverImageUrl} />
          )}
        </head>
      )}

      <header className="border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/blog">
            <Button variant="ghost" size="sm" data-testid="link-back-blog">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </header>

      <motion.article
        className="max-w-3xl mx-auto px-4 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {post.category && (
          <Badge variant="secondary" className="mb-4" data-testid="badge-post-category">
            {post.category}
          </Badge>
        )}

        <h1
          className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-[var(--font-display)]"
          data-testid="text-post-title"
        >
          {post.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 flex-wrap">
          {post.publishedAt && (
            <span className="flex items-center gap-1" data-testid="text-post-date">
              <Calendar className="w-4 h-4" />
              {formatDate(post.publishedAt as unknown as string)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {readingTime(post.content)} min read
          </span>
        </div>

        {post.coverImageUrl && (
          <div className="w-full rounded-lg overflow-hidden mb-8">
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        <div
          className="prose prose-invert prose-purple max-w-none
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-[var(--font-display)]
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-[var(--font-display)]
            [&_p]:text-foreground/85 [&_p]:leading-relaxed [&_p]:mb-4
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:text-foreground/85
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:text-foreground/85
            [&_li]:mb-1
            [&_strong]:text-foreground [&_strong]:font-semibold
            [&_em]:italic
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
            [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
            [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm"
          dangerouslySetInnerHTML={{ __html: post.content }}
          data-testid="text-post-content"
        />

        {post.keywords && post.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-border/50">
            {post.keywords.map((kw) => (
              <Badge key={kw} variant="outline" className="text-xs">
                <Tag className="w-3 h-3 mr-1" />
                {kw}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Part of the Dark Wave Studios ecosystem
          </p>
          <Link href="/blog">
            <Button variant="outline" data-testid="link-more-posts">
              More Articles
            </Button>
          </Link>
        </div>
      </motion.article>
    </div>
  );
}
