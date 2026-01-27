import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true, // Enable globals for jest-dom compatibility
        environment: "jsdom",
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        exclude: ["src/**/*.spec.ts"],
    },
});
