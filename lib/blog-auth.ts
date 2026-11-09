import { headers } from "next/headers";
import { readAzureOwner } from "./azure-auth";
export { isSameOriginJson } from "./azure-auth";
export async function getBlogOwner() { return readAzureOwner(await headers()); }
