import handler, { createServerEntry } from "@tanstack/react-start/server-entry"
import { dispatchApi } from "@/lib/dispatch-api"

export default createServerEntry({
  fetch(request) {
    const pathname = new URL(request.url).pathname

    if (pathname.startsWith("/api/")) {
      return dispatchApi(request)
    }

    return handler.fetch(request)
  },
})
