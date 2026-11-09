import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
globalThis.__blogTestHeaders=new Headers();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/headers') return { url: 'test:headers', shortCircuit: true };
    if (specifier === 'next/server') return nextResolve('next/server.js', context);
    if (specifier === 'next/navigation') return nextResolve('next/navigation.js', context);
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const base = new URL(specifier, context.parentURL);
      if (!/\.[a-z]+$/i.test(base.pathname)) {
        for (const suffix of ['.ts', '.tsx', '/index.ts']) {
          const url = new URL(base.href + suffix);
          if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'test:headers') return { format: 'module', source: 'export async function headers(){return globalThis.__blogTestHeaders;}', shortCircuit: true };
    if (/\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
      return { format: 'module', source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const env={AZURE_AUTH_ENABLED:'true',WEBSITE_SITE_NAME:'test-app',AZURE_TENANT_ID:'11111111-1111-1111-1111-111111111111',BLOG_OWNER_OBJECT_ID:'22222222-2222-2222-2222-222222222222',SITE_ORIGIN:'https://lab.example'};
Object.assign(process.env,env);
const auth=await import('../lib/azure-auth.ts');
const {tableRepository,toEntity,fromEntity}=await import('../lib/table-storage.ts');
const {createBlogStore}=await import('../lib/blog-storage-core.ts');
const records=new Map();
let sequence=0;
Object.assign(tableRepository,{
  async list(){return [...records.values()].map(r=>structuredClone(r.post));},
  async get(id){return records.has(id)?structuredClone(records.get(id)):null;},
  async create(post){if(records.has(post.id))throw {statusCode:409}; records.set(post.id,{post:structuredClone(post),etag:String(++sequence)});},
  async replace(post,etag){if(records.get(post.id)?.etag!==etag)throw {statusCode:412}; records.set(post.id,{post:structuredClone(post),etag:String(++sequence)});}
});
const collection=await import('../app/api/blog/posts/route.ts');
const item=await import('../app/api/blog/posts/[id]/route.ts');
const latest=await import('../app/api/blog/latest/route.ts');
const store=await import('../lib/blog-store.ts');
const {proxy}=await import('../proxy.ts');
const {default:Markdown}=await import('../components/blog-markdown.tsx');
const id='12345678-1234-4123-8123-123456789abc';
const context={params:Promise.resolve({id})};
function principal(oid=env.BLOG_OWNER_OBJECT_ID,tid=env.AZURE_TENANT_ID,extra=[]){
 return new Headers({'x-ms-client-principal':Buffer.from(JSON.stringify({auth_typ:'aad',claims:[{typ:'oid',val:oid},{typ:'tid',val:tid},...extra]})).toString('base64')});
}
const asOwner=()=>{globalThis.__blogTestHeaders=principal();};
const request=(method,body,origin='https://lab.example')=>new Request('http://internal:8080/api/blog/posts',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});

await test('authorization requires enabled Azure authentication, correct tenant AND immutable owner ID',()=>{
 assert.equal(auth.readAzureOwner(new Headers(),env),null);
 assert.equal(auth.readAzureOwner(principal(),{...env,AZURE_AUTH_ENABLED:'false'}),null);
 assert.equal(auth.readAzureOwner(principal(),{...env,WEBSITE_SITE_NAME:''}),null);
 assert.equal(auth.readAzureOwner(principal('33333333-3333-3333-3333-333333333333'),env),null);
 assert.equal(auth.readAzureOwner(principal(env.BLOG_OWNER_OBJECT_ID,'33333333-3333-3333-3333-333333333333'),env),null);
 assert.equal(auth.readAzureOwner(principal(undefined,undefined,[{typ:'oid',val:'other'}]),env),null);
 assert.equal(auth.readAzureOwner(new Headers({'x-ms-client-principal':'bad json'}),env),null);
 assert.deepEqual(auth.readAzureOwner(principal(),env),{userId:env.BLOG_OWNER_OBJECT_ID,tenantId:env.AZURE_TENANT_ID});
 const mapped=new Headers({'x-ms-client-principal':Buffer.from(JSON.stringify({auth_typ:'aad',claims:[{typ:'http://schemas.microsoft.com/identity/claims/objectidentifier',val:env.BLOG_OWNER_OBJECT_ID},{typ:'http://schemas.microsoft.com/identity/claims/tenantid',val:env.AZURE_TENANT_ID}]})).toString('base64')});
 assert.ok(auth.readAzureOwner(mapped,env));
});
await test('site is private by default and unsafe writes fail behind a TLS proxy',()=>{
 delete process.env.SITE_VISIBILITY;
 assert.equal(proxy({headers:new Headers()}).status,403);
 assert.equal(proxy({headers:principal()}).status,200);
 process.env.SITE_VISIBILITY='public';
 assert.equal(proxy({headers:new Headers()}).status,200);
 delete process.env.SITE_VISIBILITY;
 assert.equal(auth.isSameOriginJson(request('POST',{}),env),true);
 assert.equal(auth.isSameOriginJson(request('POST',{},'https://evil.example'),env),false);
 assert.equal(auth.isSameOriginJson(request('POST',{}),{...env,SITE_ORIGIN:''}),false);
 assert.equal(auth.isSameOriginJson(new Request('https://lab.example',{method:'POST',headers:{'content-type':'application/json'}}),env),false);
});
await test('real API routes keep drafts private, prevent overwrite, and retain first publication date',async()=>{
 assert.equal((await collection.GET()).status,403);
 assert.equal((await collection.POST(request('POST',{}))).status,403);
 asOwner();
 assert.equal((await collection.POST(request('POST',{},'https://evil.example'))).status,403);
 assert.equal((await collection.POST(request('POST',null))).status,400);
 let response=await collection.POST(request('POST',{id,title:'Draft',body:'Private body',status:'draft',publishedAt:'1900-01-01'}));
 assert.equal(response.status,201);
 let post=(await response.json()).post;
 assert.equal(post.publishedAt,null);
 assert.equal(await store.getPublishedPost(id),null);
 assert.deepEqual(await (await latest.GET()).json(),{post:null});
 assert.equal((await collection.POST(request('POST',{id,title:'Draft',body:'Private body',status:'draft'}))).status,201);
 globalThis.__blogTestHeaders=principal('33333333-3333-3333-3333-333333333333');
 assert.equal((await collection.GET()).status,403);
 assert.equal((await item.PATCH(request('PATCH',{title:'Hijack',body:'Bad',status:'published',version:1}),context)).status,403);
 asOwner();
 const before=Date.now();
 response=await item.PATCH(request('PATCH',{title:'Published',body:'Hello **world**',status:'published',version:1,publishedAt:'1900-01-01'}),context);
 assert.equal(response.status,200);post=(await response.json()).post;
 assert.ok(Date.parse(post.publishedAt)>=before);
 assert.equal(Object.hasOwn(post,'ownerId'),false);
 const publishedAt=post.publishedAt;
 response=await item.PATCH(request('PATCH',{title:post.title,body:'Edit',status:'published',version:post.version}),context);
 post=(await response.json()).post;
 assert.equal(post.publishedAt,publishedAt);
 assert.equal((await item.PATCH(request('PATCH',{title:'Stale',body:'Lost',status:'published',version:1}),context)).status,409);
 response=await item.PATCH(request('PATCH',{title:post.title,body:post.body,status:'draft',version:post.version}),context);
 post=(await response.json()).post;
 assert.equal(await store.getLatestPublishedPost(),null);
 response=await item.PATCH(request('PATCH',{title:post.title,body:post.body,status:'published',version:post.version}),context);
 post=(await response.json()).post;assert.equal(post.publishedAt,publishedAt);
 assert.deepEqual(await store.getLatestPublishedPost(),{id,title:'Published',publishedAt});
 assert.equal((await collection.POST(request('POST',{id,title:'Conflicting retry',body:'text',status:'draft'}))).status,409);
});
await test('ETag conditions reject a race even when both writers read the same version',async()=>{
 const copy=structuredClone(records.get(id));
 const raced={...tableRepository,async get(){return structuredClone(copy);}};
 const service=createBlogStore(raced);
 const edits=await Promise.allSettled([service.updatePost(id,env.BLOG_OWNER_OBJECT_ID,copy.post.version,{title:'First',body:'1',status:'published'}),service.updatePost(id,env.BLOG_OWNER_OBJECT_ID,copy.post.version,{title:'Second',body:'2',status:'published'})]);
 assert.equal(edits.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(edits.find(x=>x.status==='rejected').reason.status,409);
});
await test('maximum Unicode entry round-trips within Table Storage property limits',()=>{
 const post={...records.get(id).post,body:'🧪'.repeat(25000)};
 const entity=toEntity(post);
 for(const value of Object.values(entity))if(typeof value==='string')assert.ok(Buffer.byteLength(value,'utf16le')<=65536);
 assert.deepEqual(fromEntity(entity),post);
 assert.equal(fromEntity(toEntity({...post,body:''})).body,'');
});
await test('Markdown preserves formatting without executable HTML or URLs',()=>{
 const output=renderToStaticMarkup(createElement(Markdown,{body:'## Heading\n\n**Bold**\n\n<script>alert(1)</script>\n\n[x](javascript:alert%281%29)\n\n<img src=x onerror=alert(1)>'}));
 assert.match(output,/<h2>Heading<\/h2>/);assert.match(output,/<strong>Bold<\/strong>/);
 assert.doesNotMatch(output,/<script|onerror=|href="javascript:/);
});
