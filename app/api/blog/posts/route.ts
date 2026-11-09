import { getBlogOwner, isSameOriginJson } from "../../../../lib/blog-auth";
import { getOwnerPosts, createPost, validateEntry } from "../../../../lib/blog-store";
import { StoreError, validPostId } from "../../../../lib/blog-storage-core";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
export async function GET() {
  const owner=await getBlogOwner();
  if(!owner) return Response.json({error:"This writing studio is private."},{status:403,headers:privateHeaders});
  return Response.json({posts:await getOwnerPosts(owner.userId)},{headers:privateHeaders});
}
export async function POST(request: Request) {
  if(!isSameOriginJson(request)) return Response.json({error:"Request not permitted."},{status:403,headers:privateHeaders});
  const owner=await getBlogOwner();
  if(!owner) return Response.json({error:"This writing studio is private."},{status:403,headers:privateHeaders});
  let raw;
  try {const text=await request.text(); if(text.length>60000) throw Error(); raw=JSON.parse(text);}
  catch {return Response.json({error:"This entry is too large or could not be read."},{status:400,headers:privateHeaders});}
  const data=validateEntry(raw);
  if(!data || !validPostId(raw.id)) return Response.json({error:"Add a title (up to 160 characters) and entry text (up to 50,000 characters)."},{status:400,headers:privateHeaders});
  try {return Response.json({post:await createPost(raw.id,owner.userId,data)},{status:201,headers:privateHeaders});}
  catch(error) {if(error instanceof StoreError) return Response.json({error:error.message},{status:error.status,headers:privateHeaders}); throw error;}
}
