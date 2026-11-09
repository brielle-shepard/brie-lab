import {readFile} from 'node:fs/promises';
import {validateEntry,validPostId,hasStatus} from '../lib/blog-storage-core.ts';
import {getTableClient,toEntity,fromEntity} from '../lib/table-storage.ts';

const file=process.argv[2];
if(!file) throw new Error('Usage: node --experimental-strip-types scripts/import-blog.mjs imports/posts.json [--apply]');
const ownerId=process.env.BLOG_OWNER_OBJECT_ID?.toLowerCase();
if(!ownerId || !validPostId(ownerId)) throw new Error('Set BLOG_OWNER_OBJECT_ID to the lab owner’s Entra object ID.');
const source=JSON.parse(await readFile(file,'utf8'));
const posts=Array.isArray(source)?source:source.posts;
if(!Array.isArray(posts)) throw new Error('Expected an array or an object containing a posts array.');
const ids=new Set();
const validated=posts.map(post=>{
  if(!validateEntry(post) || !validPostId(post.id) || ids.has(post.id) || !Number.isInteger(post.version) || post.version<1) throw new Error('Invalid entry or duplicate entry ID. No records imported.');
  for(const key of ['createdAt','updatedAt'])if(typeof post[key]!=='string' || !Number.isFinite(Date.parse(post[key])))throw new Error('Invalid entry date. No records imported.');
  if(post.publishedAt!==null && (typeof post.publishedAt!=='string' || !Number.isFinite(Date.parse(post.publishedAt))))throw new Error('Invalid publication date.');
  if(post.status==='published' && !post.publishedAt)throw new Error('Published entry has no publication date.');
  ids.add(post.id);
  return {id:post.id,ownerId,title:post.title,body:post.body,status:post.status,publishedAt:post.publishedAt,createdAt:post.createdAt,updatedAt:post.updatedAt,version:post.version};
});
console.log(`Validated ${validated.length} entries. Dates and draft/published states will be preserved.`);
if(!process.argv.includes('--apply')) {console.log('Validation only. Add --apply to write to the configured Azure table.');process.exit(0);}
const client=getTableClient();
let inserted=0,alreadyPresent=0;
for(const post of validated){
  try{await client.createEntity(toEntity(post));inserted++;}
  catch(error){
    if(!hasStatus(error,409))throw error;
    const existing=fromEntity(await client.getEntity('posts',post.id));
    if(Object.keys(post).some(key=>post[key]!==existing[key]))throw new Error('An existing entry differs. Import stopped without overwriting it; previously inserted entries remain safe to retry.');
    alreadyPresent++;
  }
}
console.log(`Imported ${inserted}; ${alreadyPresent} identical entries already present.`);
