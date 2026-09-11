"use client"

import type { Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/registry/new-york-v4/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
    items?: {
      title: string
      url: string
      icon: Icon
      isActive?: boolean
      external?: boolean
    }[]
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <a href={item.url} className="font-medium">
                  {item.title}
                </a>
              </SidebarMenuButton>
              {item.items?.length ? (
                <SidebarMenuSub className="flex flex-col mr-auto">
                  {item.items.map((item) => (
                    <SidebarMenuSubItem key={item.title}>
                      <SidebarMenuSubButton asChild isActive={item.isActive}>
                        <a
                          href={item.url}
                          {...(item.external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {item.title} <item.icon className="ml-auto" />
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              ) : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
