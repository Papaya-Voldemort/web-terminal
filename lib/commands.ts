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
  if (getDirectory(fsPath) !== null) {
    setCurrentDir(resolved);
    updatePrompt(USER, HOST, resolved);
    const msg = `Changed directory to ${resolved}`;
    print(msg);
    return msg;
  }
  const msg = `cd: no such file or directory: ${dir}`;
  print(msg);
  return msg;
}

function _pwd() {
  print(currentDir);
  return currentDir;
}

function _mkdir(dir: string) {
  if (!dir) {
    print("mkdir: missing operand");
    return "mkdir: missing operand";
  }
  const resolved = resolvePath(currentDir, dir);
  const fsPath = toFsPath(resolved);
  makeDirectory(fsPath);
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
  const dirChildren = getDirectory(fsPath);
  if (dirChildren === null) {
    const msg = `rmdir: no such directory: ${dir}`;
    print(msg);
    return msg;
  }
  if (dirChildren.length > 0 && !sudo) {
    const msg = `rmdir: directory not empty: ${dir} (use sudo)`;
    print(msg);
    return msg;
  }
  removeDirectory(fsPath);
  const msg = `Removed ${dir}!`;
  print(msg);
  return msg;
}

function _touch(name: string) {
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
  makeFile(fsPath, "");
  const msg = `Created ${name} at ${currentDir}.`;
  print(msg);
  return msg;
}

function _rm(path: string) {
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
  removeFile(fsPath);
  const msg = `Removed ${path}!`;
  print(msg);
  return msg;
}

function _cat(path: string) {
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
  const msg = file.content;
  print(msg);
  return msg;
}

function _ls(path: string) {
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

function _mv(origin: string, target: string) {
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
  const targetResolved = resolvePath(currentDir, target);
  const targetFsPath = toFsPath(targetResolved);
  const targetFile = getFile(targetFsPath);
  if (targetFile !== null) {
    const msg = `mv: ${target} already exists`;
    print(msg);
    return msg;
  }
  makeFile(targetFsPath, originFile.content);
  removeFile(originFsPath);
  const msg = `Moved ${origin} to ${target}`;
  print(msg);
  return msg;
}

function _cp(origin: string, target: string) {
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
  const targetResolved = resolvePath(currentDir, target);
  const targetFsPath = toFsPath(targetResolved);
  const targetFile = getFile(targetFsPath);
  if (targetFile !== null) {
    const msg = `cp: ${target} already exists`;
    print(msg);
    return msg;
  }
  makeFile(targetFsPath, originFile.content);
  const msg = `Copied ${origin} to ${target}`;
  print(msg);
  return msg;
}

function _write(path: string) {
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
  openEditor(fsPath, path, file.content);
  return "";
}

function _who() {
  const output = USER_EMAIL ? `${USER} <${USER_EMAIL}>` : USER;
  print(output);
  return output;
}

function _date() {
  const msg = new Date().toLocaleDateString();
  print(msg);
  return msg;
}

function _history() {
  print(JSON.stringify(history));
  return JSON.stringify(history);
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
};
