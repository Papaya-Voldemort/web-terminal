export const HOST = "nest";

export let USER = "hacker";
export let USER_EMAIL = "";
export let currentUser: { name: string; email: string } | null = null;
export let currentDir = "~"; // "~" = filesystem root

export let history: string[] = [];
export let historyIndex = -1;

export function setUser(name: string) {
  USER = name;
}

export function setUserEmail(email: string) {
  USER_EMAIL = email;
}

export function setCurrentUser(user: { name: string; email: string } | null) {
  currentUser = user;
}

export function setCurrentDir(dir: string) {
  currentDir = dir;
}

export function pushHistory(entry: string) {
  history.push(entry);
}

export function resetHistoryIndex() {
  historyIndex = -1;
}

export function setHistoryIndex(index: number) {
  historyIndex = index;
}

export function isSignedIn() {
  return currentUser !== null;
}