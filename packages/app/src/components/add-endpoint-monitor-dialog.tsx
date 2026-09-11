import { zodResolver } from "@hookform/resolvers/zod"
import {
  endpointMonitorsInsertDTOSchema,
  type endpointMonitorsSelectSchema,
} from "@solstatus/common/db"
import { IconPlus } from "@tabler/icons-react"
import { StatusCodes } from "http-status-codes"
import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { DEFAULT_TOAST_OPTIONS } from "@/lib/toasts"
import { Button } from "@/registry/new-york-v4/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/new-york-v4/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/registry/new-york-v4/ui/form"
import { Input } from "@/registry/new-york-v4/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/new-york-v4/ui/select"
import { useDialogStore } from "@/store/dialog-store"
import type { ConflictEndpointMonitorResponse } from "@/types/endpointMonitor"

type WebsiteFormData = z.infer<typeof endpointMonitorsInsertDTOSchema>
type WebsiteData = z.infer<typeof endpointMonitorsSelectSchema>

interface AddWebsiteDialogProps {
  trigger?: React.ReactNode
  endpointMonitor?: WebsiteData
  onSuccess?: () => void
}

export function AddEndpointMonitorDialog({
  trigger,
  endpointMonitor,
  onSuccess,
}: AddWebsiteDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const formId = "add-endpoint-monitor-form"
  const isEditing = !!endpointMonitor
  const { setEditEndpointMonitorDialogOpen } = useDialogStore()

  const checkIntervalOptions = [
    { label: "10 seconds", value: 10 },
    { label: "30 seconds", value: 30 },
    { label: "60 seconds", value: 60 },
    { label: "2 minutes", value: 120 },
    { label: "5 minutes", value: 300 },
    { label: "10 minutes", value: 600 },
    { label: "15 minutes", value: 900 },
    { label: "30 minutes", value: 1800 },
    { label: "1 hour", value: 3600 },
    { label: "3 hours", value: 10800 },
    { label: "6 hours", value: 21600 },
    { label: "12 hours", value: 43200 },
    { label: "1 day", value: 86400 },
  ]

  const form = useForm<WebsiteFormData>({
    resolver: zodResolver(endpointMonitorsInsertDTOSchema),
    defaultValues: isEditing
      ? {
          name: endpointMonitor.name ?? "",
          url: endpointMonitor.url ?? "",
          checkInterval: endpointMonitor.checkInterval ?? 60,
          isRunning: endpointMonitor.isRunning ?? true,
          expectedStatusCode: endpointMonitor.expectedStatusCode ?? undefined,
          alertThreshold: endpointMonitor.alertThreshold ?? 2,
        }
      : {
          name: "",
          url: "",
          checkInterval: 60,
          isRunning: true,
          expectedStatusCode: 200,
          alertThreshold: 2,
        },
  })

  React.useEffect(() => {
    if (open) {
      form.reset(
        isEditing
          ? {
              name: endpointMonitor.name ?? "",
              url: endpointMonitor.url ?? "",
              checkInterval: endpointMonitor.checkInterval ?? 60,
              isRunning: endpointMonitor.isRunning ?? true,
              expectedStatusCode: endpointMonitor.expectedStatusCode ?? undefined,
              alertThreshold: endpointMonitor.alertThreshold ?? 2,
            }
          : {
              name: "",
              url: "",
              checkInterval: 60,
              isRunning: true,
              expectedStatusCode: 200,
              alertThreshold: 2,
            },
      )
    }
  }, [open, endpointMonitor, isEditing, form])

  // Sync dialog state with store
  useEffect(() => {
    if (isEditing) {
      setEditEndpointMonitorDialogOpen(open)
    }

    // Cleanup on unmount
    return () => {
      if (isEditing) {
        setEditEndpointMonitorDialogOpen(false)
      }
    }
  }, [open, isEditing, setEditEndpointMonitorDialogOpen])

  const onSubmit = async (data: WebsiteFormData) => {
    setIsSubmitting(true)
    const url = isEditing
      ? `/api/endpoint-monitors/${endpointMonitor.id}`
      : "/api/endpoint-monitors"
    const method = isEditing ? "PATCH" : "POST"

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const successStatus = isEditing ? StatusCodes.OK : StatusCodes.CREATED
      const successMessage = isEditing ? "Endpoint Monitor Updated" : "Endpoint Monitor Added"
      const successDescription = isEditing
        ? `${data.url} has been updated successfully.`
        : `${data.url} has been added successfully.`

      if (response.status === successStatus) {
        toast.success(successMessage, {
          description: successDescription,
          ...DEFAULT_TOAST_OPTIONS,
        })
        setOpen(false)
        onSuccess?.()
      } else if (response.status === StatusCodes.CONFLICT && !isEditing) {
        console.log("Endpoint Monitor already exists")
        const error: ConflictEndpointMonitorResponse = await response.json()
        toast.info("Similar endpoint monitor already exists", {
          description: error.message,
          ...DEFAULT_TOAST_OPTIONS,
          duration: 10000,
        })
        return
      } else {
        const errorText = await response.text()
        toast.error(`Error response: ${response.status}`, {
          description: `Failed to ${isEditing ? "update" : "add"} endpoint monitor. ${errorText || "Unexpected response from server."}`,
          ...DEFAULT_TOAST_OPTIONS,
          duration: 10000,
        })
        return
      }

      form.reset()
    } catch (error) {
      console.error(`Error ${isEditing ? "updating" : "creating"} endpoint monitor:`, error)
      toast.error("UNKNOWN_ERROR", {
        description: `Failed to ${isEditing ? "update" : "create"} endpoint monitor.`,
        ...DEFAULT_TOAST_OPTIONS,
        duration: 10000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : isEditing ? (
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <IconPlus />
            <span className="hidden lg:inline">Add Endpoint Monitor</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{isEditing ? "Edit Endpoint Monitor" : "Add Endpoint Monitor"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this endpoint monitor."
              : "Add a new endpoint to monitor uptime and performance"}
          </DialogDescription>
        </DialogHeader>
        <div className="p-6">
          <Form {...form}>
            <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint Monitor Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Endpoint Monitor" {...field} />
                    </FormControl>
                    <FormDescription>
                      A friendly name to identify this endpoint monitor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://x.com/SolBeckman_" {...field} />
                    </FormControl>
                    <FormDescription>The full URL to monitor (including https://)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Interval</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value, 10))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select check frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {checkIntervalOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>How frequently the endpoint will be checked</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedStatusCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Status Code</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 200"
                        {...field}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? null : Number(event.target.value),
                          )
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      The specific HTTP status code expected (e.g., 200). Leave empty to accept any
                      2xx/3xx code.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alertThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Threshold</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2"
                        {...field}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? null : Number(event.target.value),
                          )
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of consecutive failures before sending an alert
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className="p-6 pt-0">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="primary" type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add Endpoint Monitor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
