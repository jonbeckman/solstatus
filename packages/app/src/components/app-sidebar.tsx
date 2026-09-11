import {
  IconAppWindow,
  IconBell,
  IconBrandGithub,
  IconBulb,
  IconDashboard,
  IconDna,
  IconHeartbeat,
  IconMail,
  IconPrismLight,
  IconSparkles,
  IconTargetArrow,
} from "@tabler/icons-react"
import { useTheme } from "next-themes"
import type * as React from "react"
import { useState } from "react"
import SolStatusLogo from "@/components/icons/solstatus-logo"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/registry/new-york-v4/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Monitors",
      url: "/",
      icon: IconDashboard,
      items: [
        {
          title: "Endpoint",
          url: "/",
          icon: IconTargetArrow,
        },
        {
          title: "Synthetic (blocked)",
          url: "https://github.com/jonbeckman/solstatus/issues/19#issuecomment-2878393426",
          external: true,
          icon: IconAppWindow,
        },
        {
          title: "Agentic (soon)",
          url: "https://github.com/jonbeckman/solstatus/issues/39",
          external: true,
          icon: IconSparkles,
        },
        {
          title: "Heartbeat (soon)",
          url: "https://github.com/jonbeckman/solstatus/issues/43",
          external: true,
          icon: IconHeartbeat,
        },
        {
          title: "TCP (soon)",
          url: "https://github.com/jonbeckman/solstatus/issues/44",
          external: true,
          icon: IconPrismLight,
        },
        {
          title: "Other? Let me know!",
          url: "https://github.com/jonbeckman/solstatus/issues",
          external: true,
          icon: IconBulb,
        },
      ],
    },

    {
      title: "Notifications",
      url: "/",
      icon: IconBell,
      items: [
        {
          title: "Opsgenie",
          url: "/",
          icon: IconBell,
        },
        {
          title: "Email (soon)",
          url: "https://github.com/jonbeckman/solstatus/issues/47",
          external: true,
          icon: IconMail,
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "GitHub",
      icon: IconBrandGithub,
      url: "https://github.com/jonbeckman/solstatus",
      external: true,
    },
    {
      title: `${import.meta.env.VITE_APP_VERSION}`,
      icon: IconDna,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme } = useTheme()
  const [isHovered, setIsHovered] = useState(false)
  const gifSrc =
    theme === "dark" ? "/liquid-metal-solstatus-dark.gif" : "/liquid-metal-solstatus-light.gif"
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild variant="ghost" className="h-14">
              <a
                href="/"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {isHovered ? (
                  <img
                    src={gifSrc}
                    alt="SolStatus Animated Logo"
                    width={32}
                    height={32}
                    className="!size-8"
                  />
                ) : (
                  <SolStatusLogo className="!size-8 fill-black dark:fill-white" />
                )}
                <span className="text-lg font-semibold font-unbounded">SolStatus</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  )
}
