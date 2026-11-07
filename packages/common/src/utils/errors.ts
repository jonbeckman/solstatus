export function getErrorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message
  }

  if (cause instanceof Object && "message" in cause) {
    return String(cause.message)
  }

  return String(cause)
}

export function getErrorStack(cause: unknown): string | undefined {
  if (cause instanceof Error) {
    return cause.stack
  }

  return undefined
}

export function logError(cause: unknown): string {
  const message = getErrorMessage(cause)
  console.error(message)

  return message
}

export function logErrorStack(cause: unknown) {
  const stack = getErrorStack(cause)

  if (stack) {
    console.error(stack)
  }
}

/**
 * Error thrown when the MonitorTrigger Durable Object is accessed before being initialized.
 */
export class MonitorTriggerNotInitializedError extends Error {
  static readonly NAME = "MonitorTriggerNotInitializedError"

  constructor(message = "MonitorTrigger Durable Object accessed before initialization.") {
    super(message)
    this.name = MonitorTriggerNotInitializedError.NAME
  }
}
