import { commands, loadPersistedCommands } from "./lib/commands";
import { print, updatePrompt, input } from "./lib/dom";
import { loadFilesystem } from "./lib/filesystem";
import {
  HOST,
  USER,
  currentDir,
  history,
  historyIndex,
  pushHistory,
  resetHistoryIndex,
  setHistoryIndex,
  setUser,
  setUserEmail,
  setCurrentUser,
} from "./lib/state";
import { execute } from "./lib/kernal"; 

updatePrompt(USER, HOST, currentDir);

input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp") {
    e.preventDefault();
    const nextIndex = historyIndex === -1 ? history.length - 1 : historyIndex - 1;
    setHistoryIndex(Math.max(0, nextIndex));
    input.innerText = history[historyIndex] ?? "";
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    setHistoryIndex(Math.min(history.length - 1, historyIndex + 1));
    input.innerText = historyIndex === history.length - 1 ? "" : history[historyIndex] ?? "";
  }

  if (e.key !== "Enter") return;
  e.preventDefault();

  const value = input.innerText.trim();
  if (!value) return;

  pushHistory(value);
  resetHistoryIndex();

  // Print the command prompt with the command before executing
  print(`${USER}@${HOST} ${currentDir} $ ${value}`);

  execute(value, print);
  input.innerText = "";
});

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
  const user = await loadFilesystem();
  setUser(user.name);
  setUserEmail(user.email);
  setCurrentUser(user.email ? { name: user.name, email: user.email } : null);
  await loadPersistedCommands();
  updatePrompt(USER, HOST, currentDir);
  print("Welcome! Type 'help' for commands.");
  print("Judges run 'judge' for a judging menu to help me improve!");
})();

// TODO: Implement API in kernal so you can actually see commands again lol