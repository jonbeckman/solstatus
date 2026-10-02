import { type ReactNode, useEffect, useState } from "react"

import { siteConfig } from "@/lib/site"

const COOKIE_NAME = "active_theme"

function setThemeCookie(theme: string) {
  if (typeof window === "undefined") {
    return
  }

  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax; ${window.location.protocol === "https:" ? "Secure;" : ""}`
}

export function ActiveThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode
  initialTheme?: string
}) {
  const [activeTheme] = useState<string>(() => initialTheme || siteConfig.defaultTheme)

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

  return children
}
