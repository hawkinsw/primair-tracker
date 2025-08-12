import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
	base: "./",
	plugins: [react()],
	resolve: {
		alias: {
			"~bootstrap": path.resolve(__dirname, "node_modules/bootstrap"),
		},
	},
});
