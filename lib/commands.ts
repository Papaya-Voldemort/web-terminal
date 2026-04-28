import { clearTerminal, print, updatePrompt, changeTheme } from "./dom.ts";
import { loginWithGoogle, logout } from "./auth.ts";
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
    syncFilesystem,
    checkPermission,
    getDirectoryNode,
    normalizePermissions,
    makeFunction,
    addFunction,
    type Permissions,
} from "./filesystem.ts";
import { openEditor } from "./editor.ts";
import {
    HOST,
    USER,
    USER_EMAIL,
    currentDir,
    history,
    setCurrentDir,
    setUser,
    setUserEmail,
    isSignedIn,
} from "./state.ts";
import { _via, registerMarketplaceCommand, loadPersistedCommands, initializeViaSystem } from "./via.ts";
import { version } from "bun";
import { callAI } from "./helpers.ts";

export type CommandResult = {
    output?: string;
    error?: string;
    data?: any;
};

// First command made prints hello
function _hello(): CommandResult {
    const output = {
        output: "Hello!",
    }

    return output;
}

// help prints all of the commands
function _help(): CommandResult {
    const lines = Object.entries(commandDescriptions).map(([cmd, desc]) => `  ${cmd} - ${desc}`);
    const out = ["Available commands:", ...lines].join("\n");

    const output = {
        output: out,
    }
    return output;
}

// fake simulated ping because I just love Ping Pong
function _ping(): CommandResult {
    const output = "Pong!";
    return { output };
}

// Standard echo command implementation to print whats after it
function _echo(input: string): CommandResult {
    return { output: input };
}

// change the current working directory
function _cd(dir: string): CommandResult {
    const resolved = resolvePath(currentDir, dir);
    const fsPath = toFsPath(resolved);

    const dirNode = getDirectoryNode(fsPath);
    if (dirNode === null) {
        const msg = `cd: no such file or directory: ${dir}`;
        return { error: msg };
    }

    if (!checkPermission(dirNode, USER, "x")) {
        const msg = `cd: permission denied: ${dir}`;
        return { error: msg };
    }

    setCurrentDir(resolved);
    updatePrompt(USER, HOST, resolved);
    const msg = `Changed directory to ${resolved}`;
    return { output: msg };
}

// print working directory
function _pwd(): CommandResult {
    return { output: currentDir };
}

// make a new directory
function _mkdir(dir: string): CommandResult {
    if (!dir) {
        const msg = "mkdir: missing operand";
        return { error: msg };
    }
    const resolved = resolvePath(currentDir, dir);
    const fsPath = toFsPath(resolved);
    makeDirectory(fsPath, USER);
    const msg = `Created ${dir} inside ${currentDir}!`;
    return { output: msg };
}

// delete or remove a directory
function _rmdir(dir: string, sudo = false): CommandResult {
    if (!dir) {
        const msg = "rmdir: missing operand";
        return { error: msg };
    }
    const resolved = resolvePath(currentDir, dir);
    const fsPath = toFsPath(resolved);

    const dirNode = getDirectoryNode(fsPath);  // ← fetch the node
    if (dirNode === null) {
        const msg = `rmdir: no such directory: ${dir}`;
        return { error: msg };
    }

    if (!checkPermission(dirNode, USER, "w") && !sudo) {  // ← use node, not fsPath
        const msg = `rmdir: permission denied: ${dir}`;   // ← dir, not path
        return { error: msg };
    }

    if (dirNode.children.length > 0 && !sudo) {  // ← can use dirNode.children directly now
        const msg = `rmdir: directory not empty: ${dir} (use sudo)`;
        return { error: msg };
    }

    removeDirectory(fsPath);
    const msg = `Removed ${dir}!`;
    return { output: msg };
}

// make a new file
function _touch(name: string): CommandResult {
    if (!name) {
        const msg = "touch: missing operand";
        return { error: msg };
    }
    const resolved = resolvePath(currentDir, name);
    const fsPath = toFsPath(resolved);
    const parts = fsPath.split("/").filter(Boolean);
    parts.pop();
    const parentPath = parts.join("/");
    if (parentPath && getDirectory(parentPath) === null) {
        const msg = `touch: no such directory: ${name}`;
        return { error: msg };
    }
    makeFile(fsPath, "", USER);
    const msg = `Created ${name} at ${currentDir}.`;
    return { output: msg };
}

// delete a file
function _rm(path: string, sudo = false): CommandResult {
    if (!path) {
        const msg = "rm: missing operand";
        return { error: msg };
    }
    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const file = getFile(fsPath);

    if (file === null) {
        const msg = `rm: no such file: ${path}`;
        return { error: msg };
    }

    if (!checkPermission(file, USER, "w") && !sudo) {
        const msg = `rm: permission denied: ${path}`;
        return { error: msg };
    }
    removeFile(fsPath);
    const msg = `Removed ${path}!`;
    return { output: msg };
}

// print the contents of a file
function _cat(path: string): CommandResult {
    if (!path) {
        const msg = "cat: missing operand";
        return { error: msg };
    }
    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const dirNode = getDirectoryNode(fsPath);
    const file = getFile(fsPath);

    if (dirNode !== null) {
        const msg = `cat: ${path}: Is a directory`;
        return { error: msg };
    }

    if (file === null) {
        const msg = `cat: no such file: ${path}`;
        return { error: msg };
    }

    if (!checkPermission(file, USER, "r")) {
        const msg = `cat: permission denied: ${path}`;
        return { error: msg };
    }

    const msg = file.content;
    return { output: msg };
}

// list all items in the directory
function _ls(path: string): CommandResult {
    const resolved = path ? resolvePath(currentDir, path) : currentDir;
    const fsPath = toFsPath(resolved);
    const target = getDirectory(fsPath);
    if (target === null) {
        const msg = `ls: no such directory: ${path}`;
        return { error: msg };
    }
    const msg = target.map((n) => n.name).join("\n") || "(empty)";
    return { output: msg };
}

// clear the console
function _clear(arg: string): CommandResult {
    let msg;
    if (arg.trim() === "history") {
        history.length = 0;
        msg = "Cleared terminal history!";
    }
    else {
        clearTerminal();
        msg = "Cleared the terminal!";
    }

    return { output: msg };
}

// move a file
function _mv(origin: string, target: string): CommandResult {
    if (!origin || !target) {
        const msg = "mv: missing operand";
        return { error: msg };
    }
    const originResolved = resolvePath(currentDir, origin);
    const originFsPath = toFsPath(originResolved);
    const originFile = getFile(originFsPath);
    if (originFile === null) {
        const msg = `mv: no such file: ${origin}`;

        return { error: msg };
    }

    if (!checkPermission(originFile, USER, "r") || !checkPermission(originFile, USER, "w")) {
        const msg = `mv: permission denied: ${origin}`;

        return { error: msg };
    }

    const targetResolved = resolvePath(currentDir, target);
    const targetFsPath = toFsPath(targetResolved);
    const targetFile = getFile(targetFsPath);
    if (targetFile !== null) {
        const msg = `mv: ${target} already exists`;

        return { error: msg };
    }

    makeFile(targetFsPath, originFile.content, originFile.owner, originFile);
    removeFile(originFsPath);
    const msg = `Moved ${origin} to ${target}`;

    return { output: msg };
}

// copy a file
function _cp(origin: string, target: string): CommandResult {
    if (!origin || !target) {
        const msg = "cp: missing operand";

        return { error: msg };
    }
    const originResolved = resolvePath(currentDir, origin);
    const originFsPath = toFsPath(originResolved);
    const originFile = getFile(originFsPath);
    if (originFile === null) {
        const msg = `cp: no such file: ${origin}`;

        return { error: msg };
    }

    if (!checkPermission(originFile, USER, "r")) {
        const msg = `cp: permission denied: ${target}`;

        return { error: msg };
    }

    const targetResolved = resolvePath(currentDir, target);
    const targetFsPath = toFsPath(targetResolved);
    const targetFile = getFile(targetFsPath);
    if (targetFile !== null) {
        const msg = `cp: ${target} already exists`;

        return { error: msg };
    }
    makeFile(targetFsPath, originFile.content, originFile.owner, originFile);
    const msg = `Copied ${origin} to ${target}`;

    return { output: msg };
}

// Complex Nano implentation for writing to files
function _write(path: string, sudo = false): CommandResult {
    if (!path) {
        const msg = "write: missing operand";

        return { error: msg };
    }
    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const file = getFile(fsPath);

    if (file === null) {
        const msg = `write: no such file: ${path} — use touch to create it first`;

        return { error: msg };
    }

    if (!checkPermission(file, USER, "w") && !sudo) {
        const msg = `write: permission denied: ${path}`;

        return { error: msg };
    }


    openEditor(fsPath, path, file.content);
    return { output: "" };
}

// check current user (kind of useless)
function _who(): CommandResult {
    const output = USER_EMAIL ? `${USER} <${USER_EMAIL}>` : USER;

    return { output };
}

// Print current date
function _date(): CommandResult {
    const msg = new Date().toLocaleDateString();

    return { output: msg };
}

// print command history
function _history(): CommandResult {
    const msg = JSON.stringify(history);

    return { output: msg };
}

// Search within a file
function _grep(search: string, path: string): CommandResult {
    if (!search || !path) {
        const msg = "grep: missing operand";

        return { error: msg };
    }

    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const target = getFile(fsPath);

    if (target === null) {
        const msg = `grep: no such file: ${path}`;

        return { error: msg };
    }

    if (!checkPermission(target, USER, "r")) {
        const msg = `grep: permission denied: ${path}`;

        return { error: msg };
    }

    const lines = target.content.split("\n");
    const matches = lines.filter((line) => line.includes(search));
    const msg = matches.length ? matches.join("\n") : "";

    return { output: msg };
}

// Print properites of a file
function _stat(path: string): CommandResult {
    if (!path) {
        const msg = "stat: missing operand";

        return { error: msg };
    }
    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);

    const target = getFile(fsPath) ?? getDirectoryNode(fsPath);
    if (target === null) {
        const msg = `stat: no such file or directory: ${path}`;

        return { error: msg };
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


    return { output: msg };
}

// Change the owner of a file
function _chown(args: string, sudo = false): CommandResult {
    const [newOwner, path] = args.split(" ").filter(Boolean);
    if (!newOwner || !path) {
        const msg = "chown: missing operand";

        return { error: msg };
    }

    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const target = getFile(fsPath) ?? getDirectoryNode(fsPath);

    if (target === null) {
        const msg = `chown: no such file or directory: ${path}`;

        return { error: msg };
    }

    if (USER !== "root" && !sudo) {
        const msg = `chown: permission denied: ${path}`;

        return { error: msg };
    }

    // Support "owner:group" or just "owner"
    const [owner = "", group] = newOwner.split(":");
    target.owner = owner;
    if (group) target.group = group;

    syncFilesystem();
    const msg = group
        ? `Changed owner of ${path} to ${owner}:${group}`
        : `Changed owner of ${path} to ${owner}`;

    return { output: msg };
}

// change write and read permisions of a file
function _chmod(args: string, sudo = false): CommandResult {
    const [mode, path] = args.split(" ").filter(Boolean);
    if (!mode || !path) {
        const msg = "chmod: missing operand";

        return { error: msg };
    }

    const resolved = resolvePath(currentDir, path);
    const fsPath = toFsPath(resolved);
    const target = getFile(fsPath) ?? getDirectoryNode(fsPath);

    if (target === null) {
        const msg = `chmod: no such file or directory: ${path}`;

        return { error: msg };
    }

    if (target.owner !== USER && !sudo) {
        const msg = `chmod: permission denied: ${path}`;

        return { error: msg };
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

            return { error: msg };
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
    syncFilesystem();
    const msg = `Changed permissions of ${path} to ${JSON.stringify(perms)}`;

    return { output: msg };
}

// print the first part of a file (use -n flag for extra control)
// Example Use:
// `head -n 15 [file]` to print the first 15 lines
function _head(args: string): CommandResult {
    const parts = args.split(" ");
    let n = 10;
    let path = parts[0];

    if (parts[0] === "-n" && parts[1] && parts[2]) {
        n = parseInt(parts[1]);
        path = parts[2];
    }

    if (!path) {
        const msg = "head: missing operand";

        return { error: msg };
    }


    const resolved = resolvePath(currentDir, path);
    const file = getFile(toFsPath(resolved));

    if (!file) {
        const msg = `head: no such file: ${path}`;

        return { error: msg };
    }

    const msg = file.content.split("\n").slice(0, n).join("\n");

    return { output: msg };
}

// Same as head pretty much just this time its the end of the file!
function _tail(args: string): CommandResult {
    const parts = args.split(" ");
    let n = 10;
    let path = parts[0];

    if (parts[0] === "-n" && parts[1] && parts[2]) {
        n = parseInt(parts[1]);
        path = parts[2];
    }

    if (!path) {
        const msg = "tail: missing operand";

        return { error: msg };
    }

    const resolved = resolvePath(currentDir, path);
    const file = getFile(toFsPath(resolved));

    if (!file) {
        const msg = `tail: no such file: ${path}`;

        return { error: msg };
    }

    const msg = file.content.split("\n").slice(-n).join("\n");

    return { output: msg };
}

function _theme(theme: string): CommandResult {
    const themes = [
        "light",
        "dark",
        "dracula",
        "nord",
        "monokai",
        "solarized-dark",
        "tokyo-night",
        "gruvbox-dark",
        "catppuccin-mocha",
        "one-dark-pro",
        "rose-pine",
        "everforest-dark",
        "kanagawa",
        "ayu-dark",
        "night-owl",
        "cobalt2",
        "horizon",
        "palenight",
        "iceberg",
        "panda-syntax",
        "spacegray",
        "nightfox",
        "solarized-light",
        "catppuccin-latte",
        "gruvbox-light",
        "github-light",
        "papercolor-light",
        "rose-pine-dawn",
        "ayu-light",
        "everforest-light",
        "tomorrow",
        "material-light",
        "synthwave-84",
        "cyberpunk-2077",
        "neon-nights",
        "hotline-miami",
        "retrowave",
        "outrun",
        "vaporwave",
        "miami-vice",
        "electric-blue",
        "ultraviolet",
        "ibm-green-phosphor",
        "apple-ii",
        "atari-st",
        "dos-blue",
        "c64-petscii",
        "vt100-white",
        "ukiyo-e-japanese-woodblock",
        "zen-garden-japan",
        "pagoda-red-china",
        "silk-road-central-asia",
        "henna-india",
        "rangoli-india",
        "sahara-north-africa",
        "kente-west-africa",
        "savanna-east-africa",
        "ndebele-southern-africa",
        "viking-norse",
        "celtic-ireland-scotland",
        "byzantine-eastern-europe",
        "slavic-folk",
        "ottoman-empire",
        "aztec-sun-mexico",
        "mayan-jade-central-america",
        "incan-gold-south-america",
        "pacific-islander",
        "aboriginal-dot",
        "deep-ocean",
        "coral-reef",
        "bioluminescence",
        "aurora-borealis",
        "midnight-forest",
        "cherry-blossom",
        "autumn-maple",
        "winter-frost",
        "desert-dunes",
        "volcanic-lava",
        "deep-space-nine",
        "nebula",
        "event-horizon",
        "mars-colony",
        "starfield",
        "alien-biome",
        "tron-legacy",
        "blade-runner",
        "dune-arrakis",
        "interstellar",
        "vs-code-dark",
        "sublime-text",
        "vim-dark",
        "emacs-misterioso",
        "jetbrains-darcula",
        "xcode-dark",
        "notepad-default",
        "terminalapp-macos",
        "windows-console",
        "hyper-terminal",
    ];
    if (themes.includes(theme)) {
        const finalTheme = theme.replace(/ /g, "-");
        changeTheme(finalTheme);
        const msg = `theme: updated theme to ${theme} mode`;

        return { output: msg };
    };
    if (theme === "help" || theme === "") {
        // Pretty print themes in columns
        const columnsPerRow = 4;
        const columnWidth = 30;
        const lines = [];

        lines.push("Available Themes:");
        lines.push("=".repeat(columnsPerRow * columnWidth));

        for (let i = 0; i < themes.length; i += columnsPerRow) {
            const row = themes
                .slice(i, i + columnsPerRow)
                .map(name => name.padEnd(columnWidth))
                .join("");
            lines.push(row);
        }

        lines.push("=".repeat(columnsPerRow * columnWidth));
        lines.push(`Total: ${themes.length} themes`);
        lines.push("Usage: theme <theme-name>");

        const output = lines.join("\n");

        return { output };
    }
    const msg = "theme: option not found";

    return { error: msg };
}

function _judge(): CommandResult {
    const output = {
        output: `Please visit the judging form: https://forms.fillout.com/t/fHciQ7GPGous`,
        link: "https://forms.fillout.com/t/fHciQ7GPGous"
    }

    return output;
};

function _version(): CommandResult {
    const output = {
        output: `The Current Kernal is Version 0.3.1`,
    }

    return output;
}

function _tutorial(): CommandResult {
    const msg = `Welcome to web terminal! 
    
I am so glad you are here!
                
Who am I? I am Pharaoh Tutankhamun! 
                
But today I am just guided you through your terminal!
                
Run "tut [your query]" to ask me ANYTHING (about the terminal of course!)
                
Have fun!`;

    return {
        output: msg,
    }
}

async function _tut(arg: string): Promise<CommandResult> {
  const systemPrompt = `You are a kind and helpful Unix expert named Pharaoh Tutankhamun you go by Tut.
  Keep your responces VERY SHORT and keep formating simple.
   You have access to the following terminal commands available in this web terminal:

${Object.entries(commandDescriptions).map(([cmd, desc]) => `  - ${cmd}: ${desc}`).join('\n')}

Be friendly, encouraging, and provide clear explanations. Help users learn Unix concepts and how to use these commands effectively.`;

  return {
    output: await callAI(arg, systemPrompt),
  };
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
    via: "Upload a function to the database (usage: via <name> <code>)",
    head: "Print the first lines of a file :)",
    tail: "Print the last lines of a file ;)",
    theme: "Change the theme of the terminal",
    judge: "Open a judgment panel for the project!",
    version: "Print current web terminal version",
    tutorial: "Meet the tutorial!",
    tut: "Talk to a unix specialist",
    "set-key": "Set OpenRouter API key for AI commands (tut)",
    };

export type Command = (arg?: string, sudo?: boolean) => CommandResult;

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
    clear: (arg = "") => _clear(arg),
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
        return { output: "" };
    },
    logout: () => {
        logout();
        return { output: "" };
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
    via: (arg = "") => {
        const [command = "", name = "", file = "", ...rest] = arg.split(" ");
        const description = rest.join(" ").trim();
        return _via(command, name, file, description) as any;
    },
    head: (arg = "") => _head(arg),
    tail: (arg = "") => _tail(arg),
    theme: (arg = "") => _theme(arg),
    judge: () => _judge(),
    version: () => _version(),
    tutorial: () => _tutorial(),
    tut: (arg = "") => _tut(arg),
    "set-key": (arg = "") => {
      if (!arg.trim()) return { error: "Usage: set-key <sk-or-yourkey>" };
      localStorage.setItem("openrouter_key", arg.trim());
      return { output: "✅ OpenRouter key set! Tut now works (per browser)." };
    },
    };

// Initialize VIA system with command registries
initializeViaSystem(commands, commandDescriptions);

// Re-export loadPersistedCommands for use in app.ts
export { loadPersistedCommands };
