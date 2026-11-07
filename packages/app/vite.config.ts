import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(async () => {
  const [{ default: react }, { tanstackStart }, { default: tailwindcss }] = await Promise.all([
    import("@vitejs/plugin-react"),
    import("@tanstack/react-start/plugin/vite"),
    import("@tailwindcss/vite"),
  ])

  return {
    envPrefix: ["VITE_"],
    server: {
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    build: {
      rollupOptions: {
        external: ["cloudflare:workers"],
      },
    },
    plugins: [tailwindcss(), tanstackStart(), react()],
  }
})
