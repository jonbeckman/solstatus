"use client"

import { createContext, type ReactNode, useContext, useEffect, useState } from "react"

import { siteConfig } from "@/lib/site"

const COOKIE_NAME = "active_theme"

function setThemeCookie(theme: string) {
  if (typeof window === "undefined") {
    return
  }

  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax; ${window.location.protocol === "https:" ? "Secure;" : ""}`
}

type ThemeContextType = {
  activeTheme: string
  setActiveTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ActiveThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode
  initialTheme?: string
}) {
  const [activeTheme, setActiveTheme] = useState<string>(
    () => initialTheme || siteConfig.defaultTheme,
  )

  useEffect(() => {
    setThemeCookie(activeTheme)

    for (const className of document.body.classList) {
      if (className.startsWith("theme-")) {
        document.body.classList.remove(className)
      }
    }
    document.body.classList.add(`theme-${activeTheme}`)
    if (activeTheme.endsWith("-scaled")) {
      document.body.classList.add("theme-scaled")
    }
  }, [activeTheme])

  return (
    <ThemeContext.Provider value={{ activeTheme, setActiveTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeConfig() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useThemeConfig must be used within an ActiveThemeProvider")
  }
  return context
}
