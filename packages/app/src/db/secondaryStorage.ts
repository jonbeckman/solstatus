import { env } from "cloudflare:workers"
import type { SecondaryStorage } from "better-auth"

async function putWithTtl(key: string, value: string, ttl?: number) {
  if (ttl) {
    await env.SESSIONS_KV.put(key, value, { expirationTtl: ttl })
  } else {
    await env.SESSIONS_KV.put(key, value)
  }
}

export const secondaryStorage: SecondaryStorage = {
  async get(key) {
    return await env.SESSIONS_KV.get(key)
  },
  async getAndDelete(key) {
    const value = await env.SESSIONS_KV.get(key)

    if (value !== null) {
      await env.SESSIONS_KV.delete(key)
    }

    return value
  },
  async increment(key, ttl) {
    const current = await env.SESSIONS_KV.get(key)
    const next = (current ? Number.parseInt(current, 10) : 0) + 1
    await putWithTtl(key, String(next), ttl)

    return next
  },
  async set(key, value, ttl) {
    await putWithTtl(key, value, ttl)
  },
  async delete(key) {
    await env.SESSIONS_KV.delete(key)
  },
}
