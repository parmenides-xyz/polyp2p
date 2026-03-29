import path from "node:path";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [tailwind(), react()],
    resolve: {
        alias: {
            "#": path.resolve(__dirname, "src"),
        },
    },
    server: {
        proxy: {
            "/clob": {
                target: "https://clob.polymarket.com",
                changeOrigin: true,
                rewrite: (p) => p.replace(/^\/clob/, ""),
            },
        },
    },
});
