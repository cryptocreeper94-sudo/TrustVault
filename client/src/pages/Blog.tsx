import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight, Tag, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
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

export default function Blog() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-back-home">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Vault
              </Button>
            </Link>
          </div>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold tracking-tight font-[var(--font-display)]" data-testid="text-blog-title">
              DW Media Studio Blog
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Insights, tutorials, and industry knowledge for digital creators
            </p>
          </div>
          <div className="w-[100px]" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <div className="h-4 w-3/4 shimmer rounded mb-3" />
                <div className="h-3 w-full shimmer rounded mb-2" />
                <div className="h-3 w-2/3 shimmer rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 shimmer rounded-full" />
                  <div className="h-5 w-16 shimmer rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg" data-testid="text-no-posts">
              No blog posts yet. Check back soon for new content.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <Card
                    className="p-6 h-full flex flex-col cursor-pointer hover-elevate transition-all"
                    data-testid={`card-blog-post-${post.id}`}
                  >
                    {post.coverImageUrl && (
                      <div className="w-full h-40 rounded-md overflow-hidden mb-4">
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {post.category && (
                      <Badge variant="secondary" className="mb-3 w-fit text-xs" data-testid={`badge-category-${post.id}`}>
                        {post.category}
                      </Badge>
                    )}
                    <h2
                      className="text-lg font-semibold leading-tight mb-2 font-[var(--font-display)]"
                      data-testid={`text-post-title-${post.id}`}
                    >
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3" data-testid={`text-post-excerpt-${post.id}`}>
                      {post.excerpt || post.metaDescription}
                    </p>
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground mt-auto">
                      <div className="flex items-center gap-3">
                        {post.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(post.publishedAt as unknown as string)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {readingTime(post.content)} min read
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-primary">
                        Read more <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                    {post.keywords && post.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {post.keywords.slice(0, 3).map((kw) => (
                          <span key={kw} className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Tag className="w-2.5 h-2.5" />
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
