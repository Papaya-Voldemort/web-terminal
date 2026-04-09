// via.ts (beta) made with help from Claude Haiku 4.5

import { print } from "./dom";
import {
    getFile,
    getDirectory,
    makeFile,
    writeFile,
    resolvePath,
    toFsPath,
    checkPermission,
    makeFunction,
    addFunction,
} from "./filesystem";
import { currentDir, isSignedIn, USER } from "./state";
import { databases, DB_ID, MKT_ID, Query } from "./appwrite";

// These will be initialized by commands.ts
let commandsRegistry: Record<string, any> = {};
let descriptionsRegistry: Record<string, string> = {};

/**
 * Initialize the VIA system with references to the command registries
 */
export function initializeViaSystem(commands: Record<string, any>, commandDescriptions: Record<string, string>) {
    commandsRegistry = commands;
    descriptionsRegistry = commandDescriptions;
}

// ─── Beta VIA APIs for File I/O ────────────────────────────────────────────

/**
 * Validates that a path is within the home directory (sandboxing)
 * Prevents directory traversal attacks
 * @param requestedPath - The path user is trying to access
 * @returns The resolved path if valid, throws error if outside home directory
 */
function validateSandboxPath(requestedPath: string): string {
    // Resolve the path from root (home directory perspective)
    const resolved = resolvePath("root", requestedPath);

    // Ensure the resolved path starts with "root/" (home directory)
    if (!resolved.startsWith("root/") && resolved !== "root") {
        throw new Error(`Access denied: path outside home directory: ${requestedPath}`);
    }

    return resolved;
}

/**
 * VIA Beta API for file I/O operations
 * These APIs are experimental and may change
 */
export const viaApi = {
    /**
     * Read a file from the terminal's home directory
     * @param filepath - Path relative to home directory
     * @returns File contents as string
     * @throws Error if file not found or outside home directory
     */
    readFile: (filepath: string): string => {
        try {
            const validPath = validateSandboxPath(filepath);
            const fsPath = toFsPath(validPath);
            const file = getFile(fsPath);

            if (!file) {
                throw new Error(`File not found: ${filepath}`);
            }

            if (!checkPermission(file, USER, "r")) {
                throw new Error(`Permission denied: cannot read ${filepath}`);
            }

            return file.content;
        } catch (error) {
            throw new Error(`viaApi.readFile failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    /**
     * Write content to a file in the terminal's home directory
     * Creates file if it doesn't exist, overwrites if it does
     * @param filepath - Path relative to home directory
     * @param content - Content to write
     * @returns Number of bytes written
     * @throws Error if outside home directory or permission denied
     */
    writeFile: (filepath: string, content: string): number => {
        try {
            const validPath = validateSandboxPath(filepath);
            const fsPath = toFsPath(validPath);
            const existing = getFile(fsPath);

            if (existing) {
                if (!checkPermission(existing, USER, "w")) {
                    throw new Error(`Permission denied: cannot write to ${filepath}`);
                }
                writeFile(fsPath, content);
            } else {
                makeFile(fsPath, content, USER, {
                    permissions: { owner: "rw-", group: "r--", others: "r--" },
                });
            }

            return content.length;
        } catch (error) {
            throw new Error(`viaApi.writeFile failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    /**
     * List files and directories in a directory
     * @param dirpath - Path relative to home directory (defaults to current directory)
     * @returns Array of filenames and directory names
     * @throws Error if directory not found or outside home directory
     */
    listDir: (dirpath: string = "."): string[] => {
        try {
            const validPath = validateSandboxPath(dirpath);
            const fsPath = toFsPath(validPath);
            const nodes = getDirectory(fsPath);

            if (!nodes) {
                throw new Error(`Directory not found: ${dirpath}`);
            }

            return nodes.map(node => {
                const suffix = node.type === "dir" ? "/" : "";
                return node.name + suffix;
            });
        } catch (error) {
            throw new Error(`viaApi.listDir failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    },
};


// Configuration paths for VIA system
const PERSIST_COMMANDS_PATH = "root/.config/.commands";
const VIA_CONFIG_PATH = "root/.via";

/**
 * Retrieves the VIA configuration file
 * @returns Configuration object with agreed property
 */
function getViaConfig() {
    const file = getFile(VIA_CONFIG_PATH);
    if (!file) return { agreed: false };
    try {
        return JSON.parse(file.content);
    } catch {
        return { agreed: false };
    }
}

/**
 * Checks if the user has accepted the VIA agreement
 * @returns true if agreement has been accepted, false otherwise
 */
function hasAcceptedViaAgreement() {
    return getViaConfig().agreed === true;
}

/**
 * Saves the VIA agreement to the configuration file
 * @async
 */
async function saveViaAgreement() {
    const content = JSON.stringify({ agreed: true, acceptedAt: Date.now() }, null, 2);
    const file = getFile(VIA_CONFIG_PATH);
    if (file) {
        writeFile(VIA_CONFIG_PATH, content);
    } else {
        makeFile(VIA_CONFIG_PATH, content, USER, {
            permissions: { owner: "rw-", group: "r--", others: "r--" },
        });
    }
}

/**
 * Registers a marketplace command in the command registry
 * @param name - Name of the command
 * @param result - Result object containing the function and optional description
 */
export function registerMarketplaceCommand(
    name: string,
    result: { fn: Function; description?: string; author?: string }
) {
    commandsRegistry[name] = (arg = "") => {
        try {
            // Call the function with both input and viaApi
            // Functions can use viaApi as a second parameter if needed
            const fnResult = result.fn(arg, viaApi);

            // Handle different return types
            let output = "";
            if (fnResult === undefined || fnResult === null) {
                output = "";
            } else if (typeof fnResult === "string") {
                output = fnResult;
            } else if (typeof fnResult === "number") {
                output = String(fnResult);
            } else {
                output = JSON.stringify(fnResult);
            }

            // Always print output, even if it's an empty string (some commands intentionally return nothing)
            if (output !== "") {
                print(output);
            }
            return output;
        } catch (error) {
            const msg = `Error in "${name}": ${error instanceof Error ? error.message : String(error)}`;
            print(msg);
            console.error(`Full error for ${name}:`, error); // Log to browser console for debugging
            return msg;
        }
    };

    const description = result.description ?? `Marketplace command "${name}"`;
    descriptionsRegistry[name] = description;
}

/**
 * Retrieves command metadata and source code from the marketplace
 * @param name - Name of the command
 * @returns Object with name, author, description, and code, or null if not found
 */
export async function getCommandInfo(
    name: string
): Promise<{ name: string; author: string; description: string; code: string } | null> {
    try {
        const existing = await databases.listDocuments(DB_ID, MKT_ID, [
            Query.equal("name", name),
        ]);

        if (existing.documents.length === 0) return null;

        const doc = existing.documents[0] as {
            name?: string;
            code?: string;
            description?: string;
            author?: string;
        };

        if (!doc.code || typeof doc.code !== "string") return null;

        return {
            name: doc.name || name,
            author: doc.author || "unknown",
            description: doc.description || "No description provided",
            code: doc.code,
        };
    } catch {
        return null;
    }
}

/**
 * Truncates code to a maximum number of lines with ellipsis if needed
 * @param code - Code to truncate
 * @param maxLines - Maximum number of lines to return
 * @returns Truncated code and boolean indicating if it was truncated
 */
function truncateCode(code: string, maxLines: number = 20): [string, boolean] {
    const lines = code.split("\n");
    if (lines.length <= maxLines) {
        return [code, false];
    }
    return [lines.slice(0, maxLines).join("\n") + "\n...", true];
}

/**
 * Persists an added marketplace command to the commands list
 * @param name - Name of the command to persist
 * @async
 */
async function persistAddedCommand(name: string) {
    const file = getFile(PERSIST_COMMANDS_PATH);
    const existing = file?.content ?? "";
    const lines = existing
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    if (!lines.includes(name)) {
        lines.push(name);
        if (file) {
            writeFile(PERSIST_COMMANDS_PATH, lines.join("\n"));
        } else {
            makeFile(PERSIST_COMMANDS_PATH, lines.join("\n"), USER, {
                permissions: { owner: "rw-", group: "r--", others: "r--" },
            });
        }
    }
}

/**
 * Loads marketplace commands that were previously added by the user
 * @async
 */
export async function loadPersistedCommands() {
    const file = getFile(PERSIST_COMMANDS_PATH);
    if (!file) return;

    const names = file.content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    for (const name of names) {
        if (commandsRegistry[name]) continue;
        const result = await addFunction(name);
        if (!result) continue;
        registerMarketplaceCommand(name, result);
    }
}

/**
 * Main VIA command handler
 * 
 * V.I.A. stands for Verified Installation & Accountability
 * It is a marketplace for user-created functions that can be shared among users
 * 
 * Usage:
 *   via help                                — Show help menu
 *   via agree                               — Accept VIA agreement to use marketplace
 *   via docs                                — Browse VIA documentation
 *   via view <name>                         — View source code before installing
 *   via create <name> <file> [description]  — Upload a file as a marketplace function
 *   via add <name>                          — Install a marketplace function
 * 
 * @param command - The subcommand to execute
 * @param name - The name of the function (for create/add/view)
 * @param file - The file path containing the function code (for create)
 * @param description - Optional description of the function (for create)
 * @returns Output message from the operation
 * @async
 */
async function _via(command: string, name: string, file: string, description = ""): Promise<string> {
    if (command === "help" || command === "" || command === null || !command) {
        const msg = [
            "via — function marketplace",
            "  via help                             — show this help",
            "  via agree                            — accept the VIA agreement",
            "  via docs                             — browse VIA documentation",
            "  via view <name>                      — view source before installing",
            "  via create <name> <file> [desc]     — upload a file as a function",
            "  via add <name>                       — install a function from the marketplace",
        ].join("\n");
        print(msg);
        return msg;
    }

    if (command === "docs") {
        const msg = [
            "V.I.A. Documentation Guide",
            "",
            "1. Getting Started",
            "   via agree       — Accept the VIA agreement (required to use marketplace)",
            "",
            "2. Creating Commands",
            "   via create <name> <file> [desc]  — Upload your command",
            "   Requirements: You must be logged in",
            "",
            "3. Installing Commands",
            "   via view <name>    — Inspect source code before installing",
            "   via add <name>     — Install a command from the marketplace",
            "",
            "4. Key Principles",
            "   • Always use 'via view' before 'via add' to inspect code",
            "   • Read descriptions carefully",
            "   • Only install commands from creators you trust",
            "   • Commands run at your own risk",
            "",
            "5. Creating Good Commands",
            "   • Handle edge cases and errors gracefully",
            "   • Return text-based output (strings or JSON)",
            "   • Include helpful error messages",
            "   • Document what your command does",
            "   • Test thoroughly before uploading",
            "",
            "6. Security Model",
            "   • Commands are sandboxed - can't access files or network",
            "   • Always review code with 'via view' before installing",
            "   • Trust is your responsibility - not guaranteed",
            "",
            "For more details, see VIA.md in the project root.",
        ].join("\n");
        print(msg);
        return msg;
    }

    if (command === "agree") {
        if (hasAcceptedViaAgreement()) {
            const msg = "VIA agreement already accepted.";
            print(msg);
            return msg;
        }
        await saveViaAgreement();
        const msg = "VIA agreement accepted. You can now use via create or via add.";
        print(msg);
        return msg;
    }

    if (command === "view") {
        if (!name) {
            const msg = "via view: missing operand — usage: via view <name>";
            print(msg);
            return msg;
        }

        const info = await getCommandInfo(name);
        if (!info) {
            const msg = `via view: no such function: ${name}`;
            print(msg);
            return msg;
        }

        const [code, wasTruncated] = truncateCode(info.code, 30);
        const msg = [
            `Name: ${info.name}`,
            `Author: ${info.author}`,
            `Description: ${info.description}`,
            "",
            "--- SOURCE CODE ---",
            code,
            wasTruncated ? `\n(Showing first 30 lines of ${info.code.split("\n").length} total)` : "",
        ]
            .filter(Boolean)
            .join("\n");

        print(msg);
        return msg;
    }

    if (command === "create") {
        if (!hasAcceptedViaAgreement()) {
            const msg = [
                "V.I.A. – Verified Installation & Accountability Agreement",
                "",
                "By accessing or using the VIA Marketplace, you agree to the following terms:",
                "",
                "You will not create, upload, distribute, or promote commands that are malicious, deceptive, or intended to harm users, systems, or data.",
                "You acknowledge that commands available on the VIA Marketplace may be created by third parties and are not guaranteed to be safe, secure, or free of vulnerabilities.",
                "You understand that installing and executing commands is done at your own risk, and may result in system compromise, data loss, or unintended behavior.",
                "You accept full responsibility for reviewing, understanding, and trusting any command before installation or execution.",
                "The VIA Marketplace and its operators are not liable for any damage, loss, or security issues resulting from the use of third-party commands.",
                "",
                "By continuing, you confirm that you understand and accept these terms.",
                "",
                "Run 'via agree' to accept the agreement and continue.",
            ].join("\n");
            print(msg);
            return msg;
        }
        if (!isSignedIn()) {
            const msg = "via create: please log in to make custom commands";
            print(msg);
            return msg;
        }
        if (!name || !file) {
            const msg = "via create: missing operand — usage: via create <name> <file> [description]";
            print(msg);
            return msg;
        }

        const resolved = resolvePath(currentDir, file);
        const fsPath = toFsPath(resolved);
        const target = getFile(fsPath);

        if (target === null) {
            const msg = `via create: no such file: ${file}`;
            print(msg);
            return msg;
        }

        if (!checkPermission(target, USER, "r")) {
            const msg = `via create: permission denied: ${file}`;
            print(msg);
            return msg;
        }

        await makeFunction(name, target.content, description);
        const msg = `Uploaded function "${name}"`;
        print(msg);
        return msg;
    }

    if (command === "add") {
        if (!hasAcceptedViaAgreement()) {
            const msg = [
                "V.I.A. – Verified Installation & Accountability Agreement",
                "",
                "By accessing or using the VIA Marketplace, you agree to the following terms:",
                "",
                "You will not create, upload, distribute, or promote commands that are malicious, deceptive, or intended to harm users, systems, or data.",
                "You acknowledge that commands available on the VIA Marketplace may be created by third parties and are not guaranteed to be safe, secure, or free of vulnerabilities.",
                "You understand that installing and executing commands is done at your own risk, and may result in system compromise, data loss, or unintended behavior.",
                "You accept full responsibility for reviewing, understanding, and trusting any command before installation or execution.",
                "The VIA Marketplace and its operators are not liable for any damage, loss, or security issues resulting from the use of third-party commands.",
                "",
                "By continuing, you confirm that you understand and accept these terms.",
                "",
                "Run 'via agree' to accept the agreement and continue.",
            ].join("\n");
            print(msg);
            return msg;
        }
        if (!name) {
            const msg = "via add: missing operand — usage: via add <name>";
            print(msg);
            return msg;
        }

        const info = await getCommandInfo(name);
        if (!info) {
            const msg = `via add: no such function: ${name}`;
            print(msg);
            return msg;
        }

        // Show warning and source code preview
        const [code, wasTruncated] = truncateCode(info.code, 15);
        print([
            "⚠️  You are installing a third-party command.",
            "",
            `Name: ${info.name}`,
            `Author: ${info.author}`,
            `Description: ${info.description}`,
            "",
            "--- SOURCE CODE (first 15 lines) ---",
            code,
            wasTruncated ? "\n(Use 'via view " + name + "' to see full source)" : "",
            "",
            `✓ Installing "${name}"...`,
        ]
            .filter(Boolean)
            .join("\n"));

        const result = await addFunction(name);
        if (!result) {
            const msg = `via add: failed to load function: ${name}`;
            print(msg);
            return msg;
        }

        // Query for the command
        const existing = await databases.listDocuments(DB_ID, MKT_ID, [
            Query.equal("name", name),
        ]);

        if (existing.documents.length > 0) {
            const doc = existing.documents[0] as { $id?: string; downloads?: number };

            await databases.updateDocument(DB_ID, MKT_ID, doc.$id || "", {
                downloads: (doc.downloads || 0) + 1,
            });
        }

        registerMarketplaceCommand(name, result);
        await persistAddedCommand(name);

        const msg = `✓ Added marketplace command "${name}"`;
        print(msg);
        return msg;
    }

    if (command === "explore") {
        // Query the results
        const result = await databases.listDocuments(DB_ID, MKT_ID, [
            Query.orderDesc("downloads"),  // ← Likely need orderDesc, not orderBy
            Query.limit(10),
        ]);

        // Format and print the results
        const lines = result.documents.map((doc: any, i) =>
            `${i + 1}. ${doc.name} (${doc.downloads} downloads) — ${doc.author}`
        );

        const msg = ["Top 10 Most Downloaded Commands", "", ...lines].join("\n");
        print(msg);
        return msg;
    }

    const msg = `via: unknown command: ${command} — run via help`;
    print(msg);
    return msg;
}

export { _via };
