export const terminal = document.querySelector<HTMLDivElement>("#terminal")!;
export const input = document.querySelector<HTMLElement>("#input")!;
export const workingDir = document.querySelector<HTMLSpanElement>("#workingDir")!;

if (!terminal || !input || !workingDir) {
  throw new Error("Required DOM elements #terminal, #input, or #workingDir are missing");
}

let buffer: string[] = [];

export function print(text: string) {
  buffer.push(text);
  terminal.textContent = buffer.join("\n");
  terminal.scrollTop = terminal.scrollHeight;
}

export function clearTerminal() {
  buffer = [];
  terminal.textContent = "";
  terminal.scrollTop = terminal.scrollHeight;
}

export function updatePrompt(user: string, host: string, currentDir: string) {
  workingDir.textContent = `${user}@${host} ${currentDir} $ `;
}
