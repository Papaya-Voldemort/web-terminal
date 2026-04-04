import { terminal, input, print } from "./dom";
import { writeFile } from "./filesystem";

export function openEditor(fsPath: string, displayPath: string, initialContent: string) {
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

  const textarea = editor.querySelector<HTMLTextAreaElement>('#writeArea')!;
  textarea.value = initialContent;
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = initialContent.length;

  function showSavedIndicator() {
    const header = editor.querySelector<HTMLDivElement>('#writeHeader')!;
    header.textContent = '✓ Saved!';
    setTimeout(() => {
      header.innerHTML = `write — ${displayPath} &nbsp;|&nbsp; ^S Save &nbsp; ^X Save &amp; Exit &nbsp; ^Q Quit without saving`;
    }, 1000);
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
    if (e.key === "Tab") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + "\t" + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      return;
    }

    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      save();
    }
    if (e.ctrlKey && e.key === "x") {
      e.preventDefault();
      save();
      exit();
    }
    if (e.ctrlKey && e.key === "q") {
      e.preventDefault();
      exit();
    }
  });
}
