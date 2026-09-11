import { RefreshProgressBar } from "@/components/refresh-progress-bar"
import { useHeaderContentOnly } from "@/context/header-context"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import { SidebarTrigger } from "@/registry/new-york-v4/ui/sidebar"

export function SiteHeader() {
  const { headerLeftContent, headerRightContent, isAutoRefreshAvailable } = useHeaderContentOnly()
  return (
    <header className="relative">
      <div className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <div className="text-base font-medium">{headerLeftContent}</div>
          <div className="ml-auto flex items-center gap-2">{headerRightContent}</div>
        </div>
      </div>
      {isAutoRefreshAvailable && <RefreshProgressBar />}
    </header>
  )
}
