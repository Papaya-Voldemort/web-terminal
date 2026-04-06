import { account, databases, DB_ID, COL_ID, Permission, Role } from "./appwrite";

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
        updateLocalStorage();
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
    updateLocalStorage();
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

export async function updateLocalStorage() {
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
    localStorage.setItem("fileSystem", JSON.stringify(fileSystem));
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
  updateLocalStorage();
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

  updateLocalStorage();
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
  updateLocalStorage();
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
  updateLocalStorage();
  return true;
}

export function saveSync() {
  localStorage.setItem("fileSystem", JSON.stringify(fileSystem));
}

export function seedFilesystem() {
  if (fileSystem.length > 0) return;

  const parts = (path: string) => path.split("/").filter(Boolean);

  const dirs = [
    "root/downloads/music",
    "root/downloads/videos",
    "root/downloads/games",
    "root/pictures",
  ];

  const files: [string, string, string, Partial<FSBase>][] = [
    ["root/downloads/music/song.mp3", "audio content here", "hacker", {}],
    ["root/documents/report.docx", "report content here", "hacker", {}],
    // Only root can read/write, everyone else is locked out
    ["root/secret.txt", "top secret root content", "root", {
      permissions: { owner: "rw-", group: "---", others: "---" }
    }],
    // Everyone can read, but only hacker can write
    ["root/readme.txt", "welcome to the terminal!", "hacker", {
      permissions: { owner: "rw-", group: "r--", others: "r--" }
    }],
    // No one can read or write (you can use this to test execute-only edge cases)
    ["root/locked.txt", "you should not see this", "root", {
      permissions: { owner: "---", group: "---", others: "---" }
    }],
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
      const local = localStorage.getItem("fileSystem");
      fileSystem = local ? JSON.parse(local) : [];
      seedFilesystem();
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
      localStorage.removeItem("fileSystem");
      return { name: user.name || user.email || "hacker", email: user.email || "" };
    }
  }

  const local = localStorage.getItem("fileSystem");
  fileSystem = local ? JSON.parse(local) : [];
  seedFilesystem();
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