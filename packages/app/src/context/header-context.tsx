import type React from "react"
import { createContext, type ReactNode, useContext, useMemo, useState } from "react"

export type RefreshInterval = 10 | 30 | 60 | "off"

// Split into two contexts to isolate frequent updates
interface HeaderContentContextProps {
  headerLeftContent: React.ReactNode
  setHeaderLeftContent: (content: React.ReactNode) => void
  headerRightContent: React.ReactNode
  setHeaderRightContent: (content: React.ReactNode) => void
  refreshInterval: RefreshInterval
  setRefreshInterval: (interval: RefreshInterval) => void
  isRefreshEnabled: boolean
  isAutoRefreshAvailable: boolean
  setIsAutoRefreshAvailable: (available: boolean) => void
}

interface RefreshProgressContextProps {
  refreshProgress: number
  setRefreshProgress: (progress: number) => void
}

const HeaderContentContext = createContext<HeaderContentContextProps | undefined>(undefined)
const RefreshProgressContext = createContext<RefreshProgressContextProps | undefined>(undefined)

export const defaultHeaderContent: React.ReactNode = <div />

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [headerLeftContent, setHeaderLeftContent] = useState<React.ReactNode>(defaultHeaderContent)
  const [headerRightContent, setHeaderRightContent] =
    useState<React.ReactNode>(defaultHeaderContent)
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(60)
  const [refreshProgress, setRefreshProgress] = useState(0)
  const [isAutoRefreshAvailable, setIsAutoRefreshAvailable] = useState(false)

  const isRefreshEnabled = refreshInterval !== "off"

  // Memoize context values to prevent unnecessary re-renders
  const headerContentValue = useMemo(
    () => ({
      headerLeftContent,
      setHeaderLeftContent,
      headerRightContent,
      setHeaderRightContent,
      refreshInterval,
      setRefreshInterval,
      isRefreshEnabled,
      isAutoRefreshAvailable,
      setIsAutoRefreshAvailable,
    }),
    [
      headerLeftContent,
      headerRightContent,
      refreshInterval,
      isRefreshEnabled,
      isAutoRefreshAvailable,
    ],
  )

  const refreshProgressValue = useMemo(
    () => ({
      refreshProgress,
      setRefreshProgress,
    }),
    [refreshProgress],
  )

  return (
    <HeaderContentContext.Provider value={headerContentValue}>
      <RefreshProgressContext.Provider value={refreshProgressValue}>
        {children}
      </RefreshProgressContext.Provider>
    </HeaderContentContext.Provider>
  )
}

// Main hook for header content and refresh settings (not progress)
export function useHeaderContext() {
  const headerContext = useContext(HeaderContentContext)
  const progressContext = useContext(RefreshProgressContext)

  if (headerContext === undefined || progressContext === undefined) {
    throw new Error("useHeaderContext must be used within a HeaderProvider")
  }

  // For backward compatibility, combine both contexts
  return {
    ...headerContext,
    ...progressContext,
  }
}

// Specialized hook for components that only need refresh progress
export function useRefreshProgress() {
  const context = useContext(RefreshProgressContext)
  if (context === undefined) {
    throw new Error("useRefreshProgress must be used within a HeaderProvider")
  }
  return context
}

// Specialized hook for components that don't need refresh progress
export function useHeaderContentOnly() {
  const context = useContext(HeaderContentContext)
  if (context === undefined) {
    throw new Error("useHeaderContentOnly must be used within a HeaderProvider")
  }
  return context
}
