/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "../cmd/server/dist",
		emptyOutDir: true,
	},
	server: {
		host: true, // Listen on all addresses
		proxy: {
			"/api": {
				target: "http://localhost:8080",
				changeOrigin: true,
			},
			"/ws": {
				target: "ws://localhost:8080",
				ws: true,
				changeOrigin: true,
			},
		},
	},
	// test: {
	// 	projects: [
	// 		{
	// 			extends: true,
	// 			plugins: [
	// 				// The plugin will run tests for the stories defined in your Storybook config
	// 				// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
	// 				// storybookTest({
	// 				// 	configDir: path.join(dirname, ".storybook"),
	// 				// }),
	// 			],
	// 			test: {
	// 				name: "storybook",
	// 				browser: {
	// 					enabled: true,
	// 					headless: true,
	// 					// provider: playwright({}),
	// 					instances: [
	// 						{
	// 							browser: "chromium",
	// 						},
	// 					],
	// 				},
	// 				setupFiles: [".storybook/vitest.setup.ts"],
	// 			},
	// 		},
	// 	],
	// },
});
