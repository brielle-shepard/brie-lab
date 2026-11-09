import { createBlogStore } from "./blog-storage-core";
import { tableRepository } from "./table-storage";
export { validateEntry } from "./blog-storage-core";
export const {getLatestPublishedPost,getPublishedPosts,getPublishedPost,getOwnerPosts,createPost,updatePost} = createBlogStore(tableRepository);
