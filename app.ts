import { account, databases, DB_ID, COL_ID, Permission, Role } from "./lib/appwrite";
import { OAuthProvider } from "appwrite";

const terminal = document.querySelector<HTMLDivElement>("#terminal")!;
const input = document.querySelector<HTMLInputElement>("#input")!;
const workingDir = document.querySelector<HTMLSpanElement>("#workingDir")!;

if (!terminal || !input || !workingDir) {
    throw new Error("Required DOM elements #terminal, #input, or #workingDir are missing");
}

// --- Config ---
let USER = "hacker";
let USER_EMAIL = "";
const HOST = "nest";
let currentDir = "~"; // "~" = filesystem root; otherwise a slash-joined path like "root/downloads"

function formatUserName(name: string) {
    return name.replace(/\s+/g, "-");
}

let history: string[] = [];
let historyIndex = -1; // -1 = not navigating

function updatePrompt() {
    workingDir.textContent = `${USER}@${HOST} ${currentDir} $ `;
}

updatePrompt();

// --- Filesystem ---
type FSFile = { name: string; type: "file"; content: string };
type FSDir = { name: string; type: "dir"; children: FSNode[] };
type FSNode = FSFile | FSDir;

let fileSystem: FSNode[] = [];

let saveTimeout: ReturnType<typeof setTimeout>;

let docExists = false; // tracks if this user's doc exists in Appwrite

async function updateLocalStorage() {
    const user = await account.get().catch(() => null);
    if (user) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            if (docExists) {
                await databases.updateDocument(DB_ID, COL_ID, user.$id, {
                    data: JSON.stringify(fileSystem),
                });
            } else {
                await databases.createDocument(DB_ID, COL_ID, user.$id, {
                    data: JSON.stringify(fileSystem),
                }, [
                    Permission.read(Role.user(user.$id)),
                    Permission.update(Role.user(user.$id)),
                    Permission.delete(Role.user(user.$id)),
                ]);
                docExists = true;
            }
        }, 500);
    } else {
        localStorage.setItem("fileSystem", JSON.stringify(fileSystem));
    }
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

// Silent version of save used during initial setup — no network calls
function saveSync() {
    localStorage.setItem("fileSystem", JSON.stringify(fileSystem));
}

function seedFilesystem() {
    if (fileSystem.length > 0) return;
    // Build the tree directly without triggering updateLocalStorage
    const parts = (path: string) => path.split("/").filter(Boolean);

    const dirs = [
        "root/downloads/music",
        "root/downloads/videos",
        "root/downloads/games",
        "root/pictures",
    ];
    const files = [
        ["root/downloads/music/song.mp3", "audio content here"],
        ["root/documents/report.docx", "report content here"],
    ];

    for (const dir of dirs) {
        let level = fileSystem;
        for (const part of parts(dir)) {
            const existing = level.find(n => n.name === part && n.type === "dir") as FSDir | undefined;
            if (existing) { level = existing.children; continue; }
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
            const existing = level.find(n => n.name === part && n.type === "dir") as FSDir | undefined;
            if (existing) { level = existing.children; continue; }
            const newDir: FSDir = { name: part, type: "dir", children: [] };
            level.push(newDir);
            level = newDir.children;
        }
        if (!level.find(n => n.name === fileName)) {
            level.push({ name: fileName, type: "file", content });
        }
    }
    // Single save at the end, not once per file/dir
    saveSync();
}

// --- Auth & cloud sync ---
async function loadFilesystem() {
    const user = await account.get().catch(() => null);
    if (user) {
        USER = formatUserName(user.name || user.email || USER);
        USER_EMAIL = user.email || "";
        updatePrompt();
        try {
            const doc = await databases.getDocument(DB_ID, COL_ID, user.$id);
            fileSystem = JSON.parse(doc.data);
            docExists = true;
        } catch {
            // New user — transfer local data if any, else seed
            const local = localStorage.getItem("fileSystem");
            fileSystem = local ? JSON.parse(local) : [];
            seedFilesystem();
            // Create directly, no update attempt
            await databases.createDocument(DB_ID, COL_ID, user.$id, {
                data: JSON.stringify(fileSystem),
            }, [
                Permission.read(Role.user(user.$id)),
                Permission.update(Role.user(user.$id)),
                Permission.delete(Role.user(user.$id)),
            ]);
            docExists = true;
            localStorage.removeItem("fileSystem");
        }
    } else {
        fileSystem = JSON.parse(localStorage.getItem("fileSystem") ?? "[]");
        seedFilesystem();
    }
}

async function loginWithGoogle() {
    const user = await account.get().catch(() => null);
    if (user) {
        USER = formatUserName(user.name || user.email || USER);
        USER_EMAIL = user.email || "";
        print("Already logged in. Run 'logout' first.");
        return;
    }
    const local = localStorage.getItem("fileSystem");
    if (local) sessionStorage.setItem("pendingTransfer", local);
    account.createOAuth2Session(
        OAuthProvider.Google,
        `${window.location.origin}`,
        `${window.location.origin}`
    );


}

async function logout() {
    const user = await account.get().catch(() => null);
    if (!user) {
        print("Not logged in.");
        return;
    }
    await account.deleteSession("current");
    localStorage.removeItem("fileSystem");
    window.location.reload();
}

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

function _cat(path: string) {
    if (!path) { print("cat: missing operand"); return "cat: missing operand"; }

    const resolved = resolvePath(path);
    const fsPath = resolved === "~" ? "root" : resolved;
    const file = getFile(fsPath);

    if (file === null) {
        const msg = `cat: no such file: ${path}`;
        print(msg); return msg;
    }

    const msg = file.content;
    print(msg);
    return msg;
}

function _ls(path: string) {
    const resolved = path ? resolvePath(path) : currentDir;
    const fsPath = resolved === "~" ? "root" : resolved;
    const target = getDirectory(fsPath);

    if (target === null) {
        const msg = `ls: no such directory: ${path}`;
        print(msg); return msg;
    }

    const msg = target.map(n => n.name).join("\n") || "(empty)";
    print(msg);
    return (msg);
}

function _clear() {
    buffer = [];
    const msg = "Cleared the terminal!";
    print(msg);
    return (msg);
}

function _mv(origin: string, target: string) {
    if (!origin || !target) { print("mv: missing operand"); return "mv: missing operand"; }

    const originResolved = resolvePath(origin);
    const originFsPath = originResolved === "~" ? "root" : originResolved;
    const originFile = getFile(originFsPath);

    if (originFile === null) {
        const msg = `mv: no such file: ${origin}`;
        print(msg); return msg;
    }

    const targetResolved = resolvePath(target);
    const targetFsPath = targetResolved === "~" ? "root" : targetResolved;
    const targetFile = getFile(targetFsPath);

    if (targetFile !== null) {
        const msg = `mv: ${target} already exists`;
        print(msg); return msg;
    }

    makeFile(targetFsPath, originFile.content);
    removeFile(origin);
    const msg = `Moved ${origin} to ${target}`;
    print(msg);
    return msg;
}

function _cp(origin: string, target: string) {
    if (!origin || !target) { print("cp: missing operand"); return "cp: missing operand"; }

    const originResolved = resolvePath(origin);
    const originFsPath = originResolved === "~" ? "root" : originResolved;
    const originFile = getFile(originFsPath);

    if (originFile === null) {
        const msg = `cp: no such file: ${origin}`;
        print(msg); return msg;
    }

    const targetResolved = resolvePath(target);
    const targetFsPath = targetResolved === "~" ? "root" : targetResolved;
    const targetFile = getFile(targetFsPath);

    if (targetFile !== null) {
        const msg = `cp: ${target} already exists`;
        print(msg); return msg;
    }

    makeFile(targetFsPath, originFile.content);
    const msg = `Copied ${origin} to ${target}`;
    print(msg);
    return msg;
}

// Nano/Write impelentation starts here
// Claude assisted in development of Nano implementation
// --- New filesystem helper ---
function writeFile(path: string, content: string): boolean {
    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop()!;
    const parentDir = parts.length ? getDirectory(parts.join("/")) : fileSystem;
    if (!parentDir) return false;

    const file = parentDir.find(n => n.name === fileName && n.type === "file") as FSFile | undefined;
    if (!file) return false;

    file.content = content;
    updateLocalStorage();
    return true;
}

// --- Editor ---
function openEditor(fsPath: string, displayPath: string, initialContent: string) {
    const container = terminal.parentElement!;
    container.classList.add("hideMe");

    const editor = document.createElement("div");
    editor.id = "writeEditor";
    editor.innerHTML = `
        <div id="writeHeader">write — ${displayPath} &nbsp;|&nbsp; ^S Save &nbsp; ^X Save &amp; Exit &nbsp; ^Q Quit without saving</div>
        <textarea id="writeArea" spellcheck="false"></textarea>
        <div id="writeFooter">^S Save &nbsp;&nbsp; ^X Save &amp; Exit &nbsp;&nbsp; ^Q Quit</div>
    `;
    document.body.appendChild(editor);

    const textarea = editor.querySelector<HTMLTextAreaElement>("#writeArea")!;
    textarea.value = initialContent; // set via .value to avoid HTML-encoding issues
    textarea.focus();

    // Move caret to end
    textarea.selectionStart = textarea.selectionEnd = initialContent.length;

    function showSavedIndicator() {
        const header = editor.querySelector<HTMLDivElement>("#writeHeader")!;
        const original = header.textContent;
        header.textContent = "✓ Saved!";
        setTimeout(() => { header.innerHTML = `write — ${displayPath} &nbsp;|&nbsp; ^S Save &nbsp; ^X Save &amp; Exit &nbsp; ^Q Quit without saving`; }, 1000);
    }

    function save() {
        writeFile(fsPath, textarea.value);
        showSavedIndicator();
    }

    function exit() {
        editor.remove();
        container.classList.remove("hideMe");
        input.focus();
    }

    textarea.addEventListener("keydown", (e) => {
        // Tab — insert literal tab instead of shifting focus
        if (e.key === "Tab") {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.value = textarea.value.substring(0, start) + "\t" + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 1;
            return;
        }

        if (e.ctrlKey && e.key === "s") { e.preventDefault(); save(); }
        if (e.ctrlKey && e.key === "x") { e.preventDefault(); save(); exit(); }
        if (e.ctrlKey && e.key === "q") { e.preventDefault(); exit(); } // quit without saving
    });
}

function _write(path: string): string {
    if (!path) { print("write: missing operand"); return "write: missing operand"; }

    const resolved = resolvePath(path);
    const fsPath = resolved === "~" ? "root" : resolved;
    const file = getFile(fsPath);

    if (file === null) {
        const msg = `write: no such file: ${path} — use touch to create it first`;
        print(msg); return msg;
    }

    openEditor(fsPath, path, file.content);
    return "";
};

// Write implentation ends here

function _who(): string {
    const output = USER_EMAIL ? `${USER} <${USER_EMAIL}>` : USER;
    print(output);
    return output;
}

function _date(): string {
    const msg = new Date().toLocaleDateString();
    print(msg);
    return(msg);
}

function _history(): string {
    print(JSON.stringify(history));
    return(JSON.stringify(history))
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
    touch: "Make a new file!",
    rm: "Delete a file 0:<",
    cat: "Read a files content!",
    ls: "List all items in a directory",
    clear: "Clear the terminal!",
    mv: "Move a file",
    cp: "Copy a file",
    write: "Edit an existing file (^S save, ^X save & exit, ^Q quit)",
    login: "Sign in with Google",
    logout: "Sign out",
    who: "Outputs the current user",
    date: "Return the current date",
    history: "Output command history"
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
    cat: (arg = "") => _cat(arg),
    ls: (arg = "") => _ls(arg),
    clear: () => _clear(),
    mv: (arg = "") => {
        const [origin, target] = arg.split(" ");
        return _mv(origin, target);
    },
    cp: (arg = "") => {
        const [origin, target] = arg.split(" ");
        return _cp(origin, target);
    },
    write: (arg = "") => _write(arg),
    login: () => { loginWithGoogle(); return ""; },
    logout: () => { logout(); return ""; },
    who: () => _who(),
    date: () => _date(),
    history: () => _history(),
};

// --- Input handling ---
input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
        e.preventDefault();
        historyIndex = Math.max(0, historyIndex === -1 ? history.length - 1 : historyIndex - 1);
        input.innerText = history[historyIndex] ?? "";
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        historyIndex = Math.min(history.length - 1, historyIndex + 1);
        input.innerText = historyIndex === history.length - 1 ? "" : history[historyIndex] ?? "";
    }
    if (e.key !== "Enter") return;
    e.preventDefault();

    const value = input.innerText.trim();

    if (!value) return;
    history.push(value);
    historyIndex = -1;

    if (!value) return;

    print(`${USER}@${HOST} ${currentDir} $ ${value}`);

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
    if (document.getElementById("writeEditor")) return;
    input.focus();
    const range = document.createRange();
    const sel = window.getSelection()!;
    range.selectNodeContents(input);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
});

(async () => {
    await loadFilesystem();
    print("Welcome! Type 'help' for commands.");
})();