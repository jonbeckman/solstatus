const baseUrl = process.env.E2E_APP_URL ?? "http://127.0.0.1:3000"

export function apiUrl(path: string) {
  return new URL(path, baseUrl).toString()
}

export async function request(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), {
    ...init,
    headers: {
      accept: "application/json",
      ...init?.headers,
    },
  })
}

export async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init)
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`)
  }
  // SAFETY: callers declare the expected JSON shape for the endpoint under test.
  return (await response.json()) as T
}
