import { commands, loadPersistedCommands } from "../lib/commands.ts";
import { print, updatePrompt, input } from "../lib/dom.ts";
import { loadFilesystem } from "../lib/filesystem.ts";
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
} from "../lib/state.ts";
import { execute } from "../lib/kernal.ts"; 

updatePrompt(USER, HOST, currentDir);

let isExecuting = false;

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
  if (!value || isExecuting) return;

  pushHistory(value);
  resetHistoryIndex();

  // Print the command prompt with the command before executing
  print(`${USER}@${HOST} ${currentDir} $ ${value}`);

  isExecuting = true;
  input.style.opacity = "0.5";
  input.style.pointerEvents = "none";

  execute(value, (output) => {
    print(output);
    isExecuting = false;
    input.style.opacity = "1";
    input.style.pointerEvents = "auto";
    input.focus();
  });
  input.innerText = "";
});

document.addEventListener("click", () => {
  if (document.getElementById("writeEditor")) return;
  input.focus();
  const range = document.createRange();
  const sel = window.getSelection();
   if (!sel) return;
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