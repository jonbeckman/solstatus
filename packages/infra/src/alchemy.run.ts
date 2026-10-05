import * as Alchemy from "alchemy"
import * as Effect from "effect/Effect"
import { SolStatus, type SolStatusOutput } from "./solstatus"
import { stackOptions } from "./stack-options"

export class SolStatusStack extends Alchemy.Stack<SolStatusStack, SolStatusOutput>()("SolStatus") {}

export const SolStatusProgram = Effect.gen(function* () {
  const appName = process.env.APP_NAME || "solstatus"
  const stage = process.env.ALCHEMY_STAGE || process.env.STAGE || "dev"
  const cloudflareAccountId =
    process.env.CLOUDFLARE_ACCOUNT_ID || "00000000000000000000000000000000"
  return yield* SolStatus(`${appName}-${stage}`, {
    stage,
    fqdn: process.env.FQDN,
    cloudflareAccountId,
  })
})

type SolStatusServices = Effect.Services<typeof SolStatusProgram>

export function makeSolStatusStack() {
  return SolStatusStack.make(stackOptions<SolStatusServices>(), SolStatusProgram.pipe(Effect.orDie))
}

export default makeSolStatusStack()
