import { getLatestPublishedPost } from "../../../../lib/blog-store";

export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ post: await getLatestPublishedPost() }, { headers: { "Cache-Control": "no-store" } });
}
