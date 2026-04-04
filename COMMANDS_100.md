# 100 Commands to Build for a Full Shell

This document enumerates 100 commands with purpose, example, and code snippet ideas (not full implementations). Use this as a roadmap to evolve your terminal into a mini OS shell.

---

## 1. Core navigation

1. `pwd`: print current directory
   - desc: shows working directory
   - example: `pwd`
   - snippet: `print(state.cwd);`

2. `cd`: change directory
   - desc: update cwd if path exists
   - example: `cd /home/user`
   - snippet: `state.cwd = normalizePath(arg);`

3. `ls`: list files
   - desc: list directory entries
   - example: `ls`, `ls -l`
   - snippet: `const files = fs.readDir(state.cwd); print(files.join(" "));`

4. `mkdir`: make directory
   - desc: create folder in virtual fs
   - example: `mkdir projects`
   - snippet: `fs.mkdir(join(state.cwd, arg));`

5. `rmdir`: remove directory
   - desc: delete empty directory
   - example: `rmdir temp`
   - snippet: `fs.rmdir(join(state.cwd, arg));`

6. `touch`: create empty file
   - desc: create or update file timestamp
   - example: `touch note.txt`
   - snippet: `fs.writeFile(path, "", { flag: "a" });`

7. `cp`: copy file
   - desc: duplicate path
   - example: `cp README.md docs/README.md`
   - snippet: `fs.writeFile(dest, fs.readFile(src));`

8. `mv`: move/rename file
   - desc: rename entry
   - example: `mv a.txt b.txt`
   - snippet: `fs.rename(src, dest);`

9. `rm`: remove file
   - desc: delete file
   - example: `rm old.log`
   - snippet: `fs.unlink(path);`

10. `stat`: file metadata
    - desc: show perms, size, mtime
    - example: `stat script.sh`
    - snippet: `const m = fs.stat(path); print(JSON.stringify(m));`

---

## 2. Info and utilities

11. `echo`
   - desc: print text
   - example: `echo hello`
   - snippet: `print(arg);`

12. `help` (your help)
   - desc: list commands/descriptions
   - example: `help`
   - snippet: `Object.entries(commandDescriptions).forEach(...);`

13. `clear`
   - desc: clear terminal output
   - example: `clear`
   - snippet: `buffer = []; terminal.textContent = "";`

14. `date`
   - desc: show current datetime
   - example: `date`
   - snippet: `print(new Date().toLocaleString());`

15. `whoami`
   - desc: current user name
   - example: `whoami`
   - snippet: `print(state.user.name);`

16. `hostname`
   - desc: system host name
   - example: `hostname`
   - snippet: `print(state.env.HOSTNAME || "web-shell");`

17. `uname`
   - desc: OS type
   - example: `uname -a`
   - snippet: `print("web-shell 1.0");`

18. `uptime`
   - desc: how long the shell has run
   - example: `uptime`
   - snippet: `print(Date.now()-start);`

19. `who`
   - desc: logged-in users
   - example: `who`
   - snippet: `print(state.users.join("\n"));`

20. `id`
   - desc: user id and groups
   - example: `id`
   - snippet: `print(JSON.stringify(state.user));`

---

## 3. Text processing

21. `cat`
   - desc: show file
   - example: `cat notes.txt`
   - snippet: `print(fs.readFile(path));`

22. `head`
   - desc: first 10 lines
   - example: `head log.txt`
   - snippet: `lines.slice(0,10).join("\n");`

23. `tail`
   - desc: last 10 lines
   - example: `tail log.txt`
   - snippet: `lines.slice(-10).join("\n");`

24. `grep`
   - desc: filter lines by regex
   - example: `grep error log.txt`
   - snippet: `lines.filter(l=>l.includes(query));`

25. `sort`
   - desc: sort lines
   - example: `sort names.txt`
   - snippet: `lines.sort();`

26. `uniq`
   - desc: dedupe adjacent lines
   - example: `uniq items.txt`
   - snippet: `...`

27. `wc`
   - desc: count lines, words, bytes
   - example: `wc README.md`
   - snippet: `words.length`, `lines.length`

28. `cut`
   - desc: select columns
   - example: `cut -d "," -f2 data.csv`
   - snippet: `line.split(sep)[n]`

29. `tr`
   - desc: translate characters
   - example: `tr '[:lower:]' '[:upper:]'`
   - snippet: `str.replace...`

30. `wc -l`
   - desc: lines count shortcut
   - example: `wc -l data.txt`
   - snippet: `lines.length`

---

## 4. Process and runtime

31. `ps`
   - desc: list processes
   - example: `ps`
   - snippet: `state.processes` array

32. `top`
   - desc: live process stats
   - example: `top`
   - snippet: `print(processInfo)`

33. `kill`
   - desc: stop process
   - example: `kill 123`
   - snippet: `state.processes.remove(pid)`

34. `bg`
   - desc: background job
   - example: `sleep 5 &`
   - snippet: `state.jobs.push(job)`

35. `fg`
   - desc: foreground job
   - example: `fg 1`
   - snippet: `runJob(job)`

36. `jobs`
   - desc: show suspended jobs
   - example: `jobs`
   - snippet: `print(state.jobs)`

37. `sleep`
   - desc: wait n seconds
   - example: `sleep 2`
   - snippet: `await new Promise(r=>setTimeout(r, n*1000))`

38. `time`
   - desc: measure command runtime
   - example: `time ls`
   - snippet: `console.time` + `console.timeEnd`

39. `nohup`
   - desc: run command immune to hangup
   - example: `nohup long-task &`
   - snippet: `createDetachedTask(cmd)`

40. `alias`
   - desc: command abbreviations
   - example: `alias ll='ls -l'`
   - snippet: `state.aliases[name] = cmd;`

---

## 5. Environment

41. `export`
   - desc: set env var
   - example: `export PATH=/usr/bin:$PATH`
   - snippet: `state.env[key] = value`

42. `set`
   - desc: list variables
   - example: `set`
   - snippet: `Object.entries(state.env)`

43. `env`
   - desc: print environment
   - example: `env`
   - snippet: `state.env`

44. `unset`
   - desc: delete var
   - example: `unset USER`
   - snippet: `delete state.env[key]`

45. `clearenv`
   - desc: clear environment map
   - example: `clearenv`
   - snippet: `state.env = {}`

46. `setx`
   - desc: persistent var simulation
   - example: `setx EDITOR vim`
   - snippet: `store in localStorage`

47. `printenv`
   - desc: print env var value
   - example: `printenv PATH`
   - snippet: `print(state.env[key])`

48. `export -p`
   - desc: find exported vars
   - example: `export -p`
   - snippet: `Object.keys(state.env)`

49. `source`
   - desc: execute script file in current shell
   - example: `source .bashrc`
   - snippet: `runScript(fs.readFile(path))`

50. `readonly`
   - desc: set read-only var
   - example: `readonly PI=3.14`
   - snippet: `Object.defineProperty(state.env, k, ... )`

---

## 6. Network-like commands (simulated)

51. `ping`
   - desc: check host reachability
   - example: `ping google.com`
   - snippet: `print('Pong from '+host);`

52. `curl`
   - desc: HTTP GET URL
   - example: `curl https://example.com`
   - snippet: `fetch(url).then(r=>r.text())`

53. `wget`
   - desc: download file
   - example: `wget https://.../file`
   - snippet: `fetch(url).then(r=>r.blob())`

54. `ifconfig`
   - desc: network interfaces
   - example: `ifconfig`
   - snippet: `print('eth0: 127.0.0.1');`

55. `nslookup`
   - desc: DNS resolve
   - example: `nslookup host`
   - snippet: `print('127.0.0.1');`

56. `traceroute`
   - desc: show route to host
   - example: `traceroute 1.1.1.1`
   - snippet: `for hops...`

57. `ssh`
   - desc: remote shell placeholder
   - example: `ssh user@host`
   - snippet: `print('Connected');`

58. `scp`
   - desc: secure copy (simulate)
   - example: `scp file user@host:/tmp`
   - snippet: `fs.copy()`

59. `netstat`
   - desc: network connections
   - example: `netstat`
   - snippet: `print('TCP 127.0.0.1:80');`

60. `curl -I`
   - desc: show response headers
   - example: `curl -I http://...`
   - snippet: `fetch(url,{method:'HEAD'})`

---

## 7. Package and process manager stubs

61. `apt-get`
   - desc: install package (mock)
   - example: `apt-get install git`
   - snippet: `print('install complete');`

62. `yum`
   - desc: package manager stub
   - example: `yum update`
   - snippet: `print('updating...');`

63. `pip`
   - desc: Python package manager simulation
   - example: `pip install requests`
   - snippet: `print('installed');`

64. `npm`
   - desc: Node package manager shell mimic
   - example: `npm install lodash`
   - snippet: `print('added node_modules');`

65. `ps aux`
   - desc: detailed processes
   - example: `ps aux`
   - snippet: `state.processes.map(...);`

66. `systemctl`
   - desc: service management stub
   - example: `systemctl status nginx`
   - snippet: `print('active');`

67. `service`
   - desc: manage services
   - example: `service nginx start`
   - snippet: `print('started');`

68. `df`
   - desc: disk usage
   - example: `df -h`
   - snippet: `print('Filesystem 100G used');`

69. `du`
   - desc: dir size
   - example: `du -sh .`
   - snippet: `print('4.0K .');`

70. `free`
   - desc: memory usage
   - example: `free -m`
   - snippet: `print('Mem: 1024');`

---

## 8. Text editors and file creation

71. `nano`
   - desc: open inline editor (simple)
   - example: `nano file.txt`
   - snippet: `print('open editor');`

72. `vi` / `vim`
   - desc: modal editor stub
   - example: `vim file.txt`
   - snippet: `print('vim mode');`

73. `sed`
   - desc: stream editor
   - example: `sed 's/a/b/g' file`
   - snippet: `line.replaceAll(pattern, repl)`

74. `awk`
   - desc: field processing
   - example: `awk '{print $1}' file`
   - snippet: `line.split(regex)[0]`

75. `sort -u`
   - desc: unique sort
   - example: `sort -u words.txt`
   - snippet: `Array.from(new Set(lines)).sort()`

76. `printf`
   - desc: formatted output
   - example: `printf '%s\n' hello`
   - snippet: `print(format);`

77. `touch -t`
   - desc: set time
   - example: `touch -t 202401010000 file`
   - snippet: `fs.utimes` stub

78. `chmod`
   - desc: change permissions
   - example: `chmod 755 script.sh`
   - snippet: `nodeUnixMode = value`

79. `chown`
   - desc: change owner
   - example: `chown user:user file`
   - snippet: `state.fs[path].owner = user`

80. `ln`
   - desc: create symbolic link
   - example: `ln -s target linkname`
   - snippet: `fs.symlink(target, linkname)`

---

## 9. Search and metadata

81. `find`
   - desc: locate files by name
   - example: `find . -name '*.txt'`
   - snippet: `walk(fs, path=>...);`

82. `locate`
   - desc: cached path lookup
   - example: `locate notes`
   - snippet: `print(index.filter(...))`

83. `file`
   - desc: guess file type
   - example: `file script.sh`
   - snippet: `print('text/plain');`

84. `md5sum`
   - desc: hash file
   - example: `md5sum file`
   - snippet: `print(hash(file));`

85. `sha256sum`
   - desc: SHA-256 hash
   - example: `sha256sum file`
   - snippet: `print(hash(file));`

86. `tree`
   - desc: dir tree view
   - example: `tree`
   - snippet: `recursiveList(state.cwd);`

87. `du -h`
   - desc: human-readable du
   - example: `du -h .`
   - snippet: `print('4.0K');`

88. `stat -c`
   - desc: format stat output
   - example: `stat -c '%s %n' file`
   - snippet: `print(`${size} ${name}`);`

89. `wc -w`
   - desc: word count
   - example: `wc -w article.txt`
   - snippet: `print(words.length);`

90. `wc -c`
   - desc: byte count
   - example: `wc -c file`
   - snippet: `print(bytes.length);`

---

## 10. Advanced shell features

91. `alias`
   - desc: set reusable aliases
   - example: `alias ll='ls -l'`
   - snippet: `state.aliases['ll']='ls -l'`

92. `unalias`
   - desc: remove alias
   - example: `unalias ll`
   - snippet: `delete state.aliases['ll']`

93. `history`
   - desc: show command history
   - example: `history`
   - snippet: `state.history.join('\n');`

94. `!n`
   - desc: rerun nth command
   - example: `!5`
   - snippet: `run(state.history[n-1]);`

95. `source`
   - desc: execute script
   - example: `source ~/.profile`
   - snippet: `executeScript(file)`

96. `eval`
   - desc: eval command string
   - example: `eval "echo hi"`
   - snippet: `runCommand(parse(arg));`

97. `test` / `[ ]`
   - desc: test expressions
   - example: `test -f file`
   - snippet: `exists(path)`

98. `bash` / `sh`
   - desc: start subshell
   - example: `bash`
   - snippet: `newShell();`

99. `exec`
   - desc: replace current shell process
   - example: `exec mycmd`
   - snippet: `run(command, { replace: true });`

100. `man`
   - desc: show manual entry
   - example: `man ls`
   - snippet: `print(manuals[cmd]);`

---

## Extra guidance
- Implement command dispatch in a single place (`commands` map).
- Keep each command pure and return string output when possible.
- For complex pipelines, parse tokens into AST and evaluate sequentially.
- Add tests for each command in `bun test`.
- Use `help` as a dynamic index to avoid stale docs.
