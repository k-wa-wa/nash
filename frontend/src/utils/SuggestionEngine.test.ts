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
        expect(result).toEqual([
            { text: "git status", type: "history" },
            { text: "ls -la", type: "history" },
            { text: "docker ps", type: "history" }
        ]);
    });

    it("should return static suggestions for known command", () => {
        const result = getSuggestions("git ", mockHistory);
        // Expect static suggestions for git
        expect(result.some(s => s.type === "static" && s.text === "status")).toBe(true);
    });

    it("should match history prefix", () => {
        const result = getSuggestions("doc", mockHistory);
        expect(result).toEqual([
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
