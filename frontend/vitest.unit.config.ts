
/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
    plugins: [react()],
    test: {
        browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
                {
                    browser: "chromium",
                },
            ],
        },
    },
});
