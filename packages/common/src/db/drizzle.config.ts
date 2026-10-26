import "dotenv/config"
import { relative, resolve } from "node:path"
import { type Config, defineConfig } from "drizzle-kit"

export const createDatabaseConfig = (
  databaseId: string,
  accountId: string,
  token: string,
): Config => {
  console.log("databaseId", databaseId)

  return defineConfig({
    // Work around https://github.com/drizzle-team/drizzle-orm/issues/3217
    out: relative("./", resolve(__dirname, "migrations")),
    schema: resolve(__dirname, "schema"),

    dialect: "sqlite",
    driver: "d1-http",
    dbCredentials: {
      databaseId,
      accountId,
      token,
    },
  })
}
