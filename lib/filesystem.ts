import { account, databases, DB_ID, COL_ID, Permission, Role } from "./appwrite";

export type FSFile = { name: string; type: "file"; content: string };
export type FSDir = { name: string; type: "dir"; children: FSNode[] };
export type FSNode = FSFile | FSDir;

let fileSystem: FSNode[] = [];
let saveTimeout: ReturnType<typeof setTimeout>;
let docExists = false;

const ROOT_KEY = "root";

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
      return found?.children ?? null;
    }, fileSystem);
}

export function getFile(path: string): FSFile | null {
  const parts = fsPath(path).split("/").filter(Boolean);
  const fileName = parts.pop();
  const parentDir = parts.length ? getDirectory(parts.join("/")) : fileSystem;
  if (!parentDir || !fileName) return null;
  return (parentDir.find((n) => n.name === fileName && n.type === "file") as FSFile) ?? null;
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

export function makeDirectory(path: string) {
  const parts = path.split("/").filter(Boolean);
  let level = fileSystem;
  for (const part of parts) {
    const existing = level.find((n) => n.name === part && n.type === "dir") as FSDir | undefined;
    if (existing) {
      level = existing.children;
    } else {
      const newDir: FSDir = { name: part, type: "dir", children: [] };
      level.push(newDir);
      level = newDir.children;
    }
  }
  updateLocalStorage();
}

export function makeFile(path: string, content: string) {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop()!;
  let level = fileSystem;

  for (const part of parts) {
    const existing = level.find((n) => n.name === part && n.type === "dir") as FSDir | undefined;
    if (existing) {
      level = existing.children;
    } else {
      const newDir: FSDir = { name: part, type: "dir", children: [] };
      level.push(newDir);
      level = newDir.children;
    }
  }

  if (!level.find((n) => n.name === fileName)) {
    level.push({ name: fileName, type: "file", content });
  }

  updateLocalStorage();
}

function removeNode(fsPath: string, type: "file" | "dir") {
  const parts = (fsPath === "~" ? ROOT_KEY : fsPath).split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) return false;
  const parentLevel = parts.length ? getDirectory(parts.join("/")) : fileSystem;
  if (!parentLevel) return false;
  const idx = parentLevel.findIndex((n) => n.name === name && n.type === type);
  if (idx === -1) return false;
  parentLevel.splice(idx, 1);
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

  const files: [string, string][] = [
    ["root/downloads/music/song.mp3", "audio content here"],
    ["root/documents/report.docx", "report content here"],
  ];

  for (const dir of dirs) {
    let level = fileSystem;
    for (const part of parts(dir)) {
      const existing = level.find((n) => n.name === part && n.type === "dir") as FSDir | undefined;
      if (existing) {
        level = existing.children;
        continue;
      }
      const newDir: FSDir = { name: part, type: "dir", children: [] };
      level.push(newDir);
      level = newDir.children;
    }
  }

  for (const [path, content] of files) {
    const p = parts(path);
    const fileName = p.pop()!;
    let level = fileSystem;
    for (const part of p) {
      const existing = level.find((n) => n.name === part && n.type === "dir") as FSDir | undefined;
      if (existing) {
        level = existing.children;
        continue;
      }
      const newDir: FSDir = { name: part, type: "dir", children: [] };
      level.push(newDir);
      level = newDir.children;
    }
    if (!level.find((n) => n.name === fileName)) {
      level.push({ name: fileName, type: "file", content });
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
