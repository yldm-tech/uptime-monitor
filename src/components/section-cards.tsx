"use client"

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
import {
  IconActivityHeartbeat,
  IconBellCheck,
  IconBellExclamation,
  IconLink,
  IconLoader2,
  IconShieldCheckFilled,
  IconTarget,
  IconTargetOff,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"
import Link from "next/link"
import { useEffect, useState } from "react"
interface DashboardStats {
  totalWebsites: number
  sitesWithAlerts: number
  highestResponseTime: number
  highestResponseTimeWebsiteId: string | null
  uptimePercentage: number
}

export function SectionCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/websites/stats")
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard statistics")
        }
        const data = await response.json()
        setStats(data as DashboardStats)
        setError(null)
      } catch (err) {
        console.error("Error fetching stats:", err)
        setError("Failed to load dashboard statistics")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Refresh stats every minute
    const intervalId = setInterval(fetchStats, 60 * 1000)

    return () => clearInterval(intervalId)
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center p-8">
        <IconLoader2 className="animate-spin h-8 w-8" />
      </div>
    )
  }

  if (error && !stats) {
    return <div className="p-4 text-center text-red-500">{error}</div>
  }

  // Use placeholder values until data is loaded
  const data = stats || {
    totalWebsites: 0,
    sitesWithAlerts: 0,
    highestResponseTime: 0,
    highestResponseTimeWebsiteId: null,
    uptimePercentage: 100,
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Websites</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.totalWebsites}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconActivityHeartbeat />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Monitored websites
          </div>
          <div className="text-muted-foreground">
            Total websites being monitored
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Alert Status</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.sitesWithAlerts}
          </CardTitle>
          <CardAction>
            <Badge
              variant={data.sitesWithAlerts > 0 ? "destructive" : "outline"}
            >
              {data.sitesWithAlerts > 0 ? (
                <IconBellExclamation />
              ) : (
                <IconBellCheck />
              )}
              {data.sitesWithAlerts > 0 ? "Action Needed" : "All Clear"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {data.sitesWithAlerts > 0
              ? `${data.sitesWithAlerts} site${data.sitesWithAlerts !== 1 ? "s" : ""} with active alerts`
              : "No active alerts"}
          </div>
          <div className="text-muted-foreground">
            Websites requiring attention
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Highest Latency</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {msToHumanReadable(data.highestResponseTime, true)}
          </CardTitle>
          <CardAction>
            <Badge
              variant={
                data.highestResponseTime > 1000 ? "destructive" : "outline"
              }
            >
              {data.highestResponseTime > 1000 ? (
                <IconTrendingDown />
              ) : (
                <IconTrendingUp />
              )}
              {data.highestResponseTime > 1000 ? "Slow" : "Fast"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium items-center">
            {data.highestResponseTimeWebsiteId ? (
              <>
                <IconLink className="h-4 w-4" />
                <Link
                  href={`/websites/${data.highestResponseTimeWebsiteId}`}
                  className="hover:underline"
                  title={`View website ${data.highestResponseTimeWebsiteId}`}
                >
                  {data.highestResponseTimeWebsiteId}
                </Link>
              </>
            ) : (
              <span>Last 24 hours</span>
            )}
          </div>
          <div className="text-muted-foreground">
            Highest latency in the last 24 hours
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Uptime Percentage</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.uptimePercentage}%
          </CardTitle>
          <CardAction>
            <Badge
              variant={data.uptimePercentage < 99 ? "destructive" : "outline"}
            >
              {data.uptimePercentage < 99 ? <IconTargetOff /> : <IconTarget />}
              {data.uptimePercentage < 99 ? "Below Target" : "On Target"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Last 24 hours
          </div>
          <div className="text-muted-foreground">Overall uptime percentage</div>
        </CardFooter>
      </Card>
    </div>
  )
}
