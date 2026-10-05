#!/usr/bin/env tsx

import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import fs from "node:fs"
import path, { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { NodeRuntime, NodeServices } from "@effect/platform-node"
import dotenv from "dotenv"
import { Console, Effect, Option } from "effect"
import { Command, Flag } from "effect/cli"
import packageJson from "../package.json" with { type: "json" }

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = path.resolve(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const appendEnvValue = (key: string, value: string) => {
  let envContent = ""
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8")
  }
  if (envContent && !envContent.endsWith("\n")) {
    envContent += "\n"
  }
  envContent += `${key}="${value}"\n`
  fs.writeFileSync(envPath, envContent)
}

const alchemyCommandByPhase = {
  up: "deploy",
  deploy: "deploy",
  destroy: "destroy",
  read: "plan",
  plan: "plan",
  dev: "dev",
} as const

const main = Command.make(
  "solstatus",
  {
    cloudflareAccountId: Flag.String("cloudflare-account-id").pipe(
      Flag.optional,
      Flag.withDescription("Cloudflare Account ID"),
    ),
    cloudflareApiToken: Flag.String("cloudflare-api-token").pipe(
      Flag.optional,
      Flag.withDescription("Cloudflare API Token"),
    ),
    secretAlchemyPassphrase: Flag.String("secret-alchemy-passphrase").pipe(
      Flag.optional,
      Flag.withDescription("Alchemy Passphrase for state secrets"),
    ),
    betterAuthSecret: Flag.String("better-auth-secret").pipe(
      Flag.optional,
      Flag.withDescription("Better Auth Secret for authentication"),
    ),
    stage: Flag.String("stage").pipe(
      Flag.withDefault("dev"),
      Flag.withDescription("Deployment stage (default: dev)"),
    ),
    phase: Flag.Literals("phase", ["destroy", "up", "read", "deploy", "plan", "dev"]).pipe(
      Flag.withDefault("up" as const),
      Flag.withDescription("Phase to execute (up/deploy, destroy, read/plan, dev)"),
    ),
    quiet: Flag.Boolean("quiet").pipe(
      Flag.withDefault(false),
      Flag.withDescription("Run in quiet mode"),
    ),
    appName: Flag.String("app-name").pipe(
      Flag.withDefault("solstatus"),
      Flag.withDescription("Application name (default: solstatus)"),
    ),
    fqdn: Flag.String("fqdn").pipe(
      Flag.optional,
      Flag.withDescription(
        "Fully qualified domain name (optional - if not provided, a worker URL will be generated)",
      ),
    ),
  },
  (config) =>
    Effect.gen(function* () {
      const accountId =
        Option.getOrUndefined(config.cloudflareAccountId) ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? ""
      const apiToken =
        Option.getOrUndefined(config.cloudflareApiToken) ?? process.env.CLOUDFLARE_API_TOKEN ?? ""

      if (!accountId || !apiToken) {
        yield* Console.error(
          "Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be provided via CLI flags, .env file, or environment variables",
        )
        return yield* Effect.fail(1)
      }

      let secretAlchemyPassphrase =
        Option.getOrUndefined(config.secretAlchemyPassphrase) ??
        process.env.SECRET_ALCHEMY_PASSPHRASE ??
        ""

      if (!secretAlchemyPassphrase) {
        secretAlchemyPassphrase = randomBytes(16).toString("hex")
        yield* Console.log(
          "🔑 No --secret-alchemy-passphrase or env.SECRET_ALCHEMY_PASSPHRASE provided. Generating new passphrase...",
        )
        appendEnvValue("SECRET_ALCHEMY_PASSPHRASE", secretAlchemyPassphrase)
        yield* Console.log(`✅ Generated and saved new passphrase to ${envPath}`)
      }

      let betterAuthSecret =
        Option.getOrUndefined(config.betterAuthSecret) ?? process.env.BETTER_AUTH_SECRET ?? ""

      if (!betterAuthSecret) {
        betterAuthSecret = randomBytes(16).toString("hex")
        yield* Console.log(
          "🔑 No --better-auth-secret or env.BETTER_AUTH_SECRET provided. Generating new secret...",
        )
        appendEnvValue("BETTER_AUTH_SECRET", betterAuthSecret)
        yield* Console.log(`✅ Generated and saved new secret to ${envPath}`)
      }

      const fqdnValue = Option.getOrUndefined(config.fqdn) ?? ""
      const env = {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: accountId,
        CLOUDFLARE_API_TOKEN: apiToken,
        ALCHEMY_STATE_TOKEN: apiToken,
        SECRET_ALCHEMY_PASSPHRASE: secretAlchemyPassphrase,
        BETTER_AUTH_SECRET: betterAuthSecret,
        APP_NAME: config.appName,
        STAGE: config.stage,
        ALCHEMY_STAGE: config.stage,
        ...(fqdnValue && { FQDN: fqdnValue }),
      }

      const alchemyRunPath = path.join(__dirname, "../packages/infra/src/alchemy.run.ts")
      const alchemyCommand = alchemyCommandByPhase[config.phase]
      const args = [alchemyCommand, alchemyRunPath, "--stage", config.stage]
      if (config.quiet) {
        args.push("--quiet")
      }

      try {
        execFileSync("nub", ["exec", "alchemy", ...args], {
          env,
          stdio: "inherit",
          cwd: path.join(__dirname, ".."),
        })
        yield* Console.log("\n✅ Command executed successfully")
      } catch (error) {
        yield* Console.error(`\n❌ Command failed: ${error}`)
        return yield* Effect.fail(1)
      }
    }),
).pipe(
  Command.withDescription("CLI wrapper for SolStatus infrastructure. Uses Effect 4 `effect/cli`."),
)

Command.run(main, {
  version: packageJson.version,
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain)
