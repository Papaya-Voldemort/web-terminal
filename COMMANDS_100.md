# Realistic Shell Commands Roadmap

A prioritized list of shell commands for a web-based terminal. Commands are organized by domain and realistic implementation complexity.

**Legend:** ✅ = Implemented | 🔜 = Planned (Or just an idea)

---

## 1. Core Navigation & File Operations (✅ Complete)

1. ✅ `pwd` - Print working directory
2. ✅ `cd` - Change directory (supports `.`, `..`, `~`, relative/absolute paths)
3. ✅ `ls` - List directory contents
4. ✅ `mkdir` - Create directory
5. ✅ `rmdir` - Remove empty directory
6. ✅ `touch` - Create or update file
7. ✅ `cp` - Copy file
8. ✅ `mv` - Move/rename file
9. ✅ `rm` - Delete file
10. ✅ `stat` - Show file metadata

---

## 2. File Viewing & Content

11. ✅ `cat` - Display file contents
12. 🔜 `head` - Show first N lines
13. 🔜 `tail` - Show last N lines
14. 🔜 `wc` - Count lines/words/bytes
15. 🔜 `sort` - Sort lines alphabetically
16. 🔜 `uniq` - Remove duplicate lines
17. 🔜 `cut` - Extract columns from text
18. 🔜 `rev` - Reverse lines
19. 🔜 `od` - Octal dump (show file in hex/octal)
20. 🔜 `strings` - Extract printable strings from file

---

## 3. Text Search & Pattern Matching

21. ✅ `grep` - Search for pattern in file
22. 🔜 `grep -i` - Case-insensitive grep
23. 🔜 `grep -c` - Count matches
24. 🔜 `grep -v` - Invert match (exclude matching lines)
25. 🔜 `grep -n` - Show line numbers
26. 🔜 `find` - Find files by name/pattern
27. 🔜 `find -type` - Find by file type
28. 🔜 `find -size` - Find by file size
29. 🔜 `locate` - Quick file search (cached)
30. 🔜 `tree` - Show directory tree structure

---

## 4. System & User Information

31. ✅ `who` - Current user
32. ✅ `date` - Current date/time
33. ✅ `echo` - Print text
34. ✅ `help` - Show all commands
35. ✅ `clear` - Clear terminal
36. 🔜 `whoami` - Current username (alias for who)
37. 🔜 `hostname` - System hostname
38. 🔜 `uname` - System info (OS, version)
39. 🔜 `id` - User ID and group info
40. 🔜 `uptime` - Terminal uptime

---

## 5. Text Processing & Transformation

41. 🔜 `sed` - Stream editor (substitute text)
42. 🔜 `sed 's/old/new/'` - Simple substitution
43. 🔜 `sed -i` - In-place editing
44. 🔜 `tr` - Translate/transform characters
45. 🔜 `tr '[:upper:]' '[:lower:]'` - Convert to lowercase
46. 🔜 `awk` - Pattern scanning and processing
47. 🔜 `awk '{print $1}'` - Extract first column
48. 🔜 `base64` - Encode to base64
49. 🔜 `base64 -d` - Decode base64
50. 🔜 `md5sum` - Calculate MD5 hash

---

## 6. Process & Job Management

51. 🔜 `ps` - List processes
52. 🔜 `ps aux` - Detailed process list
53. 🔜 `top` - Real-time process monitor
54. 🔜 `kill <pid>` - Terminate process
55. 🔜 `sleep <n>` - Sleep N seconds
56. 🔜 `jobs` - Show background jobs
57. 🔜 `bg` - Run job in background
58. 🔜 `fg` - Bring job to foreground
59. 🔜 `&` - Background operator
60. 🔜 `time` - Measure command runtime

---

## 7. Environment & Scripting

61. 🔜 `export` - Set environment variable
62. 🔜 `printenv` - Print environment variables
63. 🔜 `env` - Show all env vars
64. 🔜 `unset` - Remove environment variable
65. 🔜 `alias` - Create command alias
66. 🔜 `unalias` - Remove alias
67. ✅ `history` - Show command history
68. 🔜 `source` - Execute script file
69. 🔜 `eval` - Evaluate command
70. 🔜 `type` - Show command type/source

---

## 8. File Properties & Permissions

71. ✅ `chmod` - Change file permissions
72. ✅ `chown` - Change file owner
73. 🔜 `chgroup` - Change file group
74. 🔜 `umask` - Set default permissions
75. 🔜 `file` - Detect file type/mimetype
76. 🔜 `ln` - Create symbolic link
77. 🔜 `ln -s` - Soft link
78. 🔜 `readlink` - Show link target
79. 🔜 `du` - Disk usage per directory
80. 🔜 `df` - Disk space available

---

## 9. Text Editors & File Creation

81. ✅ `write` - Edit file (nano-like)
82. 🔜 `vi` - Modal editor mode
83. 🔜 `sed -i` - In-place file editing
84. 🔜 `printf` - Formatted print
85. 🔜 `paste` - Merge lines from files
86. 🔜 `diff` - Compare two files
87. 🔜 `patch` - Apply diff patches
88. 🔜 `expand` - Convert tabs to spaces
89. 🔜 `unexpand` - Convert spaces to tabs
90. 🔜 `fmt` - Format text to width

---

## 10. Advanced Tools & Utilities

91. ✅ `ping` - Network check (command available)
92. 🔜 `seq` - Generate sequence of numbers
93. 🔜 `yes` - Repeat string indefinitely
94. 🔜 `tee` - Redirect to file and stdout
95. 🔜 `xargs` - Build and execute commands
96. 🔜 `test` - Test conditions (file exists, etc)
97. 🔜 `cal` - Display calendar
98. 🔜 `bc` - Calculator (basic math)
99. 🔜 `which` - Find command location
100. ✅ `via` - Marketplace command system

---

## Quick Stats

**Implemented: 26/100** ✅
- Core file operations
- Basic viewing/editing
- Permission management
- User/system info
- VIA marketplace system

**High Priority (Next 20):**
1. `head`, `tail`, `wc` - Text viewing
2. `find`, `locate` - Search utilities
3. `sed`, `awk` - Text transformation
4. `sort`, `uniq` - Data sorting
5. `tree` - Directory visualization

**Medium Priority (20-50):**
- Process management (`ps`, `jobs`, `bg`, `fg`)
- Environment variables (`export`, `env`)
- Aliases and scripting
- Symbolic links
- Disk utilities

**Nice-to-Have (50+):**
- Advanced text editors
- Diff/patch utilities
- Hashing functions
- Math operations
- Calendar

---

## Implementation Tips

- **Pipe support**: Consider adding `|` operator for chaining commands
- **Flags**: Add common flags (`-l`, `-a`, `-h`, `-r`) to existing commands
- **Globbing**: Support `*` wildcard patterns
- **Redirection**: Add `>`, `>>`, `<` for file I/O
- **Testing**: Unit test each command before moving to next
