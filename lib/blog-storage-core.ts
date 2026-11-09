import type { BlogPost, LatestBlogPost } from "./blog-types.ts";
export type StoredPost = BlogPost & { ownerId: string };
export type VersionedPost = { post: StoredPost; etag: string };
export interface PostRepository {
  list(status?: "published", ownerId?: string): Promise<StoredPost[]>;
  get(id: string): Promise<VersionedPost | null>;
  create(post: StoredPost): Promise<void>;
  replace(post: StoredPost, etag: string): Promise<void>;
}
export class StoreError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export function hasStatus(error: unknown, status: number) {
  return Boolean(error && typeof error === "object" && "statusCode" in error && error.statusCode === status);
}
export function publicPost(post: StoredPost): BlogPost {
  const { id, title, body, status, publishedAt, createdAt, updatedAt, version } = post;
  return { id, title, body, status, publishedAt, createdAt, updatedAt, version };
}
export function validateEntry(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (typeof data.title !== "string" || typeof data.body !== "string" || (data.status !== "draft" && data.status !== "published")) return null;
  const title = data.title.trim(), body = data.body.trim();
  if (!title || title.length > 160 || body.length > 50000 || (data.status === "published" && !body)) return null;
  return { title, body, status: data.status as "draft" | "published" };
}
export const validPostId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const newest = (a: StoredPost, b: StoredPost) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
export function createBlogStore(repository: PostRepository, now = () => new Date().toISOString()) {
  return {
    async getLatestPublishedPost(): Promise<LatestBlogPost | null> {
      const post = (await repository.list("published")).filter(p => p.status === "published" && p.publishedAt).sort(newest)[0];
      return post?.publishedAt ? { id: post.id, title: post.title, publishedAt: post.publishedAt } : null;
    },
    async getPublishedPosts(): Promise<BlogPost[]> {
      return (await repository.list("published")).filter(p => p.status === "published" && p.publishedAt).sort(newest).slice(0,200).map(publicPost);
    },
    async getPublishedPost(id: string): Promise<BlogPost | null> {
      if (!validPostId(id)) return null;
      const record = await repository.get(id);
      return record?.post.status === "published" && record.post.publishedAt ? publicPost(record.post) : null;
    },
    async getOwnerPosts(ownerId: string): Promise<BlogPost[]> {
      return (await repository.list(undefined,ownerId)).filter(p => p.ownerId === ownerId).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0,200).map(publicPost);
    },
    async createPost(id: string, ownerId: string, data: NonNullable<ReturnType<typeof validateEntry>>): Promise<BlogPost> {
      const timestamp = now();
      const post: StoredPost = { id, ownerId, ...data, createdAt: timestamp, updatedAt: timestamp, publishedAt: data.status === "published" ? timestamp : null, version: 1 };
      try { await repository.create(post); return publicPost(post); }
      catch (error) { if (!hasStatus(error,409)) throw error; }
      const existing = (await repository.get(id))?.post;
      if (!existing || existing.ownerId !== ownerId || existing.title !== data.title || existing.body !== data.body || existing.status !== data.status) throw new StoreError("An earlier save already created this entry. Copy your latest text, then reload the studio.",409);
      return publicPost(existing);
    },
    async updatePost(id: string, ownerId: string, version: number, data: NonNullable<ReturnType<typeof validateEntry>>): Promise<BlogPost> {
      const current = validPostId(id) ? await repository.get(id) : null;
      if (!current || current.post.ownerId !== ownerId) throw new StoreError("Entry not found.",404);
      if (current.post.version !== version) throw new StoreError("This entry changed in another tab. Copy your unsaved text, then reload the studio.",409);
      const timestamp = now();
      const next = { ...current.post, ...data, updatedAt: timestamp, publishedAt: current.post.publishedAt ?? (data.status === "published" ? timestamp : null), version: current.post.version + 1 };
      try { await repository.replace(next,current.etag); }
      catch (error) {
        if (hasStatus(error,412) || hasStatus(error,404)) throw new StoreError("This entry changed in another tab. Copy your unsaved text, then reload the studio.",409);
        throw error;
      }
      return publicPost(next);
    }
  };
}
