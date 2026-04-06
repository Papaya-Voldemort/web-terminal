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
- `login` — Sign in with Google
- `logout` — Sign out of the current session
- `who` — Prints the current logged-in user
- `date` — Prints the current local date
- `history` — Shows command history
- `grep <search> <file>` — Searches file contents for a string

## File overview
- `app.ts` — boots the terminal UI, handles command input, history navigation, prompt updates, and loads the filesystem.
- `server.ts` — Bun development server that serves `index.html`.
- `index.html` — HTML shell for the terminal page and module imports.
- `lib/appwrite.ts` — Appwrite client configuration and database/collection IDs.
- `lib/auth.ts` — Google login and logout helpers for the web terminal.
- `lib/commands.ts` — command implementations, command descriptions, and the command dispatch map.
- `lib/dom.ts` — terminal DOM helpers for printing, clearing, and updating the prompt.
- `lib/editor.ts` — inline text editor UI used by the `write` command.
- `lib/filesystem.ts` — in-memory filesystem model with path resolution, persistence, directory/file creation, metadata, and permissions support.
- `lib/state.ts` — shared app state for current user, email, current directory, and history.

## New filesystem functions
- `touchMetadata(node, updates)` — updates `modifiedAt` and/or `accessedAt` timestamps on filesystem nodes.
- `applyMetadata(base, metadata)` — merges provided metadata into default file/directory metadata.
- `getDirectoryNode(path)` — returns the actual directory node at a path, used for permission checks and directory-specific operations.
- `checkPermission(node, user, mode)` — checks owner/group/others permissions for `r`, `w`, or `x` access.
- `makeDirectory(path, owner, metadata)` — now accepts optional metadata so directories can be created with custom permission settings.

## Future Plans
Add every command inside of `COMMANDS_100.md`.

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
