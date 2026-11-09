"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { BLOG_UPDATED_EVENT, formatPostDate, type LatestBlogPost } from "../lib/blog-types";

export default function LatestBlogEntry() {
  const [post, setPost] = useState<LatestBlogPost | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    async function refresh() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch("/api/blog/latest", { cache: "no-store", signal: request.signal });
        if (!response.ok) throw new Error("Blog unavailable");
        const result = await response.json() as { post: LatestBlogPost | null };
        if (!disposed && !request.signal.aborted) { setPost(result.post); setStatus("ready"); }
      } catch {
        if (!disposed && !request.signal.aborted) { setPost(null); setStatus("error"); }
      }
    }
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(BLOG_UPDATED_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true; controller?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener(BLOG_UPDATED_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <section className="explorer-latest" aria-labelledby="latest-blog-heading">
    <h2 id="latest-blog-heading">LATEST FROM THE BLOG</h2>
    <div aria-live="polite" aria-busy={status === "loading"}>
      {status === "loading" ? <p className="latest-note">Loading latest entry…</p> : post ? <a className="latest-entry-link" href={`/blog/${post.id}`}><span className="latest-entry-title">{post.title}<ArrowUpRight size={13} aria-hidden="true" /></span><time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time></a> : <><p className="latest-note">{status === "error" ? "Couldn’t load the latest entry." : "No entries published yet."}</p><a className="latest-all-link" href="/blog">Visit the blog <ArrowUpRight size={12} aria-hidden="true" /></a></>}
    </div>
  </section>;
}
