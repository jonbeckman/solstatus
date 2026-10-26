export interface MonitorTriggerInit {
  monitorId: string
  monitorType: "endpoint"
  checkInterval: number
}

export interface AppEnv {
  DB: D1Database
  SESSIONS_KV: KVNamespace
  BETTER_AUTH_SECRET: string
  MONITOR_EXEC: {
    executeCheck(endpointMonitorId: string): Promise<void> | void
  }
  MONITOR_TRIGGER_RPC: {
    init(payload: MonitorTriggerInit): Promise<void> | void
    updateCheckInterval(monitorId: string, checkInterval: number): Promise<void> | void
    deleteDo(monitorId: string): Promise<void> | void
    pauseDo(monitorId: string): Promise<void> | void
    resumeDo(monitorId: string): Promise<void> | void
  }
  MONITOR_EXEC_NAME: string
  MONITOR_TRIGGER_NAME: string
  CLOUDFLARE_ACCOUNT_ID: string
  VITE_APP_VERSION: string
}
