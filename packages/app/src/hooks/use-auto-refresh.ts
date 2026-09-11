import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { useHeaderContext } from "@/context/header-context"

interface UseAutoRefreshOptions {
  onRefresh: () => void | Promise<void>
  enabled?: boolean
}

export function useAutoRefresh({ onRefresh, enabled = true }: UseAutoRefreshOptions) {
  const { refreshInterval, isRefreshEnabled, setRefreshProgress, setIsAutoRefreshAvailable } =
    useHeaderContext()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const rafIdRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    setIsAutoRefreshAvailable(true)
    return () => {
      setIsAutoRefreshAvailable(false)
    }
  }, [setIsAutoRefreshAvailable])

  const clearIntervals = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [])

  const startRefresh = useCallback(() => {
    if (!isRefreshEnabled || !enabled || refreshInterval === "off") {
      clearIntervals()
      setRefreshProgress(0)
      return
    }

    clearIntervals()

    const intervalMs = refreshInterval * 1000
    startTimeRef.current = Date.now()

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current
      const progress = Math.min((elapsed / intervalMs) * 100, 100)

      // Use requestAnimationFrame for smoother updates
      rafIdRef.current = requestAnimationFrame(() => {
        setRefreshProgress(progress)
      })
    }

    // Update less frequently (4 times per second instead of 10)
    progressIntervalRef.current = setInterval(updateProgress, 250)

    intervalRef.current = setInterval(() => {
      onRefresh()
      startTimeRef.current = Date.now()
      setRefreshProgress(0)
    }, intervalMs)

    onRefresh()
  }, [refreshInterval, isRefreshEnabled, enabled, onRefresh, setRefreshProgress, clearIntervals])

  useEffect(() => {
    startRefresh()
    return clearIntervals
  }, [startRefresh, clearIntervals])

  return {
    refreshInterval,
    isRefreshEnabled: isRefreshEnabled && enabled,
  }
}
