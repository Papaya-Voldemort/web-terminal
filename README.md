# web-terminal


> Web Terminal Cloud Out Now


## AI Disclaimer
Most comments and some helper functions were written by an AI tool. No autocomplete was used because it is annoying for me.
Anything made by AI other than comments is documented in the codebase.

## Commands

- `hello` — Prints `Hello World!`
- `help` — Displays all implemented commands and descriptions
- `ping` — Prints `Pong!`
- `echo <text>` — Echoes the provided text back
- `cd <dir>` — Changes the current working directory (`..`, relative, and `~` supported)
- `pwd` — Prints the current working directory
- `mkdir <dir>` — Creates a new directory
- `rmdir <dir>` — Removes a directory (use `sudo` for non-empty directories)
- `touch <file>` — Creates a new file
- `rm <file>` — Removes a file
- `cat <file>` — Prints a file’s content
- `ls [dir]` — Lists items in a directory
- `clear` — Clears the terminal output
- `mv <src> <dest>` — Moves a file
- `cp <src> <dest>` — Copies a file
- `write <file>` — Opens an editor for an existing file (`^S` save, `^X` save & exit, `^Q` quit)

## Future Plans
Add every command inside of `COMMANDS_100.md`.
Add Cloud Version

To install dependencies:

```bash
bun install
```

To run locally:

```bash
bun run dev
```

Then open http://localhost:3000 in the browser.

This project was created using `bun init` in bun v1.3.11. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
