import { customAlphabet } from "nanoid"

export const nanoid = customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")

export enum PRE_ID {
  endpointMonitor = "endp",
  uptimeCheck = "uptc",
}

export const createId = (prefix: PRE_ID) => [prefix, nanoid(20)].join("_")
