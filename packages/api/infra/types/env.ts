export interface MonitorExecEnv {
  DB: D1Database
  OPSGENIE_API_KEY: string
  MONITOR_EXEC_NAME: string
  MONITOR_TRIGGER_NAME: string
  CLOUDFLARE_ACCOUNT_ID: string
}

export interface MonitorTriggerHandle extends Rpc.DurableObjectBranded {
  init(payload: {
    monitorId: string
    monitorType: "endpoint"
    checkInterval: number
  }): Promise<void>
  updateCheckInterval(checkInterval: number): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  delete(): Promise<void>
}

export interface MonitorTriggerEnv {
  DB: D1Database
  MONITOR_EXEC: {
    executeCheck(endpointMonitorId: string): Promise<void> | void
  }
  MONITOR_TRIGGER: DurableObjectNamespace<MonitorTriggerHandle>
}
