import { AccountTable, SessionTable, UserTable, VerificationTable } from "./auth-schema"
import { EndpointMonitorsTable, UptimeChecksTable } from "./endpointMonitor"

export * from "./auth-schema"

export * from "./endpointMonitor"

export const schema = {
  EndpointMonitorsTable,
  UptimeChecksTable,
  UserTable,
  SessionTable,
  AccountTable,
  VerificationTable,
}
