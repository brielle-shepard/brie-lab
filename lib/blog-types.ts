export type BlogPost = {
  id: string; title: string; body: string; status: "draft" | "published";
  publishedAt: string | null; createdAt: string; updatedAt: string; version: number;
};
export type LatestBlogPost = { id: string; title: string; publishedAt: string };
export const BLOG_UPDATED_EVENT = "brie:blog-updated";
export function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}
export function postExcerpt(body: string) {
  return body.replace(/```[\s\S]*?```/g, " [code] ").replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[#*_>`~]/g, "").replace(/\s+/g, " ").trim().slice(0, 220);
}
