const terminal = document.querySelector<HTMLDivElement>("#terminal")!;
const input = document.querySelector<HTMLInputElement>("#input")!;
const workingDir = document.querySelector<HTMLSpanElement>("#workingDir")!;

if (!terminal || !input || !workingDir) {
    throw new Error("Required DOM elements #terminal, #input, or #workingDir are missing");
}

// --- Config ---
const USER = "nelsonkids";
const HOST = "Nelsons-Mac-mini";
let currentDir = "~"; // "~" = filesystem root; otherwise a slash-joined path like "root/downloads"

function updatePrompt() {
    workingDir.textContent = `${USER}@${HOST} ${currentDir} $ `;
}

updatePrompt();

// --- Filesystem ---
type FSFile = { name: string; type: "file"; content: string };
type FSDir = { name: string; type: "dir"; children: FSNode[] };
type FSNode = FSFile | FSDir;

let fileSystem: FSNode[] = JSON.parse(localStorage.getItem("fileSystem") ?? "[]");

function updateLocalStorage() {
    localStorage.setItem("fileSystem", JSON.stringify(fileSystem));
}

// Walks a slash-separated path and returns the children array of the target dir, or null if not found
function getDirectory(path: string): FSNode[] | null {
    const fsPath = (!path || path === "~") ? "root" : path; // ~ = root

    return fsPath.split("/").filter(Boolean).reduce<FSNode[] | null>((level, part) => {
        if (!level) return null;
        const found = level.find(n => n.name === part && n.type === "dir") as FSDir | undefined;
        return found?.children ?? null;
    }, fileSystem);
}

function getFile(path: string): FSFile | null {
    const fsPath = (!path || path === "~") ? "root" : path;
    const parts = fsPath.split("/").filter(Boolean);
    const fileName = parts.pop();
    
    const parentDir = parts.length ? getDirectory(parts.join("/")) : fileSystem;
    if (!parentDir || !fileName) return null;
    
    return (parentDir.find(n => n.name === fileName && n.type === "file") as FSFile) ?? null;
}

// Resolves a target path relative to currentDir, supporting ".." and "~"
// NOTE: This is a AI written helper function (Thanks Claude :)
function resolvePath(target: string): string {
    if (!target || target === "~") return "~";

    // Expand ~ to root before resolving
    const expandedTarget = target.startsWith("~/")
        ? `root/${target.slice(2)}`
        : target;

    const base = currentDir === "~" ? "root" : currentDir; // treat ~ as root
    const combined = base ? `${base}/${expandedTarget}` : expandedTarget;

    const resolved: string[] = [];
    for (const part of combined.split("/").filter(Boolean)) {
        if (part === "..") resolved.pop();
        else if (part !== ".") resolved.push(part);
    }

    return resolved.join("/") || "~";
}

function makeDirectory(path: string) {
    const parts = path.split("/").filter(Boolean);
    let level = fileSystem;
    for (const part of parts) {
        const existing = level.find(n => n.name === part && n.type === "dir") as FSDir | undefined;
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

function makeFile(path: string, content: string) {
    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop()!;
    let level = fileSystem;

    for (const part of parts) {
        const existing = level.find(n => n.name === part && n.type === "dir") as FSDir | undefined;
        if (existing) {
            level = existing.children;
        } else {
            const newDir: FSDir = { name: part, type: "dir", children: [] };
            level.push(newDir);
            level = newDir.children;
        }
    }

    if (!level.find(n => n.name === fileName)) {
        level.push({ name: fileName, type: "file", content });
    }

    updateLocalStorage();
}

// Generic helper — removes any node by type from its parent
// Helper function made by Claude Sonnet 4.6
function removeNode(path: string, type: "file" | "dir"): boolean {
    const resolved = resolvePath(path);
    const parts = (resolved === "~" ? "root" : resolved).split("/").filter(Boolean);
    const name = parts.pop();
    if (!name) return false;

    const parentLevel = parts.length ? getDirectory(parts.join("/")) : fileSystem;
    if (!parentLevel) return false;

    const idx = parentLevel.findIndex(n => n.name === name && n.type === type);
    if (idx === -1) return false;

    parentLevel.splice(idx, 1);
    updateLocalStorage();
    return true;
}

function removeDirectory(path: string) {
    return removeNode(path, "dir");
}

function removeFile(path: string) {
    return removeNode(path, "file");
}

// --- Seed filesystem ---
makeDirectory("root/downloads/music");
makeDirectory("root/downloads/videos");
makeDirectory("root/downloads/games");
makeDirectory("root/pictures");
makeFile("root/downloads/music/song.mp3", "audio content here");
makeFile("root/documents/report.docx", "report content here");

// --- Output ---
let buffer: string[] = [];

function print(text: string) {
    buffer.push(text);
    terminal.textContent = buffer.join("\n");
    terminal.scrollTop = terminal.scrollHeight;
}

// --- Commands ---
function _hello() {
    print("Hello World!");
    return "Hello World!";
}

function _help() {
    const lines = Object.entries(commandDescriptions).map(([cmd, desc]) => `  ${cmd} - ${desc}`);
    const out = ["Available commands:", ...lines].join("\n");
    print(out);
    return out;
}

function _ping() {
    print("Pong!");
    return "Pong!";
}

function _echo(input: string) {
    print(input);
    return input;
}

function _cd(dir: string): string {
    const resolved = resolvePath(dir);
    const fsPath = resolved === "~" ? "" : resolved;

    if (getDirectory(fsPath) !== null) {
        currentDir = resolved;
        updatePrompt();
        const msg = `Changed directory to ${currentDir}`;
        print(msg);
        return msg;
    }

    const msg = `cd: no such file or directory: ${dir}`;
    print(msg);
    return msg;
}

function _pwd() {
    print(currentDir);
    return (currentDir);
}

function _mkdir(dir: string) {
    if (!dir) { print("mkdir: missing operand"); return "mkdir: missing operand"; }

    const resolved = resolvePath(dir);
    const fsPath = resolved === "~" ? "root" : resolved;

    makeDirectory(fsPath);

    const msg = `Created ${dir} inside ${currentDir}!`;
    print(msg);
    return msg;
}

function _rmdir(dir: string, sudo = false): string {
    if (!dir) { print("rmdir: missing operand"); return "rmdir: missing operand"; }

    const resolved = resolvePath(dir);
    const fsPath = resolved === "~" ? "root" : resolved;
    const dirChildren = getDirectory(fsPath);

    if (dirChildren === null) {
        const msg = `rmdir: no such directory: ${dir}`;
        print(msg); return msg;
    }

    if (dirChildren.length > 0 && !sudo) {
        const msg = `rmdir: directory not empty: ${dir} (use sudo)`;
        print(msg); return msg;
    }

    removeDirectory(dir);
    const msg = `Removed ${dir}!`;
    print(msg);
    return msg;
}

function _touch(name: string) {
    if (!name) { print("touch: missing operand"); return "touch: missing operand"; };

    const resolved = resolvePath(name);
    const fsPath = resolved === "~" ? "root" : resolved;
    
    const parts = (resolved === "~" ? "root" : resolved).split("/");
    parts.pop();
    const parentPath = parts.join("/");

    if (parentPath && getDirectory(parentPath) === null) {
        const msg = `touch: no such directory: ${name}`;
        print(msg); return msg;
    }

    makeFile(fsPath, "");
    const msg = `Created ${name} at ${currentDir}.`;
    print(msg);
    return (msg);
}

function _rm(path: string) {
    if (!path) { print("rm: missing operand"); return "rm: missing operand"; }

    const resolved = resolvePath(path);
    const fsPath = resolved === "~" ? "root" : resolved;
    const file = getFile(fsPath);

    if (file === null) {
        const msg = `rm: no such file: ${path}`;
        print(msg); return msg;
    }

    removeFile(path);
    const msg = `Removed ${path}!`;
    print(msg);
    return msg;
}


const commandDescriptions: Record<string, string> = {
    hello: "Prints Hello World!",
    help: "Displays all implemented commands and descriptions",
    ping: "Prints Pong!",
    echo: "Echoes the text argument back",
    cd: "Changes current working directory (supports relative paths and ..)",
    pwd: "Prints the current working directory!",
    mkdir: "Make a new directory :)",
    rmdir: "Remove a directory :0",
    touch: "Make a new file!"
};

type Command = (arg?: string, sudo?: boolean) => string;

const commands: Partial<Record<string, Command>> = {
    hello: () => _hello(),
    help: () => _help(),
    ping: () => _ping(),
    echo: (arg = "") => _echo(arg),
    cd: (arg = "~") => _cd(arg),
    pwd: (arg = "") => _pwd(),
    mkdir: (arg = "") => _mkdir(arg),
    rmdir: (arg = "", sudo = false) => _rmdir(arg, sudo),
    touch: (arg = "") => _touch(arg),
    rm: (arg = "") => _rm(arg),
};

// --- Input handling ---
input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const value = input.innerText.trim();
    if (!value) return;

    print(`> ${value}`);

    const parts = value.split(" ");

    let sudo = false;
    if (parts[0] === "sudo") {
        sudo = true;
        parts.shift();
    }

    const [cmd, ...rest] = parts;
    const arg = rest.join(" ");
    const handler = commands[cmd];

    if (handler) {
        handler(arg, sudo);
    } else {
        print(`Unknown command: ${cmd}`);
    }

    input.innerText = "";
});

// Keep input focused and caret at end on any click
document.addEventListener("click", () => {
    input.focus();
    const range = document.createRange();
    const sel = window.getSelection()!;
    range.selectNodeContents(input);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
});

print("Welcome! Type 'help' for commands.");