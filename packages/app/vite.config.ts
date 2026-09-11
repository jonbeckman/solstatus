import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vite"
import { SAMPLE_MONITORS } from "./src/dev/sample-monitors"

const __dirname = dirname(fileURLToPath(import.meta.url))

type SampleMonitor = (typeof SAMPLE_MONITORS)[number]

function sampleCheck(endpointMonitorId: string, minutesAgo: number) {
  const timestamp = new Date(Date.now() - minutesAgo * 60_000)
  return {
    id: minutesAgo,
    endpointMonitorId,
    timestamp,
    status: 200,
    responseTime: 80 + minutesAgo,
    isExpectedStatus: true,
  }
}

function cloudflareWorkersStubPlugin(): Plugin {
  return {
    name: "solstatus-cloudflare-workers-stub",
    resolveId(id) {
      if (id === "cloudflare:workers" && process.env.SOLSTATUS_DEV_MOCK_API === "1") {
        return resolve(__dirname, "src/dev/cloudflare-workers-stub.ts")
      }
      return undefined
    },
  }
}

function mockApiPlugin(): Plugin {
  const monitors: SampleMonitor[] = SAMPLE_MONITORS.map((monitor) => ({ ...monitor }))

  return {
    name: "solstatus-dev-mock-api",
    configureServer(server) {
      server.middlewares.use("/api", (req, res, next) => {
        if (process.env.SOLSTATUS_DEV_MOCK_API !== "1") {
          next()
          return
        }

        const url = new URL(req.url ?? "/", "http://localhost")
        const pathname = url.pathname
        res.setHeader("content-type", "application/json")

        const send = (body: unknown, status = 200) => {
          res.statusCode = status
          res.end(JSON.stringify(body))
        }

        if (req.method === "GET" && pathname === "/infra-metadata") {
          send({
            cloudflareAccountId: "00000000000000000000000000000000",
            monitorExecName: "solstatus-dev-monitor-exec",
            monitorTriggerName: "solstatus-dev-monitor-trigger",
          })
          return
        }

        if (req.method === "GET" && pathname === "/endpoint-monitors") {
          send({
            data: monitors,
            totalCount: monitors.length,
          })
          return
        }

        if (req.method === "GET" && pathname === "/endpoint-monitors/stats") {
          send({
            totalEndpointMonitors: monitors.length,
            sitesWithAlerts: monitors.filter((monitor) => monitor.activeAlert).length,
            highestResponseTime: 120,
            highestResponseTimeWebsiteId: monitors[0]?.id ?? null,
            uptimePercentage: 100,
          })
          return
        }

        if (req.method === "POST" && pathname === "/endpoint-monitors") {
          let raw = ""
          req.on("data", (chunk) => {
            raw += chunk
          })
          req.on("end", () => {
            const body = JSON.parse(raw || "{}") as Partial<SampleMonitor>
            const created: SampleMonitor = {
              id: `endp_${Date.now().toString(36)}`,
              url: body.url ?? "https://example.com",
              name: body.name ?? "New monitor",
              checkInterval: body.checkInterval ?? 60,
              isRunning: true,
              expectedStatusCode: body.expectedStatusCode ?? 200,
              consecutiveFailures: 0,
              alertThreshold: body.alertThreshold ?? 2,
              activeAlert: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            monitors.unshift(created)
            send(created, 201)
          })
          return
        }

        const idMatch = pathname.match(/^\/endpoint-monitors\/([^/]+)(?:\/(.*))?$/)
        if (idMatch) {
          const id = decodeURIComponent(idMatch[1])
          const rest = idMatch[2] ?? ""
          const monitor = monitors.find((item) => item.id === id)
          if (!monitor) {
            send({ message: "Not Found" }, 404)
            return
          }

          if (req.method === "GET" && rest === "") {
            send(monitor)
            return
          }
          if (req.method === "GET" && rest === "uptime") {
            send(sampleCheck(id, 1))
            return
          }
          if (req.method === "GET" && rest === "uptime/range") {
            send([sampleCheck(id, 20), sampleCheck(id, 10), sampleCheck(id, 1)])
            return
          }
          if (req.method === "GET" && rest === "execute-check") {
            send({ message: "ok" })
            return
          }
        }

        next()
      })
    },
  }
}

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
    plugins: [
      cloudflareWorkersStubPlugin(),
      mockApiPlugin(),
      tailwindcss(),
      tanstackStart(),
      react(),
    ],
  }
})
