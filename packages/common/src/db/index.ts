import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1"

export * from "./zod-schema"

export function useDrizzle(D1: D1Database): DrizzleD1Database {
  return drizzle(D1)
}

//TODO: Add an error parameter to the function
export const takeUniqueOrThrow = <T>(values: T[]): T => {
  if (values.length < 1) {
    throw new Error("No values found")
  }

  if (values.length > 1) {
    throw new Error(`Found non unique value of size [${values.length}]`)
  }

  const value = values[0]

  if (!value) {
    throw new Error("Found nonexistent value")
  }

  return value
}

export const takeFirstOrNull = <T>(values: T[]): T | null => {
  if (values.length < 1) {
    return null
  }

  if (values.length > 1) {
    throw new Error(`Found non unique value of size [${values.length}]`)
  }

  return values[0]
}
