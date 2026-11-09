import { TableClient, odata } from "@azure/data-tables";
import { DefaultAzureCredential } from "@azure/identity";
import type { PostRepository, StoredPost } from "./blog-storage-core.ts";
import { hasStatus } from "./blog-storage-core.ts";
const partitionKey = "posts";
let client: TableClient | undefined;
export function getTableClient() {
  if (client) return client;
  const tableName = process.env.AZURE_STORAGE_TABLE_NAME || "BlogPosts";
  if (process.env.AZURE_STORAGE_CONNECTION_STRING) client = TableClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING,tableName);
  else {
    const endpoint = process.env.AZURE_STORAGE_TABLE_ENDPOINT;
    if (!endpoint || !endpoint.startsWith("https://")) throw new Error("Configure Azure Table Storage before using the blog.");
    client = new TableClient(endpoint,tableName,new DefaultAzureCredential());
  }
  return client;
}
// ASCII chunks avoid Table Storage's 64 KiB UTF-16 property limit, including emoji.
export function toEntity(post: StoredPost) {
  const body = Buffer.from(post.body,"utf8").toString("base64");
  const entity: Record<string,string|number> = {
    partitionKey, rowKey:post.id, ownerId:post.ownerId, title:post.title, status:post.status,
    publishedAt:post.publishedAt ?? "", createdAt:post.createdAt, updatedAt:post.updatedAt,
    version:post.version, bodyParts:Math.ceil(body.length/30000)
  };
  for (let i=0; i<body.length; i+=30000) entity[`body${i/30000}`] = body.slice(i,i+30000);
  return entity as typeof entity & {partitionKey:string;rowKey:string};
}
export function fromEntity(entity: Record<string,unknown>): StoredPost {
  const count = Number(entity.bodyParts);
  if (!Number.isInteger(count) || count<0 || count>10 || (entity.status!=="draft" && entity.status!=="published")) throw new Error("Invalid blog entity.");
  let encoded = "";
  for (let i=0; i<count; i++) {
    if (typeof entity[`body${i}`] !== "string") throw new Error("Incomplete blog entity.");
    encoded += entity[`body${i}`];
  }
  return {id:String(entity.rowKey),ownerId:String(entity.ownerId),title:String(entity.title),body:Buffer.from(encoded,"base64").toString("utf8"),status:entity.status,publishedAt:entity.publishedAt?String(entity.publishedAt):null,createdAt:String(entity.createdAt),updatedAt:String(entity.updatedAt),version:Number(entity.version)};
}
export const tableRepository: PostRepository = {
  async list(status,ownerId) {
    let filter=odata`PartitionKey eq ${partitionKey}`;
    if(status) filter+=odata` and status eq ${status}`;
    if(ownerId) filter+=odata` and ownerId eq ${ownerId}`;
    const posts:StoredPost[]=[];
    for await(const entity of getTableClient().listEntities({queryOptions:{filter}})) posts.push(fromEntity(entity));
    return posts;
  },
  async get(id) {
    try {
      const entity=await getTableClient().getEntity(partitionKey,id);
      if(!entity.etag) throw new Error("Missing concurrency token.");
      return {post:fromEntity(entity),etag:entity.etag};
    } catch(error) { if(hasStatus(error,404) && (error as {code?:string}).code!=="TableNotFound") return null; throw error; }
  },
  async create(post) { await getTableClient().createEntity(toEntity(post)); },
  async replace(post,etag) { await getTableClient().updateEntity(toEntity(post),"Replace",{etag}); }
};
