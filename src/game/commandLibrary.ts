export type DifficultyLevel = "beginner" | "intermediate" | "expert";

export type CommandCategory =
  | "navigation"
  | "file-management"
  | "text-processing"
  | "system-monitoring"
  | "process-management"
  | "networking"
  | "compression"
  | "permissions"
  | "shell-scripting"
  | "disk-storage"
  | "advanced";

export interface CommandFlag {
  flag: string;
  description: string;
}

export interface CommandEntry {
  name: string;
  description: string;
  longDescription: string;
  usage: string;
  examples: string[];
  flags?: CommandFlag[];
  category: CommandCategory;
  difficulty: DifficultyLevel;
  aliases?: string[];
  seeAlso?: string[];
}

export const commandLibrary: CommandEntry[] = [
  // ─── BEGINNER ──────────────────────────────────────────────────────────────

  {
    name: "pwd",
    description: "Print the current working directory path.",
    longDescription:
      "pwd (print working directory) outputs the full absolute path of the directory you are currently in. It is one of the first commands to learn because knowing where you are is fundamental to navigating the filesystem.",
    usage: "pwd",
    examples: ["pwd"],
    category: "navigation",
    difficulty: "beginner",
    seeAlso: ["cd", "ls"],
  },
  {
    name: "ls",
    description: "List directory contents.",
    longDescription:
      "ls lists the files and directories inside a directory. Without arguments it shows the current directory. Common flags add details like permissions, sizes, hidden files, and human-readable sizes.",
    usage: "ls [options] [directory]",
    examples: ["ls", "ls -la", "ls -lh /home", "ls -a"],
    flags: [
      { flag: "-l", description: "Long format — show permissions, owner, size, date" },
      { flag: "-a", description: "Show hidden files (names starting with .)" },
      { flag: "-h", description: "Human-readable sizes (KB, MB, GB)" },
      { flag: "-R", description: "Recursively list subdirectories" },
      { flag: "-t", description: "Sort by modification time, newest first" },
      { flag: "-S", description: "Sort by file size, largest first" },
    ],
    category: "navigation",
    difficulty: "beginner",
    seeAlso: ["cd", "pwd", "tree"],
  },
  {
    name: "cd",
    description: "Change the current working directory.",
    longDescription:
      "cd (change directory) moves you to a different directory. Use an absolute path starting with / or a relative path from your current location. Special shortcuts: ~ for home, .. for parent, - for previous directory.",
    usage: "cd [directory]",
    examples: ["cd /home/user", "cd Documents", "cd ..", "cd ~", "cd -"],
    category: "navigation",
    difficulty: "beginner",
    seeAlso: ["pwd", "ls"],
  },
  {
    name: "echo",
    description: "Print text or variable values to the terminal.",
    longDescription:
      "echo outputs its arguments as a line of text. It is essential for shell scripting, printing variable values, and writing simple output to files with redirection.",
    usage: "echo [text]",
    examples: ["echo Hello, World!", "echo $HOME", "echo 'text' > file.txt", "echo -n 'no newline'"],
    flags: [
      { flag: "-n", description: "Do not print the trailing newline" },
      { flag: "-e", description: "Enable interpretation of backslash escapes (\\n, \\t, etc.)" },
    ],
    category: "shell-scripting",
    difficulty: "beginner",
    seeAlso: ["printf", "cat"],
  },
  {
    name: "cat",
    description: "Concatenate and display file contents.",
    longDescription:
      "cat reads one or more files and writes them to standard output. It is commonly used to view short files, combine files, and pipe content to other commands.",
    usage: "cat [options] <file>...",
    examples: ["cat file.txt", "cat file1.txt file2.txt", "cat -n file.txt", "cat file.txt | grep error"],
    flags: [
      { flag: "-n", description: "Number all output lines" },
      { flag: "-A", description: "Show non-printing characters, tabs, and line ends" },
      { flag: "-s", description: "Squeeze multiple blank lines into one" },
    ],
    category: "file-management",
    difficulty: "beginner",
    seeAlso: ["less", "more", "head", "tail"],
  },
  {
    name: "touch",
    description: "Create an empty file or update its timestamps.",
    longDescription:
      "touch creates a new empty file if it does not exist. If the file already exists, it updates the file's access and modification timestamps to the current time without altering its contents.",
    usage: "touch <file>...",
    examples: ["touch newfile.txt", "touch file1.txt file2.txt", "touch -t 202401010000 file.txt"],
    flags: [
      { flag: "-a", description: "Change only the access time" },
      { flag: "-m", description: "Change only the modification time" },
      { flag: "-t", description: "Use specified timestamp instead of current time" },
    ],
    category: "file-management",
    difficulty: "beginner",
    seeAlso: ["mkdir", "rm"],
  },
  {
    name: "mkdir",
    description: "Create a new directory.",
    longDescription:
      "mkdir creates one or more directories. The -p flag is especially useful because it creates any missing parent directories in the path and does not error if the directory already exists.",
    usage: "mkdir [options] <directory>...",
    examples: ["mkdir myfolder", "mkdir -p projects/web/src", "mkdir dir1 dir2 dir3"],
    flags: [
      { flag: "-p", description: "Create parent directories as needed; no error if exists" },
      { flag: "-v", description: "Print a message for each created directory" },
      { flag: "-m", description: "Set directory permissions (e.g., -m 755)" },
    ],
    category: "file-management",
    difficulty: "beginner",
    seeAlso: ["rmdir", "rm", "ls"],
  },
  {
    name: "rmdir",
    description: "Remove empty directories.",
    longDescription:
      "rmdir removes directories that contain no files or subdirectories. To remove a non-empty directory, use rm -r instead.",
    usage: "rmdir [options] <directory>...",
    examples: ["rmdir emptyfolder", "rmdir -p path/to/empty/dir"],
    flags: [{ flag: "-p", description: "Remove directory and its empty parents" }],
    category: "file-management",
    difficulty: "beginner",
    seeAlso: ["rm", "mkdir"],
  },
  {
    name: "cp",
    description: "Copy files or directories.",
    longDescription:
      "cp copies files or directories from a source to a destination. Use -r to copy entire directory trees. The -i flag prevents accidental overwrites by asking for confirmation.",
    usage: "cp [options] <source> <destination>",
    examples: ["cp file.txt backup.txt", "cp -r mydir/ backup/", "cp -i file.txt dest/", "cp *.txt archive/"],
    flags: [
      { flag: "-r", description: "Copy directories recursively" },
      { flag: "-i", description: "Prompt before overwriting existing files" },
      { flag: "-v", description: "Verbose — print each file as it is copied" },
      { flag: "-p", description: "Preserve file attributes (timestamps, permissions)" },
      { flag: "-u", description: "Copy only when source is newer than destination" },
    ],
    category: "file-management",
    difficulty: "beginner",
    seeAlso: ["mv", "rsync"],
  },
  {
    name: "mv",
    description: "Move or rename files and directories.",
    longDescription:
      "mv moves a file or directory to a new location, or renames it if the destination is in the same directory. Unlike cp, the original is removed.",
    usage: "mv [options] <source> <destination>",
    examples: ["mv old.txt new.txt", "mv file.txt /tmp/", "mv *.log logs/", "mv -i file.txt dest/"],
    flags: [
      { flag: "-i", description: "Prompt before overwriting" },
      { flag: "-v", description: "Verbose — show each move" },
      { flag: "-n", description: "Do not overwrite existing files" },
      { flag: "-u", description: "Move only when source is newer" },
    ],
    category: "file-management",
    difficulty: "beginner",
    seeAlso: ["cp", "rename"],
  },
  {
    name: "rm",
    description: "Remove files or directories.",
    longDescription:
      "rm deletes files permanently — there is no trash or undo. Use -r to delete directories recursively and -i to be prompted before each deletion. Be very careful with rm -rf.",
    usage: "rm [options] <file>...",
    examples: ["rm file.txt", "rm -r mydir/", "rm -i *.log", "rm -rf /tmp/cache/"],
    flags: [
      { flag: "-r", description: "Recursively delete directories and their contents" },
      { flag: "-f", description: "Force deletion without prompts, ignore missing files" },
      { flag: "-i", description: "Prompt before every deletion" },
      { flag: "-v", description: "Verbose — print each file deleted" },
    ],
    category: "file-management",
    difficulty: "beginner",
    seeAlso: ["rmdir", "trash-cli"],
  },
  {
    name: "clear",
    description: "Clear the terminal screen.",
    longDescription:
      "clear clears all visible output from the terminal, giving you a clean working view. The scroll buffer is typically preserved. You can also press Ctrl+L for the same effect.",
    usage: "clear",
    examples: ["clear"],
    category: "shell-scripting",
    difficulty: "beginner",
    seeAlso: ["reset"],
  },
  {
    name: "man",
    description: "Display the manual page for a command.",
    longDescription:
      "man (manual) shows the built-in documentation for any command. Manual pages are divided into sections: 1 user commands, 5 config files, 8 admin commands. Press q to quit, / to search.",
    usage: "man [section] <command>",
    examples: ["man ls", "man 5 passwd", "man -k search-term"],
    flags: [
      { flag: "-k", description: "Search manual page names and descriptions (like apropos)" },
      { flag: "-f", description: "Show short description for a command (like whatis)" },
    ],
    category: "shell-scripting",
    difficulty: "beginner",
    seeAlso: ["help", "info", "whatis"],
  },
  {
    name: "whoami",
    description: "Print the current logged-in username.",
    longDescription:
      "whoami outputs the effective username of the current user. Useful in scripts or when you have switched users with su or sudo.",
    usage: "whoami",
    examples: ["whoami"],
    category: "system-monitoring",
    difficulty: "beginner",
    seeAlso: ["id", "who", "w"],
  },
  {
    name: "date",
    description: "Display or set the system date and time.",
    longDescription:
      "date shows the current date and time. With a format string it can output in any format. Root users can also use it to set the system clock.",
    usage: "date [+format]",
    examples: ["date", "date '+%Y-%m-%d'", "date '+%H:%M:%S'", "date -u"],
    flags: [
      { flag: "+FORMAT", description: "Output in a custom format (e.g., +%Y-%m-%d)" },
      { flag: "-u", description: "Display time in UTC" },
      { flag: "-d", description: "Display a specified date string" },
    ],
    category: "system-monitoring",
    difficulty: "beginner",
    seeAlso: ["cal", "timedatectl"],
  },
  {
    name: "cal",
    description: "Display a calendar.",
    longDescription:
      "cal prints a simple text calendar. Without arguments it shows the current month. You can specify a month and year to view any month.",
    usage: "cal [month] [year]",
    examples: ["cal", "cal 12 2024", "cal -3"],
    flags: [{ flag: "-3", description: "Show previous, current, and next month" }],
    category: "system-monitoring",
    difficulty: "beginner",
    seeAlso: ["date"],
  },
  {
    name: "history",
    description: "Show the list of previously run commands.",
    longDescription:
      "history displays your command history with line numbers. You can re-run commands with !number or !! for the last command. Use Ctrl+R for reverse search through history.",
    usage: "history [n]",
    examples: ["history", "history 20", "!42", "!!"],
    flags: [
      { flag: "-c", description: "Clear the history list" },
      { flag: "-d", description: "Delete a specific history entry" },
    ],
    category: "shell-scripting",
    difficulty: "beginner",
    seeAlso: ["echo", "alias"],
  },
  {
    name: "exit",
    description: "Exit the current shell or terminal session.",
    longDescription:
      "exit terminates the current shell. You can pass an exit code (0 for success, non-zero for failure). Pressing Ctrl+D achieves the same result.",
    usage: "exit [code]",
    examples: ["exit", "exit 0", "exit 1"],
    category: "shell-scripting",
    difficulty: "beginner",
    seeAlso: ["logout"],
  },
  {
    name: "uname",
    description: "Print system information.",
    longDescription:
      "uname displays basic information about the operating system and hardware. The -a flag prints all available information including kernel version, hostname, and architecture.",
    usage: "uname [options]",
    examples: ["uname", "uname -a", "uname -r", "uname -m"],
    flags: [
      { flag: "-a", description: "Print all system information" },
      { flag: "-r", description: "Print the kernel release version" },
      { flag: "-m", description: "Print the machine hardware architecture" },
      { flag: "-n", description: "Print the network node (hostname)" },
    ],
    category: "system-monitoring",
    difficulty: "beginner",
    seeAlso: ["hostname", "lsb_release"],
  },

  // ─── INTERMEDIATE ──────────────────────────────────────────────────────────

  {
    name: "grep",
    description: "Search for patterns inside files or input.",
    longDescription:
      "grep (Global Regular Expression Print) searches for lines matching a pattern. It supports basic and extended regular expressions and is one of the most powerful text-filtering tools available.",
    usage: "grep [options] <pattern> [file]...",
    examples: [
      "grep 'error' logfile.txt",
      "grep -r 'TODO' ./src",
      "grep -i 'hello' file.txt",
      "grep -n 'fail' app.log",
      "grep -v 'debug' app.log",
      "cat file.txt | grep 'pattern'",
    ],
    flags: [
      { flag: "-i", description: "Case-insensitive match" },
      { flag: "-r", description: "Recursively search directories" },
      { flag: "-n", description: "Show line numbers" },
      { flag: "-v", description: "Invert match — show non-matching lines" },
      { flag: "-c", description: "Count matching lines" },
      { flag: "-l", description: "List only file names with matches" },
      { flag: "-E", description: "Use extended regular expressions (same as egrep)" },
      { flag: "-A n", description: "Show n lines after each match" },
      { flag: "-B n", description: "Show n lines before each match" },
      { flag: "-C n", description: "Show n lines around each match" },
    ],
    category: "text-processing",
    difficulty: "intermediate",
    seeAlso: ["awk", "sed", "find"],
  },
  {
    name: "find",
    description: "Search for files and directories matching criteria.",
    longDescription:
      "find recursively searches a directory tree for files matching conditions like name, type, size, modification time, or permissions. Results can be piped to other commands or acted on with -exec.",
    usage: "find <path> [expression]",
    examples: [
      "find . -name '*.txt'",
      "find /home -type d",
      "find . -mtime -7",
      "find . -size +1M",
      "find . -name '*.log' -exec rm {} \\;",
      "find / -perm -u+s 2>/dev/null",
    ],
    flags: [
      { flag: "-name", description: "Match by filename (case-sensitive)" },
      { flag: "-iname", description: "Match by filename (case-insensitive)" },
      { flag: "-type f", description: "Match only regular files" },
      { flag: "-type d", description: "Match only directories" },
      { flag: "-mtime n", description: "Modified n days ago (-n = less than, +n = more than)" },
      { flag: "-size n", description: "Match files of size n (c=bytes, k=KB, M=MB)" },
      { flag: "-exec", description: "Execute a command on each result" },
      { flag: "-maxdepth n", description: "Limit search depth to n levels" },
      { flag: "-perm", description: "Match by permission bits" },
    ],
    category: "file-management",
    difficulty: "intermediate",
    seeAlso: ["grep", "locate", "fd"],
  },
  {
    name: "head",
    description: "Display the first lines of a file.",
    longDescription:
      "head prints the first 10 lines of a file by default. Use -n to specify a different number of lines. Useful for quickly previewing large files.",
    usage: "head [options] <file>",
    examples: ["head file.txt", "head -n 20 file.txt", "head -n -5 file.txt", "head -c 100 file.txt"],
    flags: [
      { flag: "-n N", description: "Print the first N lines" },
      { flag: "-c N", description: "Print the first N bytes" },
    ],
    category: "text-processing",
    difficulty: "intermediate",
    seeAlso: ["tail", "less", "cat"],
  },
  {
    name: "tail",
    description: "Display the last lines of a file.",
    longDescription:
      "tail prints the last 10 lines of a file by default. The -f flag follows the file as it grows, which is indispensable for monitoring log files in real time.",
    usage: "tail [options] <file>",
    examples: ["tail file.txt", "tail -n 50 file.txt", "tail -f /var/log/syslog", "tail -F app.log"],
    flags: [
      { flag: "-n N", description: "Print the last N lines" },
      { flag: "-c N", description: "Print the last N bytes" },
      { flag: "-f", description: "Follow — output appended data as the file grows" },
      { flag: "-F", description: "Follow by name — re-open if file is rotated" },
    ],
    category: "text-processing",
    difficulty: "intermediate",
    seeAlso: ["head", "less", "journalctl"],
  },
  {
    name: "less",
    description: "View file contents page by page.",
    longDescription:
      "less is an interactive pager that lets you scroll through files. Unlike more, you can scroll both forward and backward. Press q to quit, / to search forward, ? to search backward, G to jump to end.",
    usage: "less <file>",
    examples: ["less file.txt", "less +G file.txt", "cat file.txt | less", "less +/pattern file.txt"],
    flags: [
      { flag: "-N", description: "Show line numbers" },
      { flag: "-S", description: "Chop long lines instead of wrapping" },
      { flag: "+G", description: "Start at the end of the file" },
      { flag: "+/pattern", description: "Start at the first occurrence of pattern" },
    ],
    category: "text-processing",
    difficulty: "intermediate",
    seeAlso: ["more", "head", "tail", "cat"],
  },
  {
    name: "sort",
    description: "Sort lines of text.",
    longDescription:
      "sort arranges lines alphabetically by default. It supports numeric sorting, reverse order, and can sort by specific columns (fields), making it very useful in pipelines.",
    usage: "sort [options] [file]",
    examples: [
      "sort names.txt",
      "sort -r names.txt",
      "sort -n numbers.txt",
      "sort -u names.txt",
      "sort -k2 data.txt",
      "du -sh */ | sort -h",
    ],
    flags: [
      { flag: "-n", description: "Numeric sort" },
      { flag: "-r", description: "Reverse the sort order" },
      { flag: "-u", description: "Remove duplicate lines" },
      { flag: "-k N", description: "Sort by field N (1-indexed)" },
      { flag: "-t CHAR", description: "Use CHAR as the field delimiter" },
      { flag: "-h", description: "Human-readable numeric sort (1K, 2M, etc.)" },
    ],
    category: "text-processing",
    difficulty: "intermediate",
    seeAlso: ["uniq", "cut", "awk"],
  },
  {
    name: "uniq",
    description: "Remove or report duplicate adjacent lines.",
    longDescription:
      "uniq filters consecutive identical lines. Since it only compares adjacent lines, it is almost always used after sort. Use -c to count occurrences.",
    usage: "uniq [options] [file]",
    examples: ["sort file.txt | uniq", "sort file.txt | uniq -c", "sort file.txt | uniq -d", "uniq -i file.txt"],
    flags: [
      { flag: "-c", description: "Prefix lines with the number of occurrences" },
      { flag: "-d", description: "Only print duplicate lines" },
      { flag: "-u", description: "Only print unique lines" },
      { flag: "-i", description: "Case-insensitive comparison" },
    ],
    category: "text-processing",
    difficulty: "intermediate",
    seeAlso: ["sort", "cut"],
  },
  {
    name: "wc",
    description: "Count lines, words, and characters in a file.",
    longDescription:
      "wc (word count) counts lines, words, and bytes in files. Commonly used in pipelines to count command output — for example, counting how many files grep matched.",
    usage: "wc [options] [file]",
    examples: ["wc file.txt", "wc -l file.txt", "grep -r 'error' . | wc -l", "cat *.txt | wc -w"],
    flags: [
      { flag: "-l", description: "Count lines only" },
      { flag: "-w", description: "Count words only" },
      { flag: "-c", description: "Count bytes only" },
      { flag: "-m", description: "Count characters (multibyte-aware)" },
    ],
    category: "text-processing",
    difficulty: "intermediate",
    seeAlso: ["grep", "cut", "awk"],
  },
  {
    name: "cut",
    description: "Extract specific columns or fields from text.",
    longDescription:
      "cut removes sections from each line. You can cut by bytes, characters, or delimiter-separated fields. It is ideal for processing CSV-like data in pipelines.",
    usage: "cut [options] [file]",
    examples: [
      "cut -d',' -f1 data.csv",
      "cut -d':' -f1,3 /etc/passwd",
      "cut -c1-10 file.txt",
      "echo 'a:b:c' | cut -d: -f2",
    ],
    flags: [
      { flag: "-d DELIM", description: "Use DELIM as the field delimiter" },
      { flag: "-f N", description: "Select field N (or a range like 1-3)" },
      { flag: "-c N", description: "Select character position N" },
    ],
    category: "text-processing",
    difficulty: "intermediate",
    seeAlso: ["awk", "sort", "paste"],
  },
  {
    name: "diff",
    description: "Compare two files line by line.",
    longDescription:
      "diff compares two files and shows the differences between them. The output indicates which lines need to be added, removed, or changed to transform file1 into file2. Widely used in version control workflows.",
    usage: "diff [options] <file1> <file2>",
    examples: ["diff old.txt new.txt", "diff -u old.txt new.txt", "diff -r dir1/ dir2/", "diff -i file1 file2"],
    flags: [
      { flag: "-u", description: "Unified format — easier to read, used in patches" },
      { flag: "-r", description: "Recursively compare directories" },
      { flag: "-i", description: "Ignore case differences" },
      { flag: "-w", description: "Ignore all whitespace" },
      { flag: "-q", description: "Only report whether files differ" },
    ],
    category: "text-processing",
    difficulty: "intermediate",
    seeAlso: ["patch", "vimdiff", "git diff"],
  },
  {
    name: "ln",
    description: "Create hard or symbolic links.",
    longDescription:
      "ln creates links between files. A hard link is another name for the same file data. A symbolic (soft) link is a pointer to another path — it can span filesystems and point to directories.",
    usage: "ln [options] <target> <link-name>",
    examples: ["ln file.txt hardlink.txt", "ln -s /etc/nginx/nginx.conf nginx.conf", "ln -s ../lib /usr/local/lib"],
    flags: [
      { flag: "-s", description: "Create a symbolic (soft) link" },
      { flag: "-f", description: "Remove existing destination file if needed" },
      { flag: "-v", description: "Verbose — print the name of each linked file" },
    ],
    category: "file-management",
    difficulty: "intermediate",
    seeAlso: ["ls -l", "readlink", "unlink"],
  },
  {
    name: "chmod",
    description: "Change file or directory permissions.",
    longDescription:
      "chmod modifies the read (r), write (w), and execute (x) permissions for the owner (u), group (g), and others (o). You can use symbolic notation (u+x) or octal notation (755).",
    usage: "chmod [options] <mode> <file>",
    examples: ["chmod 755 script.sh", "chmod u+x script.sh", "chmod -R 644 /var/www/", "chmod go-w file.txt"],
    flags: [
      { flag: "-R", description: "Apply permissions recursively to directories" },
      { flag: "-v", description: "Verbose — print permission changes" },
    ],
    category: "permissions",
    difficulty: "intermediate",
    seeAlso: ["chown", "chgrp", "ls -l", "umask"],
  },
  {
    name: "chown",
    description: "Change file owner and group.",
    longDescription:
      "chown changes the user and/or group ownership of a file. Only root (or sudo) can change ownership to another user. Useful when deploying web apps that need to be owned by a service account.",
    usage: "chown [options] <user>[:group] <file>",
    examples: [
      "chown alice file.txt",
      "chown alice:developers file.txt",
      "chown -R www-data /var/www/html",
      "chown :staff report.txt",
    ],
    flags: [
      { flag: "-R", description: "Recursively change ownership" },
      { flag: "-v", description: "Verbose output" },
    ],
    category: "permissions",
    difficulty: "intermediate",
    seeAlso: ["chmod", "chgrp", "ls -l"],
  },
  {
    name: "ps",
    description: "Show a snapshot of running processes.",
    longDescription:
      "ps reports information about currently running processes. The most common invocation is ps aux which shows all processes from all users with full details including CPU and memory usage.",
    usage: "ps [options]",
    examples: ["ps", "ps aux", "ps aux | grep nginx", "ps -ef", "ps --sort=-%cpu | head"],
    flags: [
      { flag: "a", description: "Show processes from all users" },
      { flag: "u", description: "Show user-oriented format (owner, CPU, MEM)" },
      { flag: "x", description: "Include processes without a controlling terminal" },
      { flag: "-e", description: "Show every process" },
      { flag: "-f", description: "Full format listing" },
      { flag: "--sort", description: "Sort output by a field (e.g., --sort=-%cpu)" },
    ],
    category: "process-management",
    difficulty: "intermediate",
    seeAlso: ["top", "htop", "kill", "pgrep"],
  },
  {
    name: "kill",
    description: "Send a signal to a process.",
    longDescription:
      "kill sends a signal to a process by PID. The default signal is SIGTERM (15) which asks the process to terminate gracefully. SIGKILL (9) forcibly kills it. Use pgrep or ps to find PIDs.",
    usage: "kill [signal] <PID>",
    examples: ["kill 1234", "kill -9 1234", "kill -SIGTERM 1234", "kill -l"],
    flags: [
      { flag: "-9 or -SIGKILL", description: "Force kill — cannot be caught or ignored" },
      { flag: "-15 or -SIGTERM", description: "Graceful termination request (default)" },
      { flag: "-1 or -SIGHUP", description: "Reload configuration (hangup signal)" },
      { flag: "-l", description: "List all available signal names" },
    ],
    category: "process-management",
    difficulty: "intermediate",
    seeAlso: ["ps", "pgrep", "pkill", "top"],
  },
  {
    name: "top",
    description: "Display live system resource usage and processes.",
    longDescription:
      "top shows a real-time view of running processes sorted by CPU usage. Press q to quit, M to sort by memory, P to sort by CPU, k to kill a process by PID.",
    usage: "top",
    examples: ["top", "top -u alice", "top -p 1234"],
    flags: [
      { flag: "-u USER", description: "Show only processes owned by USER" },
      { flag: "-p PID", description: "Monitor a specific PID" },
      { flag: "-d N", description: "Set refresh interval to N seconds" },
      { flag: "-n N", description: "Exit after N iterations (good for scripting)" },
    ],
    category: "process-management",
    difficulty: "intermediate",
    seeAlso: ["htop", "ps", "kill", "uptime"],
  },
  {
    name: "df",
    description: "Report filesystem disk space usage.",
    longDescription:
      "df (disk free) shows how much disk space is used and available on all mounted filesystems. Always use -h for human-readable output. Use -T to also show filesystem type.",
    usage: "df [options] [filesystem]",
    examples: ["df -h", "df -hT", "df -h /home", "df -i"],
    flags: [
      { flag: "-h", description: "Human-readable sizes (KB, MB, GB)" },
      { flag: "-T", description: "Show filesystem type" },
      { flag: "-i", description: "Show inode usage instead of block usage" },
    ],
    category: "disk-storage",
    difficulty: "intermediate",
    seeAlso: ["du", "lsblk", "mount"],
  },
  {
    name: "du",
    description: "Show disk usage of files and directories.",
    longDescription:
      "du (disk usage) estimates the disk space used by files and directories. Use -sh for a single human-readable summary of a directory, or -sh * to compare subdirectory sizes.",
    usage: "du [options] [path]",
    examples: ["du -sh /var/log", "du -sh *", "du -ah .", "du --max-depth=1 -h /home"],
    flags: [
      { flag: "-s", description: "Summarize — show only total for each argument" },
      { flag: "-h", description: "Human-readable sizes" },
      { flag: "-a", description: "Show sizes for all files, not just directories" },
      { flag: "--max-depth N", description: "Limit recursion depth to N levels" },
    ],
    category: "disk-storage",
    difficulty: "intermediate",
    seeAlso: ["df", "find", "ncdu"],
  },
  {
    name: "free",
    description: "Display memory usage statistics.",
    longDescription:
      "free shows total, used, and free memory (RAM and swap). The -h flag gives human-readable output. The 'available' column shows how much memory is realistically available for new programs.",
    usage: "free [options]",
    examples: ["free -h", "free -m", "watch -n 1 free -h"],
    flags: [
      { flag: "-h", description: "Human-readable sizes" },
      { flag: "-m", description: "Output in megabytes" },
      { flag: "-g", description: "Output in gigabytes" },
      { flag: "-s N", description: "Repeat output every N seconds" },
    ],
    category: "system-monitoring",
    difficulty: "intermediate",
    seeAlso: ["top", "vmstat", "cat /proc/meminfo"],
  },
  {
    name: "ping",
    description: "Test network connectivity to a host.",
    longDescription:
      "ping sends ICMP echo request packets to a host and measures round-trip time. Useful for diagnosing connectivity problems. Use -c to limit the number of packets sent.",
    usage: "ping [options] <host>",
    examples: ["ping google.com", "ping -c 4 8.8.8.8", "ping -i 0.5 server.local"],
    flags: [
      { flag: "-c N", description: "Send N packets then stop" },
      { flag: "-i N", description: "Interval between packets in seconds" },
      { flag: "-t N", description: "Set TTL (Time To Live)" },
    ],
    category: "networking",
    difficulty: "intermediate",
    seeAlso: ["traceroute", "curl", "nmap"],
  },
  {
    name: "curl",
    description: "Transfer data from or to a server via URLs.",
    longDescription:
      "curl supports many protocols (HTTP, HTTPS, FTP, etc.) and is the swiss-army knife for making web requests from the command line. It can download files, send POST data, set headers, and follow redirects.",
    usage: "curl [options] <url>",
    examples: [
      "curl https://example.com",
      "curl -o file.html https://example.com",
      "curl -X POST -d 'key=val' https://api.example.com",
      "curl -H 'Authorization: Bearer TOKEN' https://api.example.com",
      "curl -I https://example.com",
    ],
    flags: [
      { flag: "-o FILE", description: "Write output to FILE instead of stdout" },
      { flag: "-O", description: "Save file with its remote name" },
      { flag: "-X METHOD", description: "Specify HTTP method (GET, POST, PUT, DELETE)" },
      { flag: "-d DATA", description: "Send POST data" },
      { flag: "-H HEADER", description: "Add a custom header" },
      { flag: "-I", description: "Fetch HTTP headers only" },
      { flag: "-L", description: "Follow redirects" },
      { flag: "-s", description: "Silent mode — suppress progress bar" },
      { flag: "-v", description: "Verbose — show full request and response headers" },
    ],
    category: "networking",
    difficulty: "intermediate",
    seeAlso: ["wget", "httpie", "ssh"],
  },
  {
    name: "wget",
    description: "Non-interactive file download from the web.",
    longDescription:
      "wget downloads files from HTTP, HTTPS, and FTP servers. Unlike curl, it is specialized for downloading and supports recursive site mirroring, resuming interrupted downloads, and background downloads.",
    usage: "wget [options] <url>",
    examples: [
      "wget https://example.com/file.tar.gz",
      "wget -c https://example.com/largefile.iso",
      "wget -r -l2 https://example.com",
      "wget -b https://example.com/file.zip",
    ],
    flags: [
      { flag: "-c", description: "Continue an interrupted download" },
      { flag: "-b", description: "Download in the background" },
      { flag: "-r", description: "Recursive download" },
      { flag: "-l N", description: "Limit recursion depth to N" },
      { flag: "-O FILE", description: "Save to a specific file name" },
      { flag: "-q", description: "Quiet — suppress output" },
    ],
    category: "networking",
    difficulty: "intermediate",
    seeAlso: ["curl", "rsync"],
  },
  {
    name: "ssh",
    description: "Open a secure remote shell session.",
    longDescription:
      "ssh (Secure Shell) creates an encrypted connection to a remote machine. You can run commands remotely, set up tunnels, and use key-based authentication for passwordless login.",
    usage: "ssh [options] [user@]<host>",
    examples: [
      "ssh alice@192.168.1.10",
      "ssh -p 2222 alice@server.com",
      "ssh -i ~/.ssh/id_rsa alice@server.com",
      "ssh -L 8080:localhost:80 alice@server.com",
    ],
    flags: [
      { flag: "-p PORT", description: "Connect on a non-default port" },
      { flag: "-i FILE", description: "Use a specific private key file" },
      { flag: "-L", description: "Local port forwarding (tunnel)" },
      { flag: "-R", description: "Remote port forwarding" },
      { flag: "-v", description: "Verbose — useful for debugging connection issues" },
    ],
    category: "networking",
    difficulty: "intermediate",
    seeAlso: ["scp", "rsync", "ssh-keygen"],
  },
  {
    name: "tar",
    description: "Create or extract archive files.",
    longDescription:
      "tar (tape archive) bundles files into a single archive. Commonly combined with gzip (-z) or bzip2 (-j) for compression. The flags c=create, x=extract, v=verbose, f=file are the core ones to memorize.",
    usage: "tar [options] <archive> [files]",
    examples: [
      "tar -czvf archive.tar.gz directory/",
      "tar -xzvf archive.tar.gz",
      "tar -cjvf archive.tar.bz2 directory/",
      "tar -tf archive.tar.gz",
      "tar -xzvf archive.tar.gz -C /tmp/",
    ],
    flags: [
      { flag: "-c", description: "Create a new archive" },
      { flag: "-x", description: "Extract files from an archive" },
      { flag: "-v", description: "Verbose — list files as they are processed" },
      { flag: "-f FILE", description: "Use FILE as the archive" },
      { flag: "-z", description: "Filter through gzip (for .tar.gz files)" },
      { flag: "-j", description: "Filter through bzip2 (for .tar.bz2 files)" },
      { flag: "-J", description: "Filter through xz (for .tar.xz files)" },
      { flag: "-t", description: "List contents of an archive without extracting" },
      { flag: "-C DIR", description: "Extract into DIR instead of current directory" },
    ],
    category: "compression",
    difficulty: "intermediate",
    seeAlso: ["zip", "gzip", "bzip2"],
  },
  {
    name: "zip",
    description: "Compress files into a ZIP archive.",
    longDescription:
      "zip creates compressed archives in the ZIP format, which is widely compatible across operating systems. Use -r for directories and -9 for maximum compression.",
    usage: "zip [options] <archive.zip> <files>",
    examples: ["zip archive.zip file1.txt file2.txt", "zip -r archive.zip myfolder/", "zip -9 -r archive.zip ."],
    flags: [
      { flag: "-r", description: "Recursively include directories" },
      { flag: "-9", description: "Maximum compression level" },
      { flag: "-e", description: "Encrypt with a password" },
      { flag: "-u", description: "Update files in existing archive" },
    ],
    category: "compression",
    difficulty: "intermediate",
    seeAlso: ["unzip", "tar", "gzip"],
  },
  {
    name: "unzip",
    description: "Extract files from a ZIP archive.",
    longDescription:
      "unzip extracts files from a ZIP archive. Use -l to list contents without extracting, and -d to specify a destination directory.",
    usage: "unzip [options] <archive.zip>",
    examples: ["unzip archive.zip", "unzip -l archive.zip", "unzip archive.zip -d /tmp/extract/", "unzip -o archive.zip"],
    flags: [
      { flag: "-l", description: "List archive contents without extracting" },
      { flag: "-d DIR", description: "Extract into directory DIR" },
      { flag: "-o", description: "Overwrite existing files without prompting" },
      { flag: "-q", description: "Quiet — suppress output" },
    ],
    category: "compression",
    difficulty: "intermediate",
    seeAlso: ["zip", "tar"],
  },
  {
    name: "alias",
    description: "Create a shorthand name for a command.",
    longDescription:
      "alias lets you define custom shortcuts for long or frequently used commands. Add aliases to ~/.bashrc or ~/.zshrc to make them permanent across sessions.",
    usage: "alias [name='command']",
    examples: [
      "alias ll='ls -lah'",
      "alias gs='git status'",
      "alias update='sudo apt update && sudo apt upgrade'",
      "alias",
    ],
    category: "shell-scripting",
    difficulty: "intermediate",
    seeAlso: ["unalias", "function", "export"],
  },
  {
    name: "export",
    description: "Set environment variables for child processes.",
    longDescription:
      "export marks a shell variable so that it is inherited by child processes (subshells and commands you run). Without export, a variable is local to the current shell.",
    usage: "export <NAME>=<value>",
    examples: ["export PATH=$PATH:/usr/local/bin", "export EDITOR=vim", "export DEBUG=true", "export -p"],
    flags: [{ flag: "-p", description: "List all exported variables" }],
    category: "shell-scripting",
    difficulty: "intermediate",
    seeAlso: ["env", "source", "alias"],
  },
  {
    name: "env",
    description: "Display or set environment variables.",
    longDescription:
      "env prints all current environment variables, or runs a command with a modified environment. Useful in scripts and when you need to see what variables are available to processes.",
    usage: "env [NAME=value]... [command]",
    examples: ["env", "env | grep PATH", "env NODE_ENV=production node server.js"],
    category: "shell-scripting",
    difficulty: "intermediate",
    seeAlso: ["export", "printenv", "set"],
  },
  {
    name: "which",
    description: "Locate the executable of a command.",
    longDescription:
      "which searches PATH directories and prints the full path of the executable that would be run when you type the command name. Useful for verifying which version of a program is being used.",
    usage: "which <command>",
    examples: ["which python3", "which node", "which -a python"],
    flags: [{ flag: "-a", description: "Show all matching executables in PATH, not just the first" }],
    category: "shell-scripting",
    difficulty: "intermediate",
    seeAlso: ["whereis", "type", "locate"],
  },
  {
    name: "uptime",
    description: "Show how long the system has been running.",
    longDescription:
      "uptime displays the current time, how long the system has been up, how many users are logged in, and the load average for the past 1, 5, and 15 minutes.",
    usage: "uptime",
    examples: ["uptime", "uptime -p", "uptime -s"],
    flags: [
      { flag: "-p", description: "Show uptime in pretty human-readable format" },
      { flag: "-s", description: "Show the date/time when the system started" },
    ],
    category: "system-monitoring",
    difficulty: "intermediate",
    seeAlso: ["top", "w", "who"],
  },

  // ─── EXPERT ────────────────────────────────────────────────────────────────

  {
    name: "awk",
    description: "Pattern scanning and text processing language.",
    longDescription:
      "awk is a full programming language for processing structured text. It processes input line-by-line, splitting each line into fields ($1, $2, …). It excels at reformatting data, calculating column sums, and conditional text manipulation.",
    usage: "awk 'program' [file]",
    examples: [
      "awk '{print $1}' file.txt",
      "awk -F',' '{print $2}' data.csv",
      "awk '{sum += $1} END {print sum}' numbers.txt",
      "awk '$3 > 100 {print $1, $3}' data.txt",
      "ps aux | awk '{print $1, $2, $11}'",
    ],
    flags: [
      { flag: "-F DELIM", description: "Set field separator to DELIM" },
      { flag: "-v VAR=val", description: "Set a variable before processing" },
      { flag: "-f FILE", description: "Read the awk program from FILE" },
    ],
    category: "text-processing",
    difficulty: "expert",
    seeAlso: ["sed", "grep", "cut"],
  },
  {
    name: "sed",
    description: "Stream editor for filtering and transforming text.",
    longDescription:
      "sed applies editing commands to each line of input. The most common use is substitution: s/pattern/replacement/flags. The -i flag edits files in-place, making sed a powerful batch text transformer.",
    usage: "sed [options] 'script' [file]",
    examples: [
      "sed 's/foo/bar/' file.txt",
      "sed 's/foo/bar/g' file.txt",
      "sed -i 's/old/new/g' file.txt",
      "sed -n '5,10p' file.txt",
      "sed '/^#/d' config.txt",
      "sed -i.bak 's/localhost/127.0.0.1/g' config.conf",
    ],
    flags: [
      { flag: "-i", description: "Edit file in-place (no backup)" },
      { flag: "-i.bak", description: "Edit in-place, creating a .bak backup first" },
      { flag: "-n", description: "Suppress automatic printing; use p to print explicitly" },
      { flag: "-e", description: "Add a script expression (allows multiple -e)" },
      { flag: "-r / -E", description: "Use extended regular expressions" },
    ],
    category: "text-processing",
    difficulty: "expert",
    seeAlso: ["awk", "grep", "tr"],
  },
  {
    name: "xargs",
    description: "Build and execute commands from standard input.",
    longDescription:
      "xargs reads items from stdin and passes them as arguments to a command. It is essential for piping the output of one command as arguments to another, especially when the argument list would be too long for the shell.",
    usage: "xargs [options] [command]",
    examples: [
      "find . -name '*.tmp' | xargs rm",
      "cat urls.txt | xargs wget",
      "find . -name '*.txt' | xargs grep 'error'",
      "echo 'file1 file2 file3' | xargs -n1 echo",
      "find . -name '*.jpg' | xargs -P4 convert -resize 50%",
    ],
    flags: [
      { flag: "-n N", description: "Pass at most N arguments per command invocation" },
      { flag: "-P N", description: "Run up to N processes in parallel" },
      { flag: "-I {}",  description: "Replace {} with the input item in the command" },
      { flag: "-0", description: "Input items terminated by null (pair with find -print0)" },
      { flag: "-t", description: "Print the command before running it" },
    ],
    category: "text-processing",
    difficulty: "expert",
    seeAlso: ["find", "parallel", "sed"],
  },
  {
    name: "tee",
    description: "Read from stdin and write to both stdout and a file.",
    longDescription:
      "tee duplicates its input to both standard output and one or more files simultaneously. This lets you capture output mid-pipeline without breaking the pipe chain.",
    usage: "tee [options] <file>",
    examples: [
      "command | tee output.log",
      "command | tee -a log.txt | grep error",
      "make 2>&1 | tee build.log",
    ],
    flags: [
      { flag: "-a", description: "Append to file instead of overwriting" },
    ],
    category: "shell-scripting",
    difficulty: "expert",
    seeAlso: ["redirect", "pipe", "cat"],
  },
  {
    name: "tr",
    description: "Translate or delete characters.",
    longDescription:
      "tr translates, squeezes, or deletes characters from standard input. It operates on individual characters (not patterns), making it fast for simple character-level transformations.",
    usage: "tr [options] <set1> [set2]",
    examples: [
      "echo 'hello' | tr 'a-z' 'A-Z'",
      "echo 'hello world' | tr ' ' '_'",
      "cat file.txt | tr -d '\\n'",
      "echo 'aabbcc' | tr -s 'a-z'",
      "cat file.txt | tr -dc '[:print:]'",
    ],
    flags: [
      { flag: "-d", description: "Delete characters in set1 from input" },
      { flag: "-s", description: "Squeeze repeated characters in set1 to one" },
      { flag: "-c", description: "Complement — use characters NOT in set1" },
    ],
    category: "text-processing",
    difficulty: "expert",
    seeAlso: ["sed", "awk", "cut"],
  },
  {
    name: "lsof",
    description: "List open files and the processes using them.",
    longDescription:
      "lsof (list open files) shows which processes have which files open. Since everything is a file in Linux — including network sockets — lsof is indispensable for debugging open ports, held file handles, and stuck processes.",
    usage: "lsof [options]",
    examples: [
      "lsof -i :8080",
      "lsof -u alice",
      "lsof /var/log/app.log",
      "lsof -p 1234",
      "lsof -i TCP -n -P",
    ],
    flags: [
      { flag: "-i :PORT", description: "Show processes using a network port" },
      { flag: "-u USER", description: "Show files opened by USER" },
      { flag: "-p PID", description: "Show files opened by process PID" },
      { flag: "-n", description: "Do not resolve hostnames (faster)" },
      { flag: "-P", description: "Do not resolve port names" },
    ],
    category: "system-monitoring",
    difficulty: "expert",
    seeAlso: ["ss", "netstat", "fuser"],
  },
  {
    name: "ss",
    description: "Display socket statistics (modern netstat replacement).",
    longDescription:
      "ss (socket statistics) is the modern replacement for netstat. It shows listening and connected sockets, the processes using them, and supports fast filtering. Prefer ss over netstat on modern Linux systems.",
    usage: "ss [options]",
    examples: [
      "ss -tuln",
      "ss -tulnp",
      "ss -s",
      "ss -t state established",
      "ss -lnp | grep :443",
    ],
    flags: [
      { flag: "-t", description: "Show TCP sockets" },
      { flag: "-u", description: "Show UDP sockets" },
      { flag: "-l", description: "Show listening sockets only" },
      { flag: "-n", description: "Do not resolve service names" },
      { flag: "-p", description: "Show process using each socket" },
      { flag: "-s", description: "Print summary statistics" },
    ],
    category: "networking",
    difficulty: "expert",
    seeAlso: ["lsof", "netstat", "iptables"],
  },
  {
    name: "rsync",
    description: "Efficiently synchronize files between locations.",
    longDescription:
      "rsync transfers only the differences between source and destination, making it far faster than cp for large file sets. It works locally or over SSH, preserves permissions and timestamps, and supports incremental backups.",
    usage: "rsync [options] <source> <destination>",
    examples: [
      "rsync -avz ~/docs/ backup/",
      "rsync -avz -e ssh ~/docs/ alice@server:/backup/",
      "rsync -avz --delete ~/docs/ backup/",
      "rsync --dry-run -avz source/ dest/",
    ],
    flags: [
      { flag: "-a", description: "Archive mode — preserves permissions, timestamps, links" },
      { flag: "-v", description: "Verbose output" },
      { flag: "-z", description: "Compress data during transfer" },
      { flag: "-e ssh", description: "Use SSH as transport" },
      { flag: "--delete", description: "Delete files in destination not in source" },
      { flag: "--dry-run", description: "Simulate the transfer without making changes" },
      { flag: "--exclude", description: "Exclude files matching a pattern" },
    ],
    category: "networking",
    difficulty: "expert",
    seeAlso: ["scp", "cp", "tar"],
  },
  {
    name: "scp",
    description: "Securely copy files between hosts over SSH.",
    longDescription:
      "scp (secure copy) transfers files between a local and remote host (or between two remote hosts) using SSH for authentication and encryption. Prefer rsync for large or repeated transfers.",
    usage: "scp [options] <source> <destination>",
    examples: [
      "scp file.txt alice@server:/home/alice/",
      "scp alice@server:/var/log/app.log ./",
      "scp -r mydir/ alice@server:/home/alice/",
      "scp -P 2222 file.txt alice@server:/tmp/",
    ],
    flags: [
      { flag: "-r", description: "Recursively copy directories" },
      { flag: "-P PORT", description: "Connect on a non-default SSH port" },
      { flag: "-i FILE", description: "Use a specific identity (key) file" },
      { flag: "-C", description: "Enable compression" },
    ],
    category: "networking",
    difficulty: "expert",
    seeAlso: ["rsync", "ssh", "sftp"],
  },
  {
    name: "crontab",
    description: "Schedule recurring commands with cron.",
    longDescription:
      "crontab manages cron job schedules for the current user. Each line in a crontab follows the format: minute hour day-of-month month day-of-week command. Use the site crontab.guru to build and verify expressions.",
    usage: "crontab [options]",
    examples: [
      "crontab -e",
      "crontab -l",
      "crontab -r",
      "# In crontab: */5 * * * * /home/user/script.sh",
      "# In crontab: 0 2 * * * /usr/bin/backup.sh",
    ],
    flags: [
      { flag: "-e", description: "Edit the current user's crontab" },
      { flag: "-l", description: "List the current user's crontab" },
      { flag: "-r", description: "Remove the current user's crontab" },
      { flag: "-u USER", description: "Operate on USER's crontab (root only)" },
    ],
    category: "advanced",
    difficulty: "expert",
    seeAlso: ["at", "systemctl", "watch"],
  },
  {
    name: "systemctl",
    description: "Control the systemd system and service manager.",
    longDescription:
      "systemctl manages services, daemons, and the boot state on systemd-based Linux distributions (Debian/Ubuntu, Fedora, RHEL, Arch). Use it to start, stop, enable, disable, and inspect services.",
    usage: "systemctl [command] [unit]",
    examples: [
      "systemctl status nginx",
      "systemctl start nginx",
      "systemctl stop nginx",
      "systemctl restart nginx",
      "systemctl enable nginx",
      "systemctl disable nginx",
      "systemctl list-units --type=service",
    ],
    flags: [
      { flag: "start", description: "Start a unit" },
      { flag: "stop", description: "Stop a unit" },
      { flag: "restart", description: "Stop and start a unit" },
      { flag: "reload", description: "Reload a unit's configuration without restart" },
      { flag: "enable", description: "Enable a unit to start at boot" },
      { flag: "disable", description: "Disable a unit from starting at boot" },
      { flag: "status", description: "Show current status and recent log lines" },
    ],
    category: "advanced",
    difficulty: "expert",
    seeAlso: ["journalctl", "service", "crontab"],
  },
  {
    name: "journalctl",
    description: "Query the systemd journal (system logs).",
    longDescription:
      "journalctl reads logs from the systemd journal. It can filter by service, time range, priority, and boot session. Use -f to follow live log output, analogous to tail -f for systemd services.",
    usage: "journalctl [options]",
    examples: [
      "journalctl -u nginx",
      "journalctl -u nginx -f",
      "journalctl --since '1 hour ago'",
      "journalctl -p err",
      "journalctl -b",
      "journalctl --disk-usage",
    ],
    flags: [
      { flag: "-u UNIT", description: "Show logs for a specific service unit" },
      { flag: "-f", description: "Follow — stream new log entries" },
      { flag: "-n N", description: "Show the last N lines" },
      { flag: "-p PRIORITY", description: "Filter by priority: err, warning, info, debug" },
      { flag: "--since TIME", description: "Show entries from TIME (e.g., 'yesterday', '2024-01-01')" },
      { flag: "-b", description: "Show logs from the current boot" },
    ],
    category: "advanced",
    difficulty: "expert",
    seeAlso: ["systemctl", "tail", "dmesg"],
  },
  {
    name: "strace",
    description: "Trace system calls made by a process.",
    longDescription:
      "strace intercepts and records the system calls (kernel interactions) made by a running process. It is invaluable for debugging programs that fail silently — showing exactly which files they open, which signals they receive, and where they error.",
    usage: "strace [options] <command>",
    examples: [
      "strace ls",
      "strace -p 1234",
      "strace -e trace=open,read ls",
      "strace -o trace.log -f ./myapp",
    ],
    flags: [
      { flag: "-p PID", description: "Attach to an already-running process" },
      { flag: "-e trace=CALL", description: "Trace only specific syscalls" },
      { flag: "-o FILE", description: "Write output to FILE" },
      { flag: "-f", description: "Follow child processes (forks)" },
      { flag: "-c", description: "Print a count/summary of syscalls at the end" },
    ],
    category: "advanced",
    difficulty: "expert",
    seeAlso: ["ltrace", "lsof", "gdb"],
  },
  {
    name: "tcpdump",
    description: "Capture and analyze network packets.",
    longDescription:
      "tcpdump captures raw network traffic on an interface and prints or saves it for analysis. It is a fundamental network debugging tool. Captured files (.pcap) can be opened in Wireshark for GUI analysis.",
    usage: "tcpdump [options] [expression]",
    examples: [
      "tcpdump -i eth0",
      "tcpdump -i any port 80",
      "tcpdump -i eth0 host 192.168.1.1",
      "tcpdump -w capture.pcap -i eth0",
      "tcpdump -r capture.pcap",
    ],
    flags: [
      { flag: "-i IFACE", description: "Listen on interface IFACE" },
      { flag: "-w FILE", description: "Write raw packets to a .pcap file" },
      { flag: "-r FILE", description: "Read packets from a .pcap file" },
      { flag: "-n", description: "Do not resolve hostnames or port names" },
      { flag: "-v", description: "Verbose output" },
      { flag: "port N", description: "Filter by port number" },
      { flag: "host IP", description: "Filter by host IP address" },
    ],
    category: "networking",
    difficulty: "expert",
    seeAlso: ["wireshark", "ss", "nmap"],
  },
  {
    name: "nmap",
    description: "Network exploration and port scanner.",
    longDescription:
      "nmap scans hosts to discover open ports, running services, and OS fingerprints. It is widely used in network security auditing, penetration testing, and system administration. Only scan systems you have permission to scan.",
    usage: "nmap [options] <target>",
    examples: [
      "nmap 192.168.1.1",
      "nmap -sV 192.168.1.0/24",
      "nmap -p 22,80,443 server.com",
      "nmap -A -T4 server.com",
      "nmap -O server.com",
    ],
    flags: [
      { flag: "-sV", description: "Probe open ports to determine service/version" },
      { flag: "-p PORTS", description: "Scan specific ports or ranges" },
      { flag: "-A", description: "Enable OS detection, version, scripts, and traceroute" },
      { flag: "-T4", description: "Faster scan timing (T0=slowest, T5=fastest)" },
      { flag: "-O", description: "Enable OS detection" },
      { flag: "-Pn", description: "Skip host discovery (treat all hosts as up)" },
    ],
    category: "networking",
    difficulty: "expert",
    seeAlso: ["ss", "tcpdump", "netcat"],
  },
  {
    name: "dd",
    description: "Convert and copy data at a low level.",
    longDescription:
      "dd copies data between files or devices with precise control over block size, count, and conversions. It is used to create disk images, write ISOs to USB drives, wipe disks, and benchmark storage. Be extremely careful — a wrong of= target can overwrite a disk.",
    usage: "dd [options]",
    examples: [
      "dd if=/dev/sda of=backup.img bs=4M status=progress",
      "dd if=ubuntu.iso of=/dev/sdb bs=4M status=progress",
      "dd if=/dev/zero of=disk.img bs=1M count=100",
      "dd if=/dev/urandom of=/dev/sda bs=4M",
    ],
    flags: [
      { flag: "if=FILE", description: "Input file (use /dev/sda for a whole disk)" },
      { flag: "of=FILE", description: "Output file (DANGER: overwrites destination)" },
      { flag: "bs=N", description: "Block size (e.g., 4M for 4 megabytes)" },
      { flag: "count=N", description: "Copy only N input blocks" },
      { flag: "status=progress", description: "Show transfer progress in real time" },
    ],
    category: "disk-storage",
    difficulty: "expert",
    seeAlso: ["cp", "rsync", "fdisk"],
  },
  {
    name: "jq",
    description: "Process and query JSON data from the command line.",
    longDescription:
      "jq is a lightweight JSON processor that lets you slice, filter, and transform JSON data with a simple expression language. It is indispensable when working with REST APIs or JSON configuration files in shell scripts.",
    usage: "jq [options] '<filter>' [file]",
    examples: [
      "cat data.json | jq '.'",
      "curl -s https://api.example.com | jq '.name'",
      "cat data.json | jq '.users[0].email'",
      "cat data.json | jq '.users[] | select(.active == true)'",
      "cat data.json | jq -r '.items[].name'",
    ],
    flags: [
      { flag: "-r", description: "Raw output — print strings without JSON quotes" },
      { flag: "-c", description: "Compact output (no pretty-print)" },
      { flag: "-s", description: "Slurp — read all input into an array" },
      { flag: "-e", description: "Set exit status based on whether filter output is true" },
    ],
    category: "text-processing",
    difficulty: "expert",
    seeAlso: ["curl", "awk", "python3 -m json.tool"],
  },
  {
    name: "nc",
    description: "Netcat — read and write data over network connections.",
    longDescription:
      "nc (netcat) is often called the TCP/IP Swiss-army knife. It can open raw TCP/UDP connections, listen on ports, scan ports, transfer files, and serve as a simple chat server. It is fundamental for network debugging and security testing.",
    usage: "nc [options] <host> <port>",
    examples: [
      "nc google.com 80",
      "nc -l 9999",
      "echo 'hello' | nc server.com 9999",
      "nc -zv server.com 22",
      "nc -l 9999 > received_file",
    ],
    flags: [
      { flag: "-l", description: "Listen mode — wait for incoming connections" },
      { flag: "-v", description: "Verbose — report connection status" },
      { flag: "-z", description: "Zero-I/O mode — just scan, don't send data" },
      { flag: "-u", description: "Use UDP instead of TCP" },
      { flag: "-p PORT", description: "Specify source port" },
    ],
    category: "networking",
    difficulty: "expert",
    aliases: ["netcat"],
    seeAlso: ["ssh", "curl", "nmap"],
  },
  {
    name: "iptables",
    description: "Configure Linux kernel firewall rules.",
    longDescription:
      "iptables manages netfilter firewall rules in the Linux kernel. Rules are organized into chains (INPUT, OUTPUT, FORWARD) within tables (filter, nat, mangle). On modern systems, nftables or firewalld may be preferred, but iptables knowledge remains essential.",
    usage: "iptables [options] [chain] [rule]",
    examples: [
      "iptables -L -n -v",
      "iptables -A INPUT -p tcp --dport 22 -j ACCEPT",
      "iptables -A INPUT -p tcp --dport 80 -j ACCEPT",
      "iptables -A INPUT -j DROP",
      "iptables-save > rules.v4",
    ],
    flags: [
      { flag: "-L", description: "List all rules in a chain" },
      { flag: "-A CHAIN", description: "Append a rule to a chain" },
      { flag: "-D CHAIN", description: "Delete a rule from a chain" },
      { flag: "-p PROTO", description: "Match protocol (tcp, udp, icmp)" },
      { flag: "--dport PORT", description: "Match destination port" },
      { flag: "-j TARGET", description: "Target action: ACCEPT, DROP, REJECT, LOG" },
      { flag: "-n", description: "Numeric output — skip name lookups" },
      { flag: "-v", description: "Verbose — show packet and byte counters" },
    ],
    category: "networking",
    difficulty: "expert",
    seeAlso: ["nftables", "firewalld", "ufw", "ss"],
  },
  {
    name: "mount",
    description: "Attach a filesystem to the directory tree.",
    longDescription:
      "mount makes a filesystem (on a disk, partition, ISO, or network share) accessible at a chosen directory (the mount point). The reverse operation is umount. Persistent mounts are configured in /etc/fstab.",
    usage: "mount [options] <device> <mountpoint>",
    examples: [
      "mount /dev/sdb1 /mnt/usb",
      "mount -o ro /dev/sdb1 /mnt/usb",
      "mount -t nfs 192.168.1.10:/share /mnt/share",
      "mount -o loop ubuntu.iso /mnt/iso",
      "mount",
    ],
    flags: [
      { flag: "-t TYPE", description: "Filesystem type (ext4, nfs, vfat, etc.)" },
      { flag: "-o OPTIONS", description: "Mount options (ro=read-only, rw, loop, etc.)" },
      { flag: "-a", description: "Mount all filesystems listed in /etc/fstab" },
    ],
    category: "disk-storage",
    difficulty: "expert",
    seeAlso: ["umount", "df", "lsblk", "fdisk"],
  },
  {
    name: "ulimit",
    description: "Set or report resource limits for shell processes.",
    longDescription:
      "ulimit controls resource limits imposed on processes started by the shell — such as maximum open files, stack size, or CPU time. Adjusting these is important for high-performance services (e.g., raising the open-file limit for a web server).",
    usage: "ulimit [options] [limit]",
    examples: [
      "ulimit -a",
      "ulimit -n 65535",
      "ulimit -s unlimited",
      "ulimit -u 100",
    ],
    flags: [
      { flag: "-a", description: "Show all current limits" },
      { flag: "-n", description: "Maximum number of open file descriptors" },
      { flag: "-s", description: "Stack size limit" },
      { flag: "-u", description: "Maximum number of user processes" },
      { flag: "-c", description: "Maximum core dump file size" },
      { flag: "-H", description: "Set the hard limit" },
      { flag: "-S", description: "Set the soft limit" },
    ],
    category: "advanced",
    difficulty: "expert",
    seeAlso: ["systemctl", "limits.conf", "prlimit"],
  },
  {
    name: "trap",
    description: "Handle shell signals and cleanup in scripts.",
    longDescription:
      "trap registers a command (usually a cleanup function) to be executed when the shell receives a signal or exits. This is critical for writing robust shell scripts that clean up temporary files and resources even when interrupted.",
    usage: "trap 'command' [signals]",
    examples: [
      "trap 'echo Interrupted; exit' INT TERM",
      "trap 'rm -f /tmp/mytemp' EXIT",
      "trap '' INT",
    ],
    category: "shell-scripting",
    difficulty: "expert",
    seeAlso: ["kill", "signal", "bash scripting"],
  },
];

export const commandsByDifficulty = {
  beginner: commandLibrary.filter((c) => c.difficulty === "beginner"),
  intermediate: commandLibrary.filter((c) => c.difficulty === "intermediate"),
  expert: commandLibrary.filter((c) => c.difficulty === "expert"),
};

export const commandsByCategory = commandLibrary.reduce<Record<CommandCategory, CommandEntry[]>>(
  (acc, entry) => {
    (acc[entry.category] ??= []).push(entry);
    return acc;
  },
  {} as Record<CommandCategory, CommandEntry[]>,
);

export function lookupCommand(name: string): CommandEntry | undefined {
  return commandLibrary.find(
    (c) => c.name === name || c.aliases?.includes(name),
  );
}
