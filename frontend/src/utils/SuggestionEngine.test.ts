import { describe, it, expect } from "vitest";
import { getSuggestions } from "./SuggestionEngine";

describe("SuggestionEngine", () => {
    const mockHistory = [
        "git status",
        "ls -la",
        "docker ps",
        "cd /tmp"
    ];

    it("should return history only when input is empty", () => {
        const result = getSuggestions("", mockHistory);
        // Should contain history
        expect(result.some(s => s.type === "history")).toBe(true);
        // Should ALSO contain top-level static (e.g. git, docker)
        expect(result.some(s => s.type === "static" && s.text === "git")).toBe(true);
    });

    it("should suggest top-level static commands and match prefix", () => {
        const result = getSuggestions("g", mockHistory);
        expect(result.some(s => s.type === "static" && s.text === "git")).toBe(true);
        expect(result.some(s => s.type === "static" && s.text === "go")).toBe(true);
    });

    it("should return static suggestions for known command when there is a space", () => {
        const result = getSuggestions("git ", mockHistory);
        // Expect static suggestions for git subcommands
        expect(result.some(s => s.type === "static" && s.text === "status")).toBe(true);
        expect(result.some(s => s.type === "static" && s.text === "commit")).toBe(true);
    });

    it("should filter static subcommands based on partial argument", () => {
        const result = getSuggestions("git pu", mockHistory);
        expect(result.some(s => s.type === "static" && s.text === "push")).toBe(true);
        expect(result.some(s => s.type === "static" && s.text === "pull")).toBe(true);
        expect(result.some(s => s.text === "status")).toBe(false);
    });

    it("should match history prefix", () => {
        const result = getSuggestions("doc", mockHistory);
        expect(result).toEqual([
            { text: "docker", type: "static" },
            { text: "docker ps", type: "history" }
        ]);
    });

    it("should mix history and static", () => {
        // history has "git status"
        // static has "status", "commit" etc.
        const result = getSuggestions("git s", mockHistory);

        // Static "status" matches "s"
        // History "git status" matches "git s"
        const hasHistory = result.some(s => s.type === "history" && s.text === "git status");
        const hasStatic = result.some(s => s.type === "static" && s.text === "status");

        expect(hasHistory).toBe(true);
        expect(hasStatic).toBe(true);
    });
});
