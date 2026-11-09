import { getBlogOwner, isSameOriginJson } from "../../../../../lib/blog-auth";
import { updatePost, validateEntry } from "../../../../../lib/blog-store";
import { StoreError } from "../../../../../lib/blog-storage-core";
export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
export async function PATCH(request: Request, context: {params:Promise<{id:string}>}) {
  if(!isSameOriginJson(request)) return Response.json({error:"Request not permitted."},{status:403,headers:privateHeaders});
  const owner=await getBlogOwner();
  if(!owner) return Response.json({error:"This writing studio is private."},{status:403,headers:privateHeaders});
  let raw;
  try {const text=await request.text(); if(text.length>60000) throw Error(); raw=JSON.parse(text);}
  catch {return Response.json({error:"This entry is too large or could not be read."},{status:400,headers:privateHeaders});}
  const data=validateEntry(raw);
  if(!data || !Number.isInteger(raw.version) || raw.version<1) return Response.json({error:"Add a title and entry text before publishing."},{status:400,headers:privateHeaders});
  try {return Response.json({post:await updatePost((await context.params).id,owner.userId,raw.version,data)},{headers:privateHeaders});}
  catch(error) {if(error instanceof StoreError) return Response.json({error:error.message},{status:error.status,headers:privateHeaders}); throw error;}
}
