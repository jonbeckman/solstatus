import { createFileRoute } from "@tanstack/react-router"
import { IconCirclePlusFilled } from "@tabler/icons-react"
import * as Schema from "effect/Schema"
import { useEffect } from "react"
import { AddEndpointMonitorDialog } from "@/components/add-endpoint-monitor-dialog"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { useHeaderContentOnly } from "@/context/header-context"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { refreshEndpointMonitors } from "@/lib/api-queries"
import { Button } from "@/registry/new-york-v4/ui/button"
import { SortOrder } from "@/server/api/schemas"

const PageNumber = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))

const DashboardSearch = Schema.Struct({
  page: Schema.optionalKey(PageNumber),
  pageSize: Schema.optionalKey(PageNumber.check(Schema.isGreaterThan(0))),
  search: Schema.optionalKey(Schema.String),
  orderBy: Schema.optionalKey(Schema.String),
  order: Schema.optionalKey(SortOrder),
})

export const Route = createFileRoute("/")({
  validateSearch: Schema.toStandardSchemaV1(DashboardSearch),
  component: DashboardPage,
})

function DashboardPage() {
  const { setHeaderLeftContent, setHeaderRightContent } = useHeaderContentOnly()

  useAutoRefresh({
    onRefresh: refreshEndpointMonitors,
    enabled: true,
  })

  useEffect(() => {
    setHeaderLeftContent("Endpoint Monitors")
    setHeaderRightContent(
      <AddEndpointMonitorDialog
        trigger={
          <Button variant="primary">
            <IconCirclePlusFilled />
            <span>Create Endpoint Monitor</span>
          </Button>
        }
      />,
    )
  }, [setHeaderLeftContent, setHeaderRightContent])

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <SectionCards />
        <DataTable />
      </div>
    </div>
  )
}
