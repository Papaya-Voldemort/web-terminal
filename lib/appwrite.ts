// APPWRITE CONFIG
// appwrite.ts — add Query and ID to your exports
import { Client, Account, Databases, Permission, Role, Query, ID } from "appwrite";

export const client = new Client()
  .setEndpoint("https://sfo.cloud.appwrite.io/v1")
  .setProject("69d14c3800114d434cab");

export const account = new Account(client);
export const databases = new Databases(client);

export const DB_ID = "69d14cba001957b07097";
export const COL_ID = "filesystems";
export const MKT_ID = "335907";

export { Permission, Role, Query, ID } from "appwrite";