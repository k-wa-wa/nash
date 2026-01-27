export interface Suggestion {
    text: string;
    type: "history" | "static";
}

const STATIC_SUGGESTIONS: Record<string, string[]> = {
    git: [
        "status",
        "commit",
        "push",
        "pull",
        "checkout",
        "branch",
        "log",
        "diff",
        "add .",
    ],
    docker: ["ps", "images", "run", "stop", "rm", "rmi", "compose up", "exec"],
    kubectl: ["get pods", "describe", "logs", "exec", "apply -f", "delete"],
    npm: ["install", "run", "run dev", "run build", "test", "start"],
    yarn: ["install", "dev", "build", "test", "start", "add"],
    pnpm: ["install", "dev", "build", "test", "start", "add"],
    go: ["run .", "build", "test ./...", "mod tidy", "get"],
    cargo: ["run", "build", "test", "check", "add"],
};

export function parseHistoryCommands(historyData: string): string[] {
    if (!historyData) return [];

    const lines = historyData.split("\n");
    const uniqueCommands = new Set<string>();
    const commands: string[] = [];

    // Reverse to process latest commands first
    for (let i = lines.length - 1; i >= 0; i--) {
        let line = lines[i].trim();
        if (!line) continue;

        // Handle zsh history format: ": 1674820000:0;command"
        const zshPrefixRegex = /^:\s\d+:\d+;/;
        if (zshPrefixRegex.test(line)) {
            line = line.replace(zshPrefixRegex, "");
        }

        line = line.trim();
        if (!line) continue;

        // Strip env vars
        while (true) {
            const envRegex = /^([a-zA-Z_][a-zA-Z0-9_]*=[^\s]+)\s+/;
            const match = line.match(envRegex);
            if (match) {
                line = line.substring(match[0].length).trim();
            } else {
                break;
            }
        }

        // Store full valid line for history suggestions
        if (line && !uniqueCommands.has(line)) {
            uniqueCommands.add(line);
            commands.push(line);
        }
    }

    return commands;
}

export function getSuggestions(
    input: string,
    history: string[],
): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const trimmedInput = input.trim();

    // 1. Static Suggestions (Subcommands)
    // Extract the main command from input "git commit" -> "git"
    const parts = trimmedInput.split(/\s+/);
    const cmdName = parts[0];

    if (cmdName && STATIC_SUGGESTIONS[cmdName]) {
        const subcommands = STATIC_SUGGESTIONS[cmdName];
        // If input has just command "git", suggest all
        // If input has "git s", suggest "status"
        const currentArg = parts.length > 1 ? parts[parts.length - 1] : "";
        // Only if we typed a space after command, or we are typing arguments
        if (input.includes(" ")) {
            const matches = subcommands.filter(sub => sub.startsWith(currentArg));
            matches.slice(0, 3).forEach(sub => {
                suggestions.push({ text: sub, type: "static" });
            });
        }
    }

    // 2. History Suggestions
    // If input is empty, show recent history
    if (trimmedInput === "") {
        history.slice(0, 3).forEach((cmd) => {
            suggestions.push({ text: cmd, type: "history" });
        });
    } else {
        // If input exists, show matching history
        const matches = history.filter((cmd) => cmd.startsWith(trimmedInput) && cmd !== trimmedInput);
        matches.slice(0, 3).forEach((cmd) => {
            suggestions.push({ text: cmd, type: "history" });
        });
    }

    // Deduplicate logic just in case
    const unique = new Map<string, Suggestion>();
    suggestions.forEach(s => { unique.set(s.text, s); });

    return Array.from(unique.values()).slice(0, 6);
}
