import { clearTerminal, print, updatePrompt } from "./dom";
import { loginWithGoogle, logout } from "./auth";
import {
    getDirectory,
    getFile,
    makeDirectory,
    makeFile,
    removeDirectory,
    removeFile,
    resolvePath,
    toFsPath,
    writeFile,
    updateLocalStorage,
    checkPermission,
    getDirectoryNode,
    normalizePermissions,
    type Permissions,
} from "./filesystem";
import { openEditor } from "./editor";
import {
    HOST,
    USER,
    USER_EMAIL,
    currentDir,
    history,
    setCurrentDir,
    setUser,
    setUserEmail,
} from "./state";

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
    const resolved = resolvePath(currentDir, dir);
    const fsPath = toFsPath(resolved);

    const dirNode = getDirectoryNode(fsPath);
    if (dirNode === null) {
        const msg = `cd: no such file or directory: ${dir}`;
        print(msg);
        return msg;
    }

    if (!checkPermission(dirNode, USER, "x")) {
        const msg = `cd: permission denied: ${dir}`;
        print(msg);
        return msg;
    }

    setCurrentDir(resolved);
    updatePrompt(USER, HOST, resolved);
    const msg = `Changed directory to ${resolved}`;
    print(msg);
    return msg;
}

function _pwd(): string {
    print(currentDir);
    return currentDir;
}

function _mkdir(dir: string): string {
    if (!dir) {
        print("mkdir: missing operand");
        return "mkdir: missing operand";
    }
    const resolved = resolvePath(currentDir, dir);
    const fsPath = toFsPath(resolved);
    makeDirectory(fsPath, USER);
    const msg = `Created ${dir} inside ${currentDir}!`;
    print(msg);
    return msg;
}

function _rmdir(dir: string, sudo = false): string {
    if (!dir) {
        print("rmdir: missing operand");
        return "rmdir: missing operand";
    }
    const resolved = resolvePath(currentDir, dir);
    const fsPath = toFsPath(resolved);

    const dirNode = getDirectoryNode(fsPath);  // ← fetch the node
    if (dirNode === null) {
        const msg = `rmdir: no such directory: ${dir}`;
        print(msg);
        return msg;
    }

    if (!checkPermission(dirNode, USER, "w") && !sudo) {  // ← use node, not fsPath
        const msg = `rmdir: permission denied: ${dir}`;   // ← dir, not path
        print(msg);
        return msg;
    }

    if (dirNode.children.length > 0 && !sudo) {  // ← can use dirNode.children directly now
        const msg = `rmdir: directory not empty: ${dir} (use sudo)`;
        print(msg);
        return msg;
    }

    removeDirectory(fsPath);
    const msg = `Removed ${dir}!`;
    print(msg);
    return msg;
}

function _touch(name: string): string {
    if (!name) {
        print("touch: missing operand");
        return "touch: missing operand";
    }
    const resolved = resolvePath(currentDir, name);
    const fsPath = toFsPath(resolved);
    const parts = fsPath.split("/").filter(Boolean);
    parts.pop();
    const parentPath = parts.join("/");
    if (parentPath && getDirectory(parentPath) === null) {
        const msg = `touch: no such directory: ${name}`;
        print(msg);
        return msg;
    }
    makeFile(fsPath, "", USER);
    const msg = `Created ${name} at ${currentDir}.`;
    print(msg);
    return msg;
}

function _rm(path: string, sudo = false): string {
    if (!path) {
        print("rm: missing operand");
        return "rm: missing operand";
    }
    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const file = getFile(fsPath);

    if (file === null) {
        const msg = `rm: no such file: ${path}`;
        print(msg);
        return msg;
    }

    if (!checkPermission(file, USER, "w") && !sudo) {
        const msg = `rm: permission denied: ${path}`;
        print(msg);
        return msg;
    }
    removeFile(fsPath);
    const msg = `Removed ${path}!`;
    print(msg);
    return msg;
}

function _cat(path: string): string {
    if (!path) {
        print("cat: missing operand");
        return "cat: missing operand";
    }
    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const file = getFile(fsPath);

    if (file === null) {
        const msg = `cat: no such file: ${path}`;
        print(msg);
        return msg;
    }

    if (!checkPermission(file, USER, "r")) {
        const msg = `cat: permission denied: ${path}`;
        print(msg);
        return msg;
    }

    const msg = file.content;
    print(msg);
    return msg;
}

function _ls(path: string): string {
    const resolved = path ? resolvePath(currentDir, path) : currentDir;
    const fsPath = toFsPath(resolved);
    const target = getDirectory(fsPath);
    if (target === null) {
        const msg = `ls: no such directory: ${path}`;
        print(msg);
        return msg;
    }
    const msg = target.map((n) => n.name).join("\n") || "(empty)";
    print(msg);
    return msg;
}

function _clear() {
    clearTerminal();
    const msg = "Cleared the terminal!";
    print(msg);
    return msg;
}

function _mv(origin: string, target: string): string {
    if (!origin || !target) {
        print("mv: missing operand");
        return "mv: missing operand";
    }
    const originResolved = resolvePath(currentDir, origin);
    const originFsPath = toFsPath(originResolved);
    const originFile = getFile(originFsPath);
    if (originFile === null) {
        const msg = `mv: no such file: ${origin}`;
        print(msg);
        return msg;
    }

    if (!checkPermission(originFile, USER, "r") || !checkPermission(originFile, USER, "w")) {
        const msg = `mv: permission denied: ${origin}`;
        print(msg);
        return msg;
    }

    const targetResolved = resolvePath(currentDir, target);
    const targetFsPath = toFsPath(targetResolved);
    const targetFile = getFile(targetFsPath);
    if (targetFile !== null) {
        const msg = `mv: ${target} already exists`;
        print(msg);
        return msg;
    }

    makeFile(targetFsPath, originFile.content, originFile.owner, originFile);
    removeFile(originFsPath);
    const msg = `Moved ${origin} to ${target}`;
    print(msg);
    return msg;
}

function _cp(origin: string, target: string): string {
    if (!origin || !target) {
        print("cp: missing operand");
        return "cp: missing operand";
    }
    const originResolved = resolvePath(currentDir, origin);
    const originFsPath = toFsPath(originResolved);
    const originFile = getFile(originFsPath);
    if (originFile === null) {
        const msg = `cp: no such file: ${origin}`;
        print(msg);
        return msg;
    }

    if (!checkPermission(originFile, USER, "r")) {
        const msg = `cp: permission denied: ${target}`;
        print(msg);
        return msg;
    }

    const targetResolved = resolvePath(currentDir, target);
    const targetFsPath = toFsPath(targetResolved);
    const targetFile = getFile(targetFsPath);
    if (targetFile !== null) {
        const msg = `cp: ${target} already exists`;
        print(msg);
        return msg;
    }
    makeFile(targetFsPath, originFile.content, originFile.owner, originFile);
    const msg = `Copied ${origin} to ${target}`;
    print(msg);
    return msg;
}

function _write(path: string, sudo = false): string {
    if (!path) {
        print("write: missing operand");
        return "write: missing operand";
    }
    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const file = getFile(fsPath);

    if (file === null) {
        const msg = `write: no such file: ${path} — use touch to create it first`;
        print(msg);
        return msg;
    }

    if (!checkPermission(file, USER, "w") && !sudo) {
        const msg = `write: permission denied: ${path}`;
        print(msg);
        return msg;
    }


    openEditor(fsPath, path, file.content);
    return "";
}

function _who() {
    const output = USER_EMAIL ? `${USER} <${USER_EMAIL}>` : USER;
    print(output);
    return output;
}

function _date(): string {
    const msg = new Date().toLocaleDateString();
    print(msg);
    return msg;
}

function _history() {
    print(JSON.stringify(history));
    return JSON.stringify(history);
}

function _grep(search: string, path: string): string {
    if (!search || !path) {
        const msg = "grep: missing operand";
        print(msg);
        return msg;
    }

    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const target = getFile(fsPath);

    if (target === null) {
        const msg = `grep: no such file: ${path}`;
        print(msg);
        return msg;
    }

    if (!checkPermission(target, USER, "r")) {
        const msg = `grep: permission denied: ${path}`;
        print(msg);
        return msg;
    }

    const lines = target.content.split("\n");
    const matches = lines.filter((line) => line.includes(search));
    const msg = matches.length ? matches.join("\n") : "";
    print(msg);
    return msg;
}

function _stat(path: string): string {
    if (!path) {
        print("stat: missing operand");
        return "stat: missing operand";
    }
    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);

    const target = getFile(fsPath) ?? getDirectoryNode(fsPath);
    if (target === null) {
        const msg = `stat: no such file or directory: ${path}`;
        print(msg);
        return msg;
    }

    const msg = JSON.stringify({
        name: target.name,
        type: target.type,
        owner: target.owner,
        group: target.group,
        permissions: target.permissions,
        createdAt: new Date(target.createdAt).toLocaleString(),
        modifiedAt: new Date(target.modifiedAt).toLocaleString(),
        accessedAt: new Date(target.accessedAt).toLocaleString(),
        ...(target.type === "file" && { size: target.size }),
    }, null, 2);

    print(msg);
    return msg;
}

function _chown(args: string, sudo = false): string {
    const [newOwner, path] = args.split(" ").filter(Boolean);
    if (!newOwner || !path) {
        print("chown: missing operand");
        return "chown: missing operand";
    }

    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const target = getFile(fsPath) ?? getDirectoryNode(fsPath);

    if (target === null) {
        const msg = `chown: no such file or directory: ${path}`;
        print(msg);
        return msg;
    }

    if (USER !== "root" && !sudo) {
        const msg = `chown: permission denied: ${path}`;
        print(msg);
        return msg;
    }

    // Support "owner:group" or just "owner"
    const [owner = "", group] = newOwner.split(":");
    target.owner = owner;
    if (group) target.group = group;

    updateLocalStorage();
    const msg = group
        ? `Changed owner of ${path} to ${owner}:${group}`
        : `Changed owner of ${path} to ${owner}`;
    print(msg);
    return msg;
}

function _chmod(args: string, sudo = false): string {
    const [mode, path] = args.split(" ").filter(Boolean);
    if (!mode || !path) {
        print("chmod: missing operand");
        return "chmod: missing operand";
    }

    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const target = getFile(fsPath) ?? getDirectoryNode(fsPath);

    if (target === null) {
        const msg = `chmod: no such file or directory: ${path}`;
        print(msg);
        return msg;
    }

    if (target.owner !== USER && !sudo) {
        const msg = `chmod: permission denied: ${path}`;
        print(msg);
        return msg;
    }

    let perms = normalizePermissions(target.permissions);
    const numericMode = mode.match(/^([0-7]{3})$/);
    if (numericMode) {
        const digits = (numericMode[1] || "000").split("").map((digit) => parseInt(digit, 8));
        const [ownerDigit = 0, groupDigit = 0, othersDigit = 0] = digits;
        const toBits = (value: number) => `${value & 4 ? "r" : "-"}${value & 2 ? "w" : "-"}${value & 1 ? "x" : "-"}`;
        perms = {
            owner: toBits(ownerDigit),
            group: toBits(groupDigit),
            others: toBits(othersDigit),
        };
    } else {
        const symbolic = mode.match(/^([ugoa]+)([+\-=])([rwx]*)$/);
        if (!symbolic) {
            const msg = `chmod: invalid mode: ${mode}`;
            print(msg);
            return msg;
        }

        const [, who, op, bits] = symbolic as [string, string, string, string];

        const applyOp = (current: string, op: string, bits: string): string => {
            let r = current[0] !== "-";
            let w = current[1] !== "-";
            let x = current[2] !== "-";

            if (op === "=") {
                r = false;
                w = false;
                x = false;
            }

            if (bits.includes("r")) r = op !== "-";
            if (bits.includes("w")) w = op !== "-";
            if (bits.includes("x")) x = op !== "-";

            return `${r ? "r" : "-"}${w ? "w" : "-"}${x ? "x" : "-"}`;
        };

        const targets = who.includes("a") ? ["u", "g", "o"] : who.split("");
        for (const t of targets) {
            if (t === "u") perms.owner = applyOp(perms.owner, op, bits);
            if (t === "g") perms.group = applyOp(perms.group, op, bits);
            if (t === "o") perms.others = applyOp(perms.others, op, bits);
        }
    }

    target.permissions = perms;
    updateLocalStorage();
    const msg = `Changed permissions of ${path} to ${JSON.stringify(perms)}`;
    print(msg);
    return msg;
}

export const commandDescriptions: Record<string, string> = {
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
    history: "Output command history",
    grep: "Search for contents in a file :)",
    stat: "Print the properties of a file!",
    chown: "Change owner of a file or directory (supports owner:group)",
    chmod: "Change permissions of a file or directory (e.g. chmod u+x file)",
};

export type Command = (arg?: string, sudo?: boolean) => string;

export const commands: Partial<Record<string, Command>> = {
    hello: () => _hello(),
    help: () => _help(),
    ping: () => _ping(),
    echo: (arg = "") => _echo(arg),
    cd: (arg = "~") => _cd(arg),
    pwd: () => _pwd(),
    mkdir: (arg = "") => _mkdir(arg),
    rmdir: (arg = "", sudo = false) => _rmdir(arg, sudo),
    touch: (arg = "") => _touch(arg),
    rm: (arg = "", sudo = false) => _rm(arg, sudo),
    cat: (arg = "") => _cat(arg),
    ls: (arg = "") => _ls(arg),
    clear: () => _clear(),
    mv: (arg = "") => {
        const [origin = "", target = ""] = arg.split(" ");
        return _mv(origin, target);
    },
    cp: (arg = "") => {
        const [origin = "", target = ""] = arg.split(" ");
        return _cp(origin, target);
    },
    write: (arg = "", sudo = false) => _write(arg, sudo),
    login: () => {
        loginWithGoogle();
        return "";
    },
    logout: () => {
        logout();
        return "";
    },
    who: () => _who(),
    date: () => _date(),
    history: () => _history(),
    grep: (arg = "") => {
        const [search = "", path = ""] = arg.split(" ");
        return _grep(search, path);
    },
    stat: (arg = "") => _stat(arg),
    chown: (arg = "", sudo = false) => _chown(arg, sudo),
    chmod: (arg = "", sudo = false) => _chmod(arg, sudo),
};
