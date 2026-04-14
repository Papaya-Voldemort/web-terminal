export const terminal = document.querySelector<HTMLDivElement>("#terminal")!;
export const input = document.querySelector<HTMLElement>("#input")!;
export const workingDir = document.querySelector<HTMLSpanElement>("#workingDir")!;
export const htmlTag = document.querySelector<HTMLSpanElement>("html")!;

if (!terminal || !input || !workingDir) {
  throw new Error("Required DOM elements #terminal, #input, or #workingDir are missing");
}

let buffer: Array<string | HTMLElement> = [];

function parseLinksInText(text: string): (string | HTMLElement)[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts: (string | HTMLElement)[] = [];
  let lastIndex = 0;
  let match;

  const regex = new RegExp(urlRegex);
  while ((match = regex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Create a link element
    const link = document.createElement("a");
    link.href = match[0];
    link.textContent = match[0];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.color = "inherit";
    link.style.textDecoration = "underline";
    link.style.cursor = "pointer";
    parts.push(link);
    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function print(text: string) {
  buffer.push(text);
  
  // Clear terminal and rebuild with links
  terminal.innerHTML = "";
  buffer.forEach((item, idx) => {
    if (idx > 0) {
      terminal.appendChild(document.createTextNode("\n"));
    }
    if (typeof item === "string") {
      const parsed = parseLinksInText(item);
      parsed.forEach((part) => {
        if (typeof part === "string") {
          terminal.appendChild(document.createTextNode(part));
        } else {
          terminal.appendChild(part);
        }
      });
    } else {
      terminal.appendChild(item);
    }
  });
  
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

export function changeTheme(theme: string) {
  htmlTag.classList = theme;
}