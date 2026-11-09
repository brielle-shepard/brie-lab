import type { Metadata } from "next";
import { ArrowUpRight, FileText, PenLine } from "lucide-react";
import SiteWorkspace from "../../components/site-workspace";
import { getPublishedPosts } from "../../lib/blog-store";
import { getBlogOwner } from "../../lib/blog-auth";
import { formatPostDate, postExcerpt } from "../../lib/blog-types";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog — Brie’s Lab" };
export default async function BlogPage() {
  const [posts, owner] = await Promise.all([getPublishedPosts(), getBlogOwner()]);
  return <SiteWorkspace screen="blog">
    <section className="blog-page" aria-labelledby="blog-heading">
      <div className="section-heading"><div><p className="eyebrow">NOTES FROM THE LAB</p><h1 id="blog-heading" className="page-title">Blog</h1><p className="blog-subtitle">Build notes, discoveries, and things worth writing down.</p></div>{owner && <a className="button primary" href="/studio"><PenLine size={15} /> Write an entry</a>}</div>
      {posts.length ? <div className="blog-list">{posts.map(post => <article className="blog-card" key={post.id}><time dateTime={post.publishedAt!}>{formatPostDate(post.publishedAt!)}</time><h2><a href={`/blog/${post.id}`}>{post.title}</a></h2><p>{postExcerpt(post.body)}{post.body.length > 220 ? "…" : ""}</p><a className="text-link yellow-link" href={`/blog/${post.id}`}>Read entry <ArrowUpRight size={14} /></a></article>)}</div> : <div className="blog-empty"><FileText size={33} /><h2>The notebook is open.</h2><p>New entries will appear here as they’re published.</p></div>}
    </section>
  </SiteWorkspace>;
}
