import fs from "node:fs"
import path from "node:path"
import { createClient } from "@libsql/client"
import { schema } from "@solstatus/common/db/schema"
import type { uptimeChecksInsertSchema } from "@solstatus/common/db/zod-schema"
import { createId, PRE_ID } from "@solstatus/common/utils/ids"
import { drizzle } from "drizzle-orm/libsql"
import { reset } from "drizzle-seed"
import type { z } from "zod"

// List of 23 predefined URLs for endpointMonitors
const endpointMonitorUrls = [
  "https://cloudflare.com",
  "https://workers.cloudflare.com",
  "https://developers.cloudflare.com",
  "https://pages.cloudflare.com",
  "https://dash.cloudflare.com",
  "https://blog.cloudflare.com",
  "https://community.cloudflare.com",
  "https://www.google.com",
  "https://www.github.com",
  "https://www.microsoft.com",
  "https://www.amazon.com",
  "https://www.netflix.com",
  "https://www.twitter.com",
  "https://www.facebook.com",
  "https://www.instagram.com",
  "https://www.linkedin.com",
  "https://www.reddit.com",
  "https://www.wikipedia.org",
  "https://www.apple.com",
  "https://www.youtube.com",
  "https://www.twitch.tv",
  "https://www.discord.com",
  "https://www.slack.com",
]

// Check intervals in seconds
const checkIntervals = [30, 60, 120]

const seedDatabase = async () => {
  const pathToDb = getLocalD1DB()
  if (!pathToDb) {
    console.error("❌ Could not find local D1 database")
    process.exit(1)
  }

  const client = createClient({
    url: `file:${pathToDb}`,
  })
  const db = drizzle({ client })

  console.log("Resetting database...")
  await reset(db, schema)

  console.log("Seeding database...")
  try {
    console.log("Seeding endpointMonitors...")
    // Create 23 endpointMonitors with predefined URLs
    const seedEndpointMonitors = endpointMonitorUrls.map((url) => {
      const domain = new URL(url).hostname.replace("www.", "")
      return {
        id: createId(PRE_ID.endpointMonitor),
        url: url,
        name: `${domain.charAt(0).toUpperCase() + domain.slice(1)}`,
        checkInterval: checkIntervals[Math.floor(Math.random() * checkIntervals.length)],
      }
    })
    await db.insert(schema.EndpointMonitorsTable).values(seedEndpointMonitors)

    console.log("Seeding uptime checks...")
    // Create historical uptime checks for each endpointMonitor
    const now = new Date()
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) // 2 weeks ago

    for (const endpointMonitor of seedEndpointMonitors) {
      const checksToCreate = Math.floor(Math.random() * 201) + 100 // Random number between 100-300
      const timeSpan = now.getTime() - twoWeeksAgo.getTime()
      const checksPerInterval = timeSpan / (endpointMonitor.checkInterval * 1000)
      const skipFactor = Math.floor(checksPerInterval / checksToCreate)

      const uptimeChecks: z.infer<typeof uptimeChecksInsertSchema>[] = Array.from(
        { length: checksToCreate },
        (_, i) => {
          const timestamp = new Date(
            twoWeeksAgo.getTime() + i * skipFactor * endpointMonitor.checkInterval * 1000,
          )

          // 95% chance of success
          const isSuccess = Math.random() < 0.95

          // 100-1000ms for success, 15000 second timeout for failure
          const responseTime = isSuccess ? Math.floor(Math.random() * 900) + 100 : 15000

          return {
            endpointMonitorId: endpointMonitor.id,
            timestamp,
            isExpectedStatus: isSuccess,
            status: isSuccess ? 200 : 504,
            responseTime,
          }
        },
      )

      // Insert checks in chunks to avoid SQLite limits
      const chunkSize = 100
      for (let i = 0; i < uptimeChecks.length; i += chunkSize) {
        const chunk = uptimeChecks.slice(i, i + chunkSize)
        await db.insert(schema.UptimeChecksTable).values(chunk)
      }
    }

    console.log("✅ Database seeded successfully!")
  } catch (error) {
    console.error("❌ Error seeding database:", error)
  } finally {
    client.close()
  }
}

seedDatabase()

function getLocalD1DB() {
  try {
    // API local workers persist D1 at packages/infra/.wrangler/state
    // (`wrangler dev --persist-to=../infra/.wrangler/state` from @solstatus/api).
    // db:create / db:migrate use the same persist-to. Alchemy `infra:dev` stores a
    // separate local D1 under .alchemy/local and is not used here.
    const basePath = path.resolve(import.meta.dirname, "../.wrangler")
    const files = fs
      .readdirSync(basePath, { encoding: "utf-8", recursive: true })
      .filter((f) => f.endsWith(".sqlite"))

    files.sort((a, b) => {
      const statA = fs.statSync(path.join(basePath, a))
      const statB = fs.statSync(path.join(basePath, b))
      return statB.mtime.getTime() - statA.mtime.getTime()
    })
    const dbFile = files[0]

    if (!dbFile) {
      throw new Error(`.sqlite file not found in ${basePath}`)
    }

    return path.resolve(basePath, dbFile)
  } catch (err) {
    if (err instanceof Error) {
      console.log(`Error resolving local D1 DB: ${err.message}`)
    } else {
      console.log(`Error resolving local D1 DB: ${err}`)
    }
    return null
  }
}
