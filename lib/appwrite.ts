// APPWRITE CONFIG
import { Client, Account, Databases } from "appwrite";

export const client = new Client()
  .setEndpoint("https://sfo.cloud.appwrite.io/v1")
  .setProject("69d14c3800114d434cab");

export const account = new Account(client);
export const databases = new Databases(client);

export const DB_ID = "69d14cba001957b07097";
export const COL_ID = "filesystems";

export { Permission, Role } from "appwrite";