import { account, databases, DB_ID, COL_ID, MKT_ID, Permission, Role, Query, ID } from "./appwrite.ts";
import { openDB } from "idb";

const dbPromise = openDB("fs-local", 1, {
  upgrade(db) {
    db.createObjectStore("state");
  },
});

export async function saveLocalFS(fileSystem: FSNode[]) {
  const db = await dbPromise;
  await db.put("state", JSON.stringify(fileSystem), "fs");
}

export async function loadLocalFS(): Promise<FSNode[] | null> {
  const db = await dbPromise;

  const data = await db.get("state", "fs");

  return data ? JSON.parse(data) : null;
};

let saveTimer: any;

export function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveLocalFS(fileSystem);
  }, 200);
}

export type Permissions = {
  owner: "rwx" | "rw-" | "r--" | "r-x" | "---" | string; // or use a bitmask number like 0o755
  group: string;
  others: string;
};

type FSBase = {
  name: string;
  owner: string;        // e.g. "root", "user"
  group: string;        // e.g. "root", "users"
  permissions: Permissions | number;  // Unix octal bitmask or structured permission object
  createdAt: number;    // epoch ms
  modifiedAt: number;
  accessedAt: number;
};

export type FSFile = FSBase & {
  type: "file";
  content: string;
  size: number;         // bytes (content.length or content byte size)
};

export type FSDir = FSBase & {
  type: "dir";
  children: FSNode[];
};

export type FSNode = FSFile | FSDir;

let fileSystem: FSNode[] = [];
let saveTimeout: ReturnType<typeof setTimeout>;
let docExists = false;

const ROOT_KEY = "root";

// ─── helpers ───────────────────────────────────────────────────────────────

function now() {
  return Date.now();
}

function defaultDirMeta(name: string, owner = "hacker"): FSBase {
  const t = now();
  return {
    name,
    owner,
    group: owner,
    permissions: { owner: "rwx", group: "r-x", others: "r-x" },
    createdAt: t,
    modifiedAt: t,
    accessedAt: t,
  };
}

function defaultFileMeta(name: string, owner = "hacker"): FSBase {
  const t = now();
  return {
    name,
    owner,
    group: owner,
    permissions: { owner: "rw-", group: "r--", others: "r--" },
    createdAt: t,
    modifiedAt: t,
    accessedAt: t,
  };
}

function touchMetadata(node: FSBase, updates: { modified?: boolean; accessed?: boolean } = { modified: true, accessed: true }) {
  const t = now();
  if (updates.accessed) node.accessedAt = t;
  if (updates.modified) node.modifiedAt = t;
}

function applyMetadata<T extends FSBase>(base: T, metadata: Partial<FSBase> = {}): T {
  const merged = { ...base, ...metadata };
  if (metadata.permissions === undefined) merged.permissions = base.permissions;
  if (metadata.group === undefined) merged.group = base.group;
  if (metadata.owner === undefined) merged.owner = base.owner;
  return merged;
}

export function normalizePermissions(perms: Permissions | number): Permissions {
  if (typeof perms === "number") {
    const toString = (value: number) => {
      return `${value & 4 ? "r" : "-"}${value & 2 ? "w" : "-"}${value & 1 ? "x" : "-"}`;
    };
    return {
      owner: toString((perms >> 6) & 0o7),
      group: toString((perms >> 3) & 0o7),
      others: toString(perms & 0o7),
    };
  }
  return perms;
}

export function getDirectoryNode(path: string): FSDir | null {
  const parts = fsPath(path).split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    return (fileSystem.find((n) => n.name === parts[0] && n.type === "dir") as FSDir) ?? null;
  }
  const parent = getDirectory(parts.slice(0, -1).join("/"));
  if (!parent) return null;
  return (parent.find((n) => n.name === parts[parts.length - 1] && n.type === "dir") as FSDir) ?? null;
}

// END OF HELPERS

function fsPath(path: string) {
  return !path || path === "~" ? ROOT_KEY : path;
}

export function getDirectory(path: string): FSNode[] | null {
  return fsPath(path)
    .split("/")
    .filter(Boolean)
    .reduce<FSNode[] | null>((level, part) => {
      if (!level) return null;
      const found = level.find((n) => n.name === part && n.type === "dir") as FSDir | undefined;
      if (found) {
        touchMetadata(found, { accessed: true, modified: false });
        syncFilesystem();
      }
      return found?.children ?? null;
    }, fileSystem);
}

export function getFile(path: string): FSFile | null {
  const parts = fsPath(path).split("/").filter(Boolean);
  const fileName = parts.pop();
  const parentDir = parts.length ? getDirectory(parts.join("/")) : fileSystem;
  if (!parentDir || !fileName) return null;
  const file = parentDir.find((n) => n.name === fileName && n.type === "file") as FSFile | undefined;
  if (file) {
    touchMetadata(file, { accessed: true, modified: false });
    syncFilesystem();
  }
  return file ?? null;
}

export function resolvePath(currentDir: string, target: string): string {
  if (!target || target === "~") return "~";

  const expandedTarget = target.startsWith("~/") ? `${ROOT_KEY}/${target.slice(2)}` : target;
  const base = currentDir === "~" ? ROOT_KEY : currentDir;
  const combined = base ? `${base}/${expandedTarget}` : expandedTarget;

  const resolved: string[] = [];
  for (const part of combined.split("/").filter(Boolean)) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }

  return resolved.join("/") || "~";
}

export function toFsPath(resolvedPath: string): string {
  return resolvedPath === "~" ? ROOT_KEY : resolvedPath;
}

export async function syncFilesystem() {
  const user = await account.get().catch(() => null);
  if (user) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      if (docExists) {
        await databases.updateDocument(DB_ID, COL_ID, user.$id, {
          data: JSON.stringify(fileSystem),
        });
      } else {
        await databases.createDocument(
          DB_ID,
          COL_ID,
          user.$id,
          { data: JSON.stringify(fileSystem) },
          [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
          ]
        );
        docExists = true;
      }
    }, 500);
  } else {
    queueSave();
  }
}

export function makeDirectory(path: string, owner = "hacker", metadata: Partial<FSBase> = {}) {
  const parts = path.split("/").filter(Boolean);
  let level = fileSystem;
  for (const part of parts) {
    const existing = level.find((n) => n.name === part && n.type === "dir") as FSDir | undefined;
    if (existing) {
      level = existing.children;
    } else {
      const newDir: FSDir = {
        ...applyMetadata(defaultDirMeta(part, owner), metadata),
        type: "dir",
        children: [],
      };
      level.push(newDir);
      level = newDir.children;
    }
  }
  syncFilesystem();
}

export function makeFile(path: string, content: string, owner = "hacker", metadata: Partial<FSBase> = {}) {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop()!;
  let level = fileSystem;

  for (const part of parts) {
    const existing = level.find((n) => n.name === part && n.type === "dir") as FSDir | undefined;
    if (existing) {
      level = existing.children;
    } else {
      const newDir: FSDir = { ...defaultDirMeta(part, owner), type: "dir", children: [] };
      level.push(newDir);
      level = newDir.children;
    }
  }

  const existingFile = level.find((n) => n.name === fileName && n.type === "file") as FSFile | undefined;
  if (existingFile) {
    existingFile.content = content;
    existingFile.size = content.length;
    touchMetadata(existingFile, { modified: true, accessed: true });
  } else {
    const fileMeta: FSFile = {
      ...applyMetadata(defaultFileMeta(fileName, owner), metadata),
      type: "file",
      content,
      size: content.length,
    };
    level.push(fileMeta);
  }

  syncFilesystem();
}

function removeNode(fsPath: string, type: "file" | "dir") {
  const parts = (fsPath === "~" ? ROOT_KEY : fsPath).split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) return false;
  const parentPath = parts.join("/");
  const parentLevel = parts.length ? getDirectory(parentPath) : fileSystem;
  if (!parentLevel) return false;
  const idx = parentLevel.findIndex((n) => n.name === name && n.type === type);
  if (idx === -1) return false;
  parentLevel.splice(idx, 1);
  const parentNode = parentPath ? getDirectoryNode(parentPath) : null;
  if (parentNode) touchMetadata(parentNode, { modified: true, accessed: true });
  syncFilesystem();
  return true;
}

export function removeDirectory(path: string) {
  return removeNode(path, "dir");
}

export function removeFile(path: string) {
  return removeNode(path, "file");
}

export function writeFile(path: string, content: string) {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop()!;
  const parentDir = parts.length ? getDirectory(parts.join("/")) : fileSystem;
  if (!parentDir) return false;
  const file = parentDir.find((n) => n.name === fileName && n.type === "file") as FSFile | undefined;
  if (!file) return false;
  file.content = content;
  file.size = content.length;
  touchMetadata(file, { modified: true, accessed: true });
  const parentPath = parts.join("/");
  const parentNode = parentPath ? getDirectoryNode(parentPath) : null;
  if (parentNode) touchMetadata(parentNode, { modified: true, accessed: true });
  syncFilesystem();
  return true;
}

export async function saveSync() {
  queueSave();
}

export function seedFilesystem(username: string = "root") {
  if (fileSystem.length > 0) return;

  const parts = (path: string) => path.split("/").filter(Boolean);

  const dirs = [
    `${username}/documents`,
    `${username}/downloads`,
    `${username}/pictures`,
    `${username}/projects`,
    `${username}/.config`,
    `${username}/.ssh`,
  ];

  const files: [string, string, string, Partial<FSBase>][] = [
    [`${username}/.bashrc`, 'export PATH="$HOME/.local/bin:$PATH"\nalias ll="ls -lah"', username, {
      permissions: { owner: "rw-", group: "r--", others: "r--" }
    }],
    [`${username}/.profile`, 'if [ -f ~/.bashrc ]; then . ~/.bashrc; fi', username, {
      permissions: { owner: "rw-", group: "r--", others: "r--" }
    }],
    [`${username}/.config/.commands`, "", username, {
      permissions: { owner: "rw-", group: "r--", others: "r--" }
    }],
    [`${username}/.config/.via`, "VIA-SIGNED=false", username, {
      permissions: { owner: "rw-", group: "r--", others: "r--" }
    }]
  ];

  for (const dir of dirs) {
    let level = fileSystem;
    for (const part of parts(dir)) {
      const existing = level.find((n) => n.name === part && n.type === "dir") as FSDir | undefined;
      if (existing) {
        level = existing.children;
        continue;
      }
      const newDir: FSDir = { ...defaultDirMeta(part, "root"), type: "dir", children: [] };
      level.push(newDir);
      level = newDir.children;
    }
  }

  for (const [path, content, owner, metadata] of files) {
    const p = parts(path);
    const fileName = p.pop()!;
    let level = fileSystem;
    for (const part of p) {
      const existing = level.find((n) => n.name === part && n.type === "dir") as FSDir | undefined;
      if (existing) {
        level = existing.children;
        continue;
      }
      const newDir: FSDir = { ...defaultDirMeta(part, "root"), type: "dir", children: [] };
      level.push(newDir);
      level = newDir.children;
    }
    if (!level.find((n) => n.name === fileName)) {
      level.push({
        ...applyMetadata(defaultFileMeta(fileName, owner), metadata),
        type: "file",
        content,
        size: content.length,
      });
    }
  }

  saveSync();
}

export async function loadFilesystem() {
  const user = await account.get().catch(() => null);
  if (user) {
    try {
      const doc = await databases.getDocument(DB_ID, COL_ID, user.$id);
      fileSystem = JSON.parse(doc.data);
      docExists = true;
      return { name: user.name || user.email || "hacker", email: user.email || "" };
    } catch {
      fileSystem = (await loadLocalFS()) ?? [];
      const username = user.name || user.email || "hacker";
      seedFilesystem(username);
      await databases.createDocument(
        DB_ID,
        COL_ID,
        user.$id,
        { data: JSON.stringify(fileSystem) },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id)),
        ]
      );
      docExists = true;
      const db = await dbPromise;
      await db.delete("state", "fs");
      return { name: username, email: user.email || "" };
    }
  }

  const local = await loadLocalFS();

  if (local) {
    fileSystem = local;
  } else {
    fileSystem = [];
    seedFilesystem();
  }
  return { name: "hacker", email: "" };
}

export function checkPermission(
  node: FSNode,
  user: string,
  mode: "r" | "w" | "x"
): boolean {
  const perms = normalizePermissions(node.permissions);

  // Determine which permission string applies to this user
  let permString: string;
  if (node.owner === user) {
    permString = perms.owner;
  } else if (node.group === user) {
    permString = perms.group;
  } else {
    permString = perms.others;
  }

  // Map mode to index: r=0, w=1, x=2
  const index = { r: 0, w: 1, x: 2 }[mode];
  return permString[index] !== "-";
}

export async function makeFunction(name: string, code: string, description?: string) {
  const user = await account.get().catch(() => null);
  if (!user) return;

  // Check if this function already exists for this user
  const existing = await databases.listDocuments(DB_ID, MKT_ID, [
    Query.equal("name", name),
  ]);

  const documentData: Record<string, unknown> = {
    name,
    code,
    version: 1.0,
    author: user.email || user.name || "anonymous",
  };
  if (description && typeof description === "string") {
    documentData.description = description;
  }

  if (existing.documents.length > 0) {
    const doc = existing.documents[0] as { version?: number; $id?: string };
    const newVersion = parseFloat(((doc.version ?? 0) + 0.1).toFixed(1));

    await databases.updateDocument(DB_ID, MKT_ID, doc.$id || "", {
      ...documentData,
      version: newVersion,
      downloads: 0,
    });
  } else {
    await databases.createDocument(
      DB_ID, MKT_ID,
      ID.unique(),
      documentData,
      [
        Permission.read(Role.user(user.$id)),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id)),
      ]
    );
  }
}

export async function addFunction(name: string): Promise<{ fn: Function; description?: string; author?: string } | null> {
  const existing = await databases.listDocuments(DB_ID, MKT_ID, [
    Query.equal("name", name),
  ]);

  if (existing.documents.length === 0) return null;

  const doc = existing.documents[0] as { code?: string; description?: string; author?: string };
  let code = doc.code;
  if (!code || typeof code !== "string") return null;

  // Strip export statements to make the code work with Function constructor
  code = code
    .replace(/^export\s+default\s+/m, "")
    .replace(/^export\s+/m, "")
    .trim();

  // Strip TypeScript type annotations to make code runnable with Function()
  code = code
    .replace(/:\s*(?:\w+|<[^>]*>|\{[^}]*\}|\[[^\]]*\])/g, "") // Remove : Type annotations
    .replace(/as\s+\w+/g, "") // Remove as Type casts
    .trim();

  try {
    const fn = new Function(`return ${code}`)();

    // Handle both function and object with run method
    let executableFn: Function | null = null;
    if (typeof fn === "function") {
      executableFn = fn;
    } else if (typeof fn === "object" && fn !== null && typeof fn.run === "function") {
      // If it's an object with a run method, wrap it
      executableFn = (input: string) => fn.run(input);
    }

    if (!executableFn) return null;

    return {
      fn: executableFn,
      description: typeof doc.description === "string" ? doc.description : undefined,
      author: typeof doc.author === "string" ? doc.author : undefined,
    };
  } catch {
    return null;
  }
}