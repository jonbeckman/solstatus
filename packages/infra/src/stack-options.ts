import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"

export function stackOptions<Req = never>(
  input: Partial<Pick<Alchemy.StackProps<Req>, "providers" | "state">> = {},
): Alchemy.StackProps<Req> {
  // SAFETY: Cloudflare.providers() and Alchemy.localState() build this stack's layers.
  // Their concrete Layer requirements do not unify with generic StackProps<Req>.
  return {
    providers: (input.providers ?? Cloudflare.providers()) as Alchemy.StackProps<Req>["providers"],
    state: (input.state ?? Alchemy.localState()) as Alchemy.StackProps<Req>["state"],
  }
}
