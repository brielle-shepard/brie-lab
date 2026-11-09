import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteWorkspace from "../../../components/site-workspace";
import BlogMarkdown from "../../../components/blog-markdown";
import { getPublishedPost } from "../../../lib/blog-store";
import { getBlogOwner } from "../../../lib/blog-auth";
import { formatPostDate } from "../../../lib/blog-types";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost((await params).id);
  return { title: post ? `${post.title} — Brie’s Lab` : "Entry not found — Brie’s Lab" };
}
export default async function EntryPage({ params }: Props) {
  const [post, owner] = await Promise.all([getPublishedPost((await params).id), getBlogOwner()]);
  if (!post) notFound();
  return <SiteWorkspace screen="blog"><article className="blog-entry"><div className="entry-navigation"><a className="text-link" href="/blog">← All entries</a>{owner && <a className="text-link yellow-link" href={`/studio?edit=${post.id}`}>Edit entry</a>}</div><header className="entry-header"><p className="eyebrow">BRIE’S LAB / JOURNAL</p><h1>{post.title}</h1><time dateTime={post.publishedAt!}>{formatPostDate(post.publishedAt!)} · Brie</time></header><BlogMarkdown body={post.body} /></article></SiteWorkspace>;
}
