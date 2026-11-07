import { formatDistanceToNow } from "date-fns"

/** Relative time from now, such as "5 minutes ago". */
export const timeAgo = (date: Date | number | string): string =>
  formatDistanceToNow(new Date(date), { addSuffix: true })
