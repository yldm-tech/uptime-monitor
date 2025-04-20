"use client"

import {
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconBellCheck,
  IconBellExclamation,
  IconLoader2,
  IconShieldCheckFilled,
  IconTarget,
  IconTargetOff,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"

import type { websitesSelectSchema } from "@/db/zod-schema"
import { msToHumanReadable } from "@/lib/formatters"
import { Badge } from "@/registry/new-york-v4/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/registry/new-york-v4/ui/card"
import type { z } from "zod"

interface WebsiteSectionCardsProps {
  website: z.infer<typeof websitesSelectSchema>
  avgResponseTime: number
  uptimePercentage: number
  loading?: boolean
  error?: string | null
}

export function WebsiteSectionCards({
  website,
  avgResponseTime,
  uptimePercentage,
  loading = false,
  error = null,
}: WebsiteSectionCardsProps) {
  if (loading && !website) {
    return (
      <div className="flex justify-center items-center p-8">
        <IconLoader2 className="animate-spin h-8 w-8" />
      </div>
    )
  }

  if (error && !website) {
    return <div className="p-4 text-center text-red-500">{error}</div>
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Consecutive Failures</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {website.consecutiveFailures}
          </CardTitle>
          <CardAction>
            <Badge
              variant={
                website.consecutiveFailures > 0 ? "destructive" : "outline"
              }
            >
              {website.consecutiveFailures > 0 ? (
                <IconAlertTriangle />
              ) : (
                <IconShieldCheckFilled />
              )}
              {website.consecutiveFailures > 0 ? "Failing" : "Healthy"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Recent check failures
          </div>
          <div className="text-muted-foreground">
            Number of consecutive failed checks
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Alert Status</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {website.activeAlert ? "Active" : "Inactive"}
          </CardTitle>
          <CardAction>
            <Badge variant={website.activeAlert ? "destructive" : "outline"}>
              {website.activeAlert ? (
                <IconBellExclamation />
              ) : (
                <IconBellCheck />
              )}
              {website.activeAlert ? "Action Needed" : "All Clear"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {website.activeAlert ? "Active alert" : "No active alerts"}
          </div>
          <div className="text-muted-foreground">
            Current alert status for this site
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average Response Time</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {msToHumanReadable(avgResponseTime, true)}
          </CardTitle>
          <CardAction>
            <Badge variant={avgResponseTime > 500 ? "destructive" : "outline"}>
              {avgResponseTime > 500 ? (
                <IconTrendingDown />
              ) : (
                <IconTrendingUp />
              )}
              {avgResponseTime > 500 ? "Slow" : "Fast"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Last 24 hours {/* This time range might need to be dynamic */}
          </div>
          <div className="text-muted-foreground">
            Average response time for this site
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Uptime Percentage</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {Number.parseFloat(uptimePercentage.toFixed(2))}%
          </CardTitle>
          <CardAction>
            <Badge variant={uptimePercentage < 99 ? "destructive" : "outline"}>
              {uptimePercentage < 99 ? <IconTargetOff /> : <IconTarget />}
              {uptimePercentage < 99 ? "Below Target" : "On Target"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Last 24 hours {/* This time range might need to be dynamic */}
          </div>
          <div className="text-muted-foreground">
            Overall uptime percentage for this site
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
