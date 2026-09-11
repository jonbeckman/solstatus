import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes"
import type { ReactNode } from "react"

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps & { children?: ReactNode }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
