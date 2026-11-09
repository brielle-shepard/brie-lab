import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getBlogOwner } from "../../lib/blog-auth";
import { getOwnerPosts } from "../../lib/blog-store";
import SiteWorkspace from "../../components/site-workspace";
import BlogStudio from "../../components/blog-studio";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private writing studio — Brie’s Lab", robots: { index: false, follow: false } };
export default async function StudioPage() {
  const user = await getBlogOwner();
  if (!user) redirect("/studio/sign-in");
  const posts = await getOwnerPosts(user.userId);
  return <SiteWorkspace screen="studio"><BlogStudio initialPosts={posts} /></SiteWorkspace>;
}
