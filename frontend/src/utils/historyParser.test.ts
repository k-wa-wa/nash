import { describe, it, expect } from "vitest";
import { parseHistoryCommands } from "./historyParser";

describe("parseHistoryCommands", () => {
    it("should parse simple bash history", () => {
        const history = `
ls -la
cd /tmp
git status
docker ps
kubectl get pods
`;
        // Expected reverse order: kubectl, docker, git, cd, ls
        const result = parseHistoryCommands(history);
        expect(result).toEqual(["kubectl", "docker", "git", "cd", "ls"]);
    });

    it("should parse zsh extended history", () => {
        const history = `
: 1674820000:0;ls -la
: 1674820001:0;cd project
: 1674820002:0;vim main.go
`;
        const result = parseHistoryCommands(history);
        expect(result).toEqual(["vim", "cd", "ls"]);
    });

    it("should dedup commands", () => {
        const history = `
ls
cd
ls
git status
ls -la
`;
        // ls is repeated. Latest (bottom) `ls` is processed first.
        // Reverse: ls -la -> ls. git status -> git. ls -> skip. cd -> cd. ls -> skip.
        const result = parseHistoryCommands(history);
        expect(result).toEqual(["ls", "git", "cd"]);
    });

    it("should strip environment variables", () => {
        const history = `
FOO=bar ls -la
GOOS=linux GOARCH=amd64 go build
`;
        const result = parseHistoryCommands(history);
        expect(result).toEqual(["go", "ls"]);
    });

    it("should handle empty lines and whitespace", () => {
        const history = `
        
   ls   
   
        `;
        const result = parseHistoryCommands(history);
        expect(result).toEqual(["ls"]);
    });
});
