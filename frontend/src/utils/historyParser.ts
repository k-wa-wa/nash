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
        // Regex explanation:
        // ^: start of line
        // :\s\d+:\d+;: matches the zsh timestamp prefix like ": 1234567890:0;"
        const zshPrefixRegex = /^:\s\d+:\d+;/;
        if (zshPrefixRegex.test(line)) {
            line = line.replace(zshPrefixRegex, "");
        }

        // Clean up line
        line = line.trim();
        if (!line) continue;

        // Strip common environment variable prefixes (simple naive approach)
        // e.g. "VAR=val cmd" -> "cmd"
        // We iterate until no environment variable assignment is found at the start
        while (true) {
            // Matches "KEY=VALUE " at the start
            // limit simple vars [a-zA-Z_]+
            const envRegex = /^([a-zA-Z_][a-zA-Z0-9_]*=[^\s]+)\s+/;
            const match = line.match(envRegex);
            if (match) {
                line = line.substring(match[0].length).trim();
            } else {
                break;
            }
        }

        // Extract command only (first word)
        const parts = line.split(/\s+/);
        const cmd = parts[0];

        if (cmd && !uniqueCommands.has(cmd)) {
            uniqueCommands.add(cmd);
            commands.push(cmd);
        }

        if (commands.length >= 5) {
            break;
        }
    }

    return commands;
}
