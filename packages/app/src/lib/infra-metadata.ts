import type { InfraMetadata } from "@solstatus/common/utils/types"
import { z } from "zod"

const infraMetadataSchema = z.object({
  cloudflareAccountId: z.string(),
  monitorExecName: z.string(),
  monitorTriggerName: z.string(),
})

export async function getInfraMetadata(): Promise<InfraMetadata> {
  const response = await fetch("/api/infra-metadata")

  if (!response.ok) {
    throw new Error("Failed to load infra metadata")
  }

  return infraMetadataSchema.parse(await response.json())
}
