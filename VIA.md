# V.I.A. – Verified Installation & Accountability

> These docs were written by **AI** reviewed by a **human**

## Overview

**V.I.A.** (Verified Installation & Accountability) is a decentralized marketplace for user-created functions and commands in the web-terminal. It allows users to create custom commands and share them with the community, or discover and install commands created by others.

Think of it as a package manager for terminal functions—but lighter weight, more transparent, and built on **user verification** rather than centralized curation.

**Key principle:** We don't guarantee safety—but we give you the tools to verify. Use `via view` before `via add` to inspect code before running it.

## Key Concepts

### What is a VIA Command?

A VIA command is a user-created function that:
- Is written in JavaScript/TypeScript
- Takes text input and returns text output
- Can be uploaded to the VIA marketplace
- Can be installed and used by other users in the terminal
- Is executed in a sandboxed JavaScript environment

### The VIA Agreement

Before using VIA, all users must accept the **V.I.A. Agreement**, which establishes:
- **No malicious code**: You won't create commands that harm systems or users
- **Third-party risk acknowledgment**: Commands from others may have vulnerabilities
- **User responsibility**: You're responsible for reviewing code before installation
- **No liability**: The VIA system operators aren't liable for damages from commands

Run `via agree` to accept the agreement.

## Key Workflow: Inspect Before Installing

**The golden rule:** Always run `via view` before `via add`.

```bash
# Step 1: View the source code
via view command-name

# Step 2: Review the code carefully
# Does it match the description?
# Is the code readable and reasonable?
# Any suspicious patterns?

# Step 3: Install only if you're confident
via add command-name
```

This simple workflow transforms VIA from "execute random code" to "execute code I've verified."

## Getting Started

### 1. Learn About VIA

Start with the interactive guide:

```bash
via docs
```

This shows you:
- How to get started
- How to create commands
- How to safely install commands  
- Best practices for command quality
- The security model

### 2. Accept the VIA Agreement

```bash
via agree
```

You need to do this once per browser/device before creating or installing commands.

### 3. Create Your First Command

Before creating a command, you need to:
- **Be logged in**: Use `login` to sign in with Google
- **Have a JavaScript file**: Create a file with your function code

Example: Create a file called `shout.ts` with:

```typescript
export default function shout(input: string) {
  return input.toUpperCase() + "!!!";
}
```

Then upload it:

```bash
via create shout ./shout.ts "Makes text SHOUTY"
```

### 4. Install Commands from the Marketplace

Once you've agreed to the terms, install any published command:

```bash
via view hello-world    # Always inspect first!
# Review the code...
via add hello-world     # Then install
```

Use it like a normal command:

```bash
hello-world "your input here"
```

## Usage Guide

### VIA Commands

#### `via help`
Shows the VIA command menu.

```bash
via help
```

#### `via docs`
Interactive guide through VIA documentation with key principles and best practices.

```bash
via docs
```

Shows:
- Getting started with VIA
- How to create commands
- How to safely install commands
- Best practices for command creation
- Security model explanation

#### `via agree`
Accepts the V.I.A. Agreement. Required before creating or installing commands.

```bash
via agree
```

#### `via view <name>`
Inspect the source code of a command before installing it. **Always use this before `via add`!**

**Parameters:**
- `<name>`: The name of the command to inspect

**Example:**
```bash
via view my-calculator
```

**Output:**
```
Name: my-calculator
Author: alice
Description: A simple calculator for basic operations

--- SOURCE CODE ---
export default function calculate(input) {
  const [a, b, op] = input.split(" ");
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  // ... truncated
(Showing first 30 lines of 45 total)
```

**Why this matters:**
- See exactly what code will run
- Verify it matches the description
- Check for suspicious patterns
- Make an informed trust decision

#### `via create <name> <file> [description]`
Uploads a file as a marketplace function.

**Parameters:**
- `<name>`: The command name (must be unique across the marketplace)
- `<file>`: Path to the JavaScript/TypeScript file
- `[description]`: Optional description of what the command does

**Example:**
```bash
via create my-calculator ./math.js "A simple calculator for basic operations"
```

**Requirements:**
- You must be logged in
- The file must exist
- You must have read permissions on the file
- The function should export a default function

#### `via add <name>`
Installs a command from the marketplace.

**Parameters:**
- `<name>`: The name of the command to install

**Example:**
```bash
via add my-calculator
```

**What happens:**
1. Retrieves the command from the marketplace
2. Shows the command metadata and first 15 lines of source code
3. Installs and registers the command
4. Saves it for future sessions

**Best practice workflow:**
```bash
via view my-calculator    # Review the source code
# ... inspect the code carefully ...
via add my-calculator     # Install after reviewing
```

After installation, the command is available for the rest of your session and will be automatically loaded on future visits.

## Creating Good VIA Commands

### Command Structure

**⭐ Recommended: Direct Function Export**

A **default-exported JavaScript function** that takes a string input and returns output (must be a string).

```javascript
// A simple VIA command
export default function myCommand(input: string): string {
  // Parse input
  const args = input.trim().split(" ");
  
  // Do something
  const result = args.join("-");
  
  // Return output (will be printed to terminal)
  return result;
}
```

**Why this works:**
- ✅ Simple and reliable
- ✅ No issues with method syntax
- ✅ Easy to test locally
- ✅ Clear parameter handling

#### ⚠️ Object Format (Not Recommended)

While object format with `run()` method is supported, it can have parsing issues with the type annotation stripper. **Use function format instead.**

```javascript
// ❌ Not recommended - may have issues
export default {
  name: "myCommand",
  run(input: string): string {
    // ...
  }
}
```

#### TypeScript is Fully Supported

Write in TypeScript with full type annotations - everything is automatically converted:

```typescript
export default function myCommand(input: string): string {
  const args = input.trim().split(" ");
  const result = args.join("-");
  return result;
}
```

**Automatic Processing:**
- ✅ `export default` statements - stripped
- ✅ Type annotations (`: string`, `: number`) - stripped
- ✅ Generic types (`<T>`, `Record<K, V>`) - stripped
- ✅ TypeScript casts (`as Type`) - stripped
- ✅ JSDoc comments - preserved

You can write pure TypeScript and it will work as plain JavaScript!

### Understanding Input Handling

VIA commands receive input as a **single string** and must **always return a string** (or undefined).

#### Input Flow

When a user runs a command:
```bash
uuid 5
```

Your function receives:
```typescript
function uuid(input: string): string {
  // input = "5"
  // ...
  return result; // Must return a string
}
```

#### Input Patterns

**1. Command with no arguments:**
```typescript
export default function simple(input: string): string {
  // input = "" (empty string)
  if (!input) return "No arguments provided";
  return `You said: ${input}`;
}
```

**2. Command with single argument:**
```typescript
export default function square(input: string): string {
  const num = parseInt(input.trim());
  if (isNaN(num)) return "Error: input must be a number";
  return String(num * num);
}
```

**3. Command with multiple arguments:**
```typescript
export default function add(input: string): string {
  const [a, b] = input.trim().split(" ");
  const numA = parseInt(a);
  const numB = parseInt(b);
  if (isNaN(numA) || isNaN(numB)) return "Error: both arguments must be numbers";
  return String(numA + numB);
}
```

**4. Command with variable arguments:**
```typescript
export default function greet(input: string): string {
  const names = input.trim().split(" ").filter(Boolean);
  if (names.length === 0) return "Usage: greet <name1> [name2] [name3]...";
  return "Hello " + names.join(", ") + "!";
}
```

**5. Generate multiple results (return array as newline-separated string):**
```typescript
export default function uuid(input: string): string {
  const count = Math.min(parseInt(input) || 1, 50);
  
  // ⚠️ IMPORTANT: Use explicit loop, NOT Array.from
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(generateUUID());
  }
  
  return results.join("\n"); // Join with newline to display each on separate line
}
```

**Why not Array.from?**
While `Array.from({ length: count }, () => generateUUID())` should work, explicit loops are more reliable:
- Simpler to understand
- Easier to debug
- No edge cases with callback arguments
- Works consistently across all environments

#### Return Values

Always return a **string**. Examples:
- ✅ `return "Hello"`
- ✅ `return results.join("\n")`
- ✅ `return JSON.stringify(data)`
- ✅ `return String(42)`
- ❌ `return 42` (number, will be stringified)
- ❌ Return undefined for nothing (better to return empty string or a message)

### Best Practices for VIA Commands

#### 1. **Parse Input Carefully**

VIA commands receive input as a single string. Parse it explicitly:

```typescript
export default function greeter(input: string): string {
  const [firstname = "stranger", lastname = ""] = input.trim().split(" ");
  const name = lastname ? `${firstname} ${lastname}` : firstname;
  return `Hello, ${name}!`;
}

// Usage:
// greeter "Alice"           → "Hello, Alice!"
// greeter "Alice Smith"     → "Hello, Alice Smith!"
// greeter ""               → "Hello, stranger!"
```

#### 2. **Handle Errors Gracefully**

Always validate input and provide helpful error messages:

```typescript
export default function divider(input: string): string {
  const [aStr = "", bStr = ""] = input.trim().split(" ");
  
  if (!aStr || !bStr) {
    return "Error: divisor and dividend required. Usage: divider <a> <b>";
  }
  
  const a = parseFloat(aStr);
  const b = parseFloat(bStr);
  
  if (isNaN(a) || isNaN(b)) {
    return "Error: both arguments must be numbers";
  }
  
  if (b === 0) {
    return "Error: cannot divide by zero";
  }
  
  return String(a / b);
}
```

#### 3. **Keep Output Text-Based**

The terminal is text-only. Return strings or JSON, not complex objects:

```typescript
// Good ✅
export default function getData(input: string): string {
  return JSON.stringify({ name: "Alice", age: 30 }, null, 2);
}

// Also good ✅
export default function getData(input: string): string {
  return "Name: Alice\nAge: 30\nLocation: US";
}

// Avoid ❌
export default function getData(input: string): HTMLElement {
  // HTML won't render in the terminal
}
```

#### 4. **Provide Clear Help Text**

Users can't run `/help` on your command. Build help into it:

```typescript
export default function colors(input: string): string {
  const command = input.trim() || "list";
  
  if (command === "help") {
    return [
      "colors — color utility",
      "  colors list   — show available colors",
      "  colors random — get a random color",
      "  colors HTML   — describe HTML color (e.g., colors FF0000)",
    ].join("\n");
  }
  
  if (command === "list") {
    return ["red", "green", "blue", "yellow"].join("\n");
  }
  
  if (command === "random") {
    const colors = ["red", "green", "blue", "yellow"];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // Parse hex color like "FF0000"
  if (command.match(/^[0-9A-F]{6}$/i)) {
    return `Color #${command} is a shade of RGB(${hexToRgb(command)})`;
  }
  
  return `Unknown command: ${command}\nRun 'colors help' for usage`;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `${r}, ${g}, ${b}`;
}
```

#### 5. **Document Your Command**

Always include a `description` when creating your command:

```bash
via create my-command ./my-command.js "My command does X, Y, and Z. Use: my-command <arg>"
```

#### 6. **Handle Edge Cases**

Consider what happens with unusual input:

```typescript
export default function mapper(input: string): string {
  const args = input.trim().split(" ");
  
  // Handle no input
  if (args.length === 0 || (args.length === 1 && args[0] === "")) {
    return "Usage: mapper <numbers>...";
  }
  
  // Handle non-numbers
  const numbers = args
    .map(x => parseFloat(x))
    .filter(x => !isNaN(x));
  
  if (numbers.length === 0) {
    return "Error: no valid numbers provided";
  }
  
  return numbers.map(x => x * 2).join(" ");
}
```

#### 7. **Use Consistent Output Format**

For multi-line output, use newlines consistently:

```typescript
export default function listItems(input: string): string {
  const items = input.trim().split(",").map(x => x.trim());
  
  // Good: one item per line
  return items
    .map((item, i) => `${i + 1}. ${item}`)
    .join("\n");
  
  // Output:
  // 1. apple
  // 2. banana
  // 3. orange
}
```

#### 8. **Be Explicit About Dependencies**

VIA commands run in isolation and can't import external packages. You're limited to:
- Built-in JavaScript/TypeScript features
- The global `globalThis` object (limited)

Keep commands self-contained:

```typescript
// Good ✅ - uses only built-in Math
export default function calculate(input: string): string {
  return String(Math.sqrt(parseFloat(input)));
}

// Avoid ❌ - external dependencies won't be available
import { lodash } from "lodash"; // Won't work in VIA context
```

#### 9. **Pre-Test Your Command**

Before uploading, test it locally. Create a simple test file:

```typescript
// my-command.ts
export default function myCommand(input: string): string {
  return input.toUpperCase();
}

// Test it
console.log(myCommand("hello")); // Should print "HELLO"
```

#### 10. **Version Your Commands with Clear Names**

If you improve a command, use semantic naming:

```bash
# First version
via create my-tool-v1 ./my-tool.ts "My tool version 1"

# Improved version (create a new command, don't replace)
via create my-tool-v2 ./my-tool.ts "My tool version 2 - improved"
```

## Real-World Example: Installing a Command Safely

Here's what a real installation workflow looks like:

```bash
$ via view uppercase
Name: uppercase
Author: alice
Description: Convert text to uppercase

--- SOURCE CODE ---
export default function uppercase(input: string): string {
  return input.toUpperCase();
}

(Showing first 30 lines of 5 total)

$ via add uppercase
⚠️  You are installing a third-party command.

Name: uppercase
Author: alice
Description: Convert text to uppercase

--- SOURCE CODE (first 15 lines) ---
export default function uppercase(input: string): string {
  return input.toUpperCase();
}

✓ Installing "uppercase"...
✓ Added marketplace command "uppercase"

$ uppercase "hello world"
HELLO WORLD
```

**What made this safe:**
1. ✅ Code was viewable before installation
2. ✅ Code was simple and readable
3. ✅ Code did exactly what description said
4. ✅ No suspicious patterns
5. ✅ Author was known

## Examples

### Example 1: Text Transformer (Function Format)

```typescript
// uppercase.ts
export default function uppercase(input: string): string {
  return input.toUpperCase();
}

// Usage:
// uppercase "hello world"  → "HELLO WORLD"
```

### Example 2: UUID Generator (Function Format with Input)

```typescript
// uuid.ts
export default function uuid(input: string): string {
  function uuidv4(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const arg = input.trim();
  
  if (arg === "help") {
    return [
      "uuid — generate random UUIDs (v4)",
      "Usage:",
      "  uuid        — generate one UUID",
      "  uuid <n>    — generate n UUIDs (max 50)",
      "  uuid help   — show this message"
    ].join("\n");
  }

  if (!arg) return uuidv4(); // No input = generate one UUID

  const count = parseInt(arg);
  if (isNaN(count) || count <= 0) {
    return "Error: input must be a positive number";
  }
  if (count > 50) {
    return "Error: max 50 UUIDs at once";
  }

  // Generate multiple UUIDs and join with newline
  return Array.from({ length: count }, () => uuidv4()).join("\n");
}

// Usage:
// uuid              → "550e8400-e29b-41d4-a716-446655440000"
// uuid 3            → (3 UUIDs, one per line)
// uuid 5            → (5 UUIDs, one per line)
// uuid help         → (shows help message)
```

**Key points in this example:**
1. Input is handled: `uuid`, `uuid 5`, `uuid help`
2. Multiple results are returned as newline-separated string
3. Uses arrow function in `Array.from`: `() => uuidv4()`
4. **Always returns a string**, never undefined
5. Includes helpful error messages

### Example 3: UUID Generator (Object Format)

```typescript
// uuid-simple.ts
export default {
  name: "uuid",
  description: "Generate a random UUID (v4)",
  
  run() {
    function uuidv4(): string {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    return uuidv4();
  }
}

// Usage:
// uuid  → "550e8400-e29b-41d4-a716-446655440000"
```

### Example 4: Data Formatter

```typescript
// csv-to-json.ts
export default function csvToJson(input: string): string {
  const lines = input.trim().split("\n");
  if (lines.length < 2) return "Error: at least 2 lines required (header + data)";
  
  const headers = lines[0].split(",").map(h => h.trim());
  const data = lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
  
  return JSON.stringify(data, null, 2);
}
```

### Example 5: Utility with Subcommands

```typescript
// wordgames.ts
export default function wordgames(input: string): string {
  const [cmd = "help", ...args] = input.trim().split(" ");
  
  switch (cmd) {
    case "reverse":
      return args.join(" ").split("").reverse().join("");
    
    case "palindrome":
      const word = args.join(" ");
      const reversed = word.split("").reverse().join("");
      return word === reversed ? "Yes, it's a palindrome!" : "No, not a palindrome.";
    
    case "count":
      return `${args.join(" ").length} characters`;
    
    case "help":
      return [
        "wordgames — word utilities",
        "  wordgames reverse <text>    — reverse the text",
        "  wordgames palindrome <word> — check if palindrome",
        "  wordgames count <text>      — count characters",
      ].join("\n");
    
    default:
      return `Unknown command: ${cmd}`;
  }
}
```

## Security & Trust Model

### Publishing Your Command

When you upload a command via `via create`, it goes to the marketplace. Other users can then install it.

**Important**: Be transparent about what your command does. Include a detailed description.

### Installing Commands Safely

The VIA marketplace operates on **transparency and user responsibility**, not centralized curation.

When you install a command:
1. Use `via view <name>` to inspect the source code
2. Read the description carefully
3. Verify the code matches what's described
4. Check for any suspicious patterns
5. Only install if you trust it

**Example safe workflow:**
```bash
via view hello-world
# Review the source code...
# Does it look legit? Only 10 lines?
# Code matches description? Good.
vi add hello-world
```

**Red flags:**
- Code is much larger than description suggests
- Code does something different from description
- Suspicious patterns or obfuscated code
- Unknown author with no context

### How `via view` Enables Trust

The `via view` command is the cornerstone of VIA's trust model. It lets you:

- **Inspect before executing**: See exactly what will run
- **Verify transparency**: Check if code matches the description
- **Make informed decisions**: You control what runs on your system
- **Build reputation**: Quality creators upload readable, documented code

This is how real ecosystems work—not by guaranteeing safety, but by giving users visibility.

### Sandboxing

VIA commands run in a restricted JavaScript context. They **cannot**:
- Access the file system directly
- Make network requests (without explicit permission)
- Modify the terminal UI directly
- Access browser APIs like `localStorage`

However, they **can**:
- Process text input
- Return text output
- Use JavaScript built-ins (Math, Array, String, etc.)

### Verified Installation & Accountability

**V.I.A.** combines two principles:

1. **Verified Installation** - You can inspect code before running it
2. **Accountability** - Authors' code is visible and traceable to prevent malicious uploads

It's not a guarantee of safety, but it puts users in control and makes accountability possible.

## Troubleshooting

### "VIA agreement not accepted"

Run `via agree` to accept the agreement before using VIA.

### "Please log in to make custom commands"

You need to sign in with Google before creating commands. Run `login` first.

### "No such file" error

Make sure the file path is correct and relative to your current directory. Use `ls` to verify files exist.

### "Permission denied"

Check file permissions. You need read access to the file you're uploading.

```bash
stat your-file.js
chmod u+r your-file.js
```

### Command not found after `via add`

The command may not have downloaded successfully. Try again:

```bash
via add command-name
```

### Command behaves unexpectedly

Test it locally first. VIA commands might behave differently due to their sandboxed environment.

### "Command returns nothing" or "No output"

**Common causes:**

1. **Function is returning undefined or null instead of a string**
   - ❌ `return;` or `return undefined;`
   - ✅ `return "";` or `return "message";`

2. **Function is returning a non-string (like number)**
   - ❌ `return count` (if count is a number)
   - ✅ `return String(count)` or `return count.toString()`

3. **Input parsing is failing silently**
   ```typescript
   // Debug by returning the input you received:
   export default function myCommand(input: string): string {
     return `DEBUG: input="${input}" (length=${input.length})`; // See what input you got
   }
   ```

4. **Using Array.from instead of explicit loop** ⚠️
   - Array.from can be unpredictable in certain JavaScript execution contexts
   ```typescript
   // ❌ Avoid - can fail silently
   Array.from({ length: count }, () => generateItem()).join("\n");
   
   // ✅ Use explicit loop instead
   const items = [];
   for (let i = 0; i < count; i++) {
     items.push(generateItem());
   }
   return items.join("\n");
   ```

5. **Missing `.join("\n")` for multiple results**
   ```typescript
   // ✅ Correct - array of strings joined with newline
   return [item1, item2, item3].join("\n");
   
   // ❌ Wrong - returns array, gets JSON stringified
   return [item1, item2, item3]; // Becomes "[\"item1\",...]"
   ```

### Command works in `via view` but fails to install

The code you see in `via view` is the truncated display. Use `via view <name> --full` to see the entire source. There might be errors further down in the code that aren't visible in the preview.

### "Error in command: ..." message when running command

Your command threw an exception. The error message should tell you what went wrong. Check:
1. Are you accessing properties that don't exist?
2. Are you using methods on undefined/null?
3. Is there a syntax error?

Add better error handling:
```typescript
export default function safe(input: string): string {
  try {
    // Your code here
    return result;
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
```

## Advanced Topics

### Preserving State (Limited)

VIA commands can't access `localStorage` directly, but they can return structured data that gets printed:

```typescript
// Not persistent, but useful for debugging:
export default function counter(input: string): string {
  let count = parseInt(input) || 0;
  return `Count: ${count + 1}`;
}

// Usage:
// counter 0        → "Count: 1"
// counter 10       → "Count: 11"
// (User must manually track state)
```

### Complex Parsing

For commands that process structured input, use JSON when possible:

```typescript
export default function process(input: string): string {
  try {
    const data = JSON.parse(input);
    // Process data
    return JSON.stringify({ result: "ok", data });
  } catch {
    return "Error: invalid JSON input";
  }
}

// Usage:
// process '{"name": "Alice", "age": 30}'
```

### What Makes a Trustworthy Command

When reviewing commands with `via view`, look for signs of quality:

**Good indicators:**
- ✅ Code is readable and commented
- ✅ Function does exactly what description says
- ✅ Reasonable code length (not suspiciously large)
- ✅ Clear variable names
- ✅ Proper error handling
- ✅ No obfuscation or minification

**Red flags:**
- ❌ Code is obfuscated or minified
- ❌ Does something different from description
- ❌ Suspiciously large for the task
- ❌ Makes unexpected network calls or API bypasses
- ❌ Tries to access system internals
- ❌ Anonymous or untrustworthy author

## Contributing to VIA

### Share Your Commands

Once you've created a great command, share it! Tell others about it so they can:
1. Install from the marketplace
2. Learn from your code
3. Request features or improvements

### Improve Existing Commands

If you see a popular command with room for improvement:
1. Create an improved version
2. Give it a distinct name (e.g., `better-name-v2`)
3. Clearly document the improvements in the description

### Community Standards

VIA functions work best when:
- **Help text is clear**: Users should understand usage instantly
- **Input parsing is predictable**: Consistent argument ordering
- **Output format is obvious**: Newlines and structure match user expectations
- **Error messages are helpful**: Tell users what went wrong and how to fix it
- **Code is readable**: Others can learn from and improve your work
- **Description is honest**: Accurately describes what the command does

## Beta Features: File I/O & OS Interaction

### Overview

VIA now includes beta support for commands to safely interact with files in your home directory. These APIs are **experimental** and may change.

### Using Beta APIs

Beta APIs are passed as the second parameter to your function. Your function receives: `(input, viaApi)`

```typescript
export default function myCommand(input, viaApi) {
  // input: string from user
  // viaApi: object with readFile, writeFile, listDir methods
  const files = viaApi.listDir();
  return files.join("\n");
}
```

### Beta API Methods

#### viaApi.readFile(filepath)

Read a file from the terminal's home directory:

```typescript
export default function readCommand(input, viaApi) {
  try {
    const content = viaApi.readFile(input); // filepath relative to home
    return content;
  } catch (error) {
    return `Error reading file: ${error}`;
  }
}
```

**Usage:**
```bash
read myfile.txt
```

#### viaApi.writeFile(filepath, content)

Write content to a file in the home directory:

```typescript
export default function writeCommand(input, viaApi) {
  const [filename, ...contentParts] = input.split("|");
  const content = contentParts.join("|").trim();
  
  try {
    const bytes = viaApi.writeFile(filename.trim(), content);
    return `Wrote ${bytes} bytes to ${filename.trim()}`;
  } catch (error) {
    return `Error writing file: ${error}`;
  }
}
```

**Usage:**
```bash
write myfile.txt | Hello, World!
```

#### viaApi.listDir(dirpath)

List files and directories in a directory:

```typescript
export default function lsCommand(input, viaApi) {
  const dirpath = input.trim() || ".";
  
  try {
    const files = viaApi.listDir(dirpath);
    return files.join("\n");
  } catch (error) {
    return `Error listing directory: ${error}`;
  }
}
```

**Usage:**
```bash
ls                  # List current directory
ls documents        # List documents directory
```

### Security Model

Beta APIs follow these security principles:

1. **Sandboxed Paths** - Commands can only access files within your home directory
2. **Path Validation** - Prevents directory traversal attacks (e.g., `../../../etc/passwd`)
3. **Permission Checks** - Respects file permissions
4. **Read-Only by Default** - Users see what each command does with `via view` before installation
5. **Error Transparency** - Failed operations return clear error messages

### Example: File Backup Command

```typescript
export default function backupCommand(input, viaApi) {
  const filename = input.trim();
  if (!filename) return "Usage: backup <filename>";
  
  try {
    // Read the original file
    const content = viaApi.readFile(filename);
    
    // Create a backup with .bak extension
    const backupName = filename + ".bak";
    viaApi.writeFile(backupName, content);
    
    return `Backed up ${filename} to ${backupName}`;
  } catch (error) {
    return `Backup failed: ${error}`;
  }
}
```

### Creating Commands with Beta APIs

When uploading a command that uses viaApi:

```bash
via create mycommand ./mycommand.ts "Description of what it does"
```

No special flag is needed - just use viaApi in your function!

### Enabling Beta APIs

### Status

- 🟢 **Available Now** - File I/O APIs (readFile, writeFile, listDir)
- 🟡 **In Development** - Execution APIs (run system commands)
- 🟡 **Planned** - Network APIs (make HTTP requests)
- 🟡 **Planned** - Database APIs (simple storage)

### Current Limitations

- Commands are **synchronous only** (no async/await yet)
- Can only access files in home directory
- No network access
- No system command execution
- Commands can't persist state across runs (only via file I/O)

### Stability & Support

Beta APIs **are now available** but may change in future versions:
- Function signatures may be refined
- Error handling may improve
- APIs may be added or removed
- Performance may be optimized

If you create commands using beta APIs, be prepared to update them when they change. This is expected during beta!

### Troubleshooting Beta APIs

**"Permission denied"**
- Check that the file exists and you have read/write permission
- Try reading/writing to the current directory first

**"File not found"**
- Use `ls` to verify the file exists
- Remember paths are relative to your home directory
- Use `./filename` for files in current directory

**"Access denied: path outside home directory"**
- You can only access files in your home directory
- Relative paths like `../../etc` are blocked
- Use relative paths from your current location instead

### Future Enhancements

Planned improvements to VIA APIs:
- Async/await support
- System command execution (`viaApi.exec()`)
- HTTP requests (`viaApi.fetch()`)
- Simple database (`viaApi.db`)
- File deletion (`viaApi.deleteFile()`)
- Directory creation (`viaApi.makeDir()`)


## Summary

VIA enables the web-terminal to grow beyond built-in commands. Follow these principles:

1. **Verify before installing** - Always use `via view` before `via add`
2. **Create simple, focused commands** that do one thing well
3. **Document clearly** so users understand without asking
4. **Handle errors gracefully** with helpful messages
5. **Test thoroughly** before uploading
6. **Be transparent** about what your command does
7. **Respect users** by writing clean, readable code

Happy command creation! 🚀

---

## Quick Reference

### Essential Commands

```bash
via help       # Show all VIA commands
via docs       # Interactive tutorial
via agree      # Accept terms (required once)
```

### Installing Commands Safely

```bash
via view <name>    # Inspect before installing
via add <name>     # Install after reviewing
```

### Creating Commands

```bash
via create <name> <file> [description]   # Upload a new command
```

### Workflow

```bash
# 1. Review the documentation
via docs

# 2. Accept the agreement (once)
via agree

# 3. Before installing ANY command:
via view command-name
# Review the code carefully, then:
via add command-name

# 4. Create your own commands
# Write code in a file, then:
via create my-command ./file.ts "Description"
```
