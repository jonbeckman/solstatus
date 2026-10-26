import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router"
import type { CSSProperties, ReactNode } from "react"
import { ActiveThemeProvider } from "@/components/active-theme"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { HeaderProvider } from "@/context/header-context"
import { siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"
import { SidebarInset, SidebarProvider } from "@/registry/new-york-v4/ui/sidebar"
import { Toaster } from "@/registry/new-york-v4/ui/sonner"
import appCss from "@/styles/globals.css?url"
import themeCss from "@/styles/theme.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: siteConfig.name },
      { name: "description", content: siteConfig.description },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico?v=2" },
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: themeCss },
    ],
  }),
  component: RootComponent,
})

const sidebarStyle: CSSProperties & { "--sidebar-width": string } = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
}

function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ActiveThemeProvider initialTheme={siteConfig.defaultTheme}>
          <HeaderProvider>
            <SidebarProvider defaultOpen style={sidebarStyle}>
              <AppSidebar variant="inset" />
              <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                  <Outlet />
                </div>
              </SidebarInset>
            </SidebarProvider>
          </HeaderProvider>
          <Toaster />
        </ActiveThemeProvider>
      </ThemeProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className={cn("bg-background overscroll-none font-sans antialiased theme-mono-scaled")}>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
