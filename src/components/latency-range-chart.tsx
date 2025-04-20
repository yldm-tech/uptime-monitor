import type { uptimeChecksSelectSchema } from "@/db/zod-schema"
import { msToHumanReadable } from "@/lib/formatters"
import type { TimeRange } from "@/types/website"
import {
  format,
  getUnixTime,
  startOfDay,
  startOfHour,
  startOfMinute,
  subDays,
  subHours,
  subWeeks,
} from "date-fns"
import type React from "react"
import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { z } from "zod"

const getTimeBucketStart = (timestampMs: number, range: TimeRange): number => {
  const date = new Date(timestampMs)
  switch (range) {
    case "1h": {
      return getUnixTime(startOfMinute(date))
    }
    case "1d": {
      const minutes = date.getMinutes()
      const roundedMinutes = Math.floor(minutes / 15) * 15
      const startOfHr = startOfHour(date)
      startOfHr.setMinutes(roundedMinutes, 0, 0)
      return getUnixTime(startOfHr)
    }
    case "7d": {
      const hours = date.getHours()
      const roundedHours = Math.floor(hours / 2) * 2
      const startOfDy = startOfDay(date)
      startOfDy.setHours(roundedHours, 0, 0, 0)
      return getUnixTime(startOfDy)
    }
    default: {
      return Math.floor(timestampMs / 1000)
    }
  }
}

interface ProcessedDataPoint {
  timeBucket: number
  avgLatency: number | null
  minLatency: number | null
  maxLatency: number | null
}

const processData = (
  data: z.infer<typeof uptimeChecksSelectSchema>[],
  range: TimeRange,
): ProcessedDataPoint[] => {
  const now = Date.now()
  let startTime: Date
  const endTime = new Date(now)
  let intervalMinutes: number
  let expectedPoints: number

  switch (range) {
    case "1h":
      startTime = subHours(endTime, 1)
      intervalMinutes = 1
      expectedPoints = 60
      break
    case "1d":
      startTime = subDays(endTime, 1)
      intervalMinutes = 15
      expectedPoints = 96
      break
    case "7d":
      startTime = subWeeks(endTime, 1)
      intervalMinutes = 120
      expectedPoints = 84
      break
    default:
      throw new Error("Invalid time range")
  }

  const aggregatedData: {
    [key: number]: { values: number[]; count: number; sum: number }
  } = {}
  for (const point of data) {
    const bucketStartSeconds = getTimeBucketStart(
      new Date(point.timestamp).getTime(),
      range,
    )
    if (bucketStartSeconds * 1000 >= startTime.getTime()) {
      if (!aggregatedData[bucketStartSeconds]) {
        aggregatedData[bucketStartSeconds] = { values: [], count: 0, sum: 0 }
      }
      aggregatedData[bucketStartSeconds].values.push(point.responseTime ?? 0)
      aggregatedData[bucketStartSeconds].sum += point.responseTime ?? 0
      aggregatedData[bucketStartSeconds].count++
    }
  }

  const processedData: ProcessedDataPoint[] = []
  let currentBucketTime = startTime

  switch (range) {
    case "1h": {
      currentBucketTime = startOfMinute(startTime)
      break
    }
    case "1d": {
      const startMinutes = startTime.getMinutes()
      currentBucketTime = startOfHour(startTime)
      currentBucketTime.setMinutes(Math.floor(startMinutes / 15) * 15, 0, 0)
      break
    }
    case "7d": {
      const startHours = startTime.getHours()
      currentBucketTime = startOfDay(startTime)
      currentBucketTime.setHours(Math.floor(startHours / 2) * 2, 0, 0, 0)
      break
    }
  }

  const alignedStartTimeMs = currentBucketTime.getTime()

  for (let i = 0; i < expectedPoints; i++) {
    const currentBucketTimestampSeconds = getUnixTime(currentBucketTime)

    if (currentBucketTime > endTime) {
      break
    }

    if (currentBucketTimestampSeconds * 1000 >= alignedStartTimeMs) {
      const data = aggregatedData[currentBucketTimestampSeconds]
      if (data) {
        processedData.push({
          timeBucket: currentBucketTimestampSeconds,
          avgLatency: data.sum / data.count,
          minLatency: Math.min(...data.values),
          maxLatency: Math.max(...data.values),
        })
      } else {
        processedData.push({
          timeBucket: currentBucketTimestampSeconds,
          avgLatency: null,
          minLatency: null,
          maxLatency: null,
        })
      }
    }

    currentBucketTime = new Date(
      currentBucketTime.getTime() + intervalMinutes * 60000,
    )
  }

  for (let i = 0; i < processedData.length; i++) {
    if (processedData[i].avgLatency === null) {
      let prevIndex = -1
      let nextIndex = -1
      for (let j = i - 1; j >= 0; j--) {
        if (processedData[j].avgLatency !== null) {
          prevIndex = j
          break
        }
      }
      for (let j = i + 1; j < processedData.length; j++) {
        if (processedData[j].avgLatency !== null) {
          nextIndex = j
          break
        }
      }

      const prevPoint = prevIndex !== -1 ? processedData[prevIndex] : null
      const nextPoint = nextIndex !== -1 ? processedData[nextIndex] : null

      if (
        prevPoint !== null &&
        nextPoint !== null &&
        prevPoint.avgLatency !== null &&
        nextPoint.avgLatency !== null
      ) {
        const timeDiffTotal = nextPoint.timeBucket - prevPoint.timeBucket
        const timeDiffCurrent =
          processedData[i].timeBucket - prevPoint.timeBucket
        if (timeDiffTotal > 0) {
          const valueDiff = nextPoint.avgLatency - prevPoint.avgLatency
          processedData[i].avgLatency =
            prevPoint.avgLatency + valueDiff * (timeDiffCurrent / timeDiffTotal)
        } else {
          processedData[i].avgLatency = prevPoint.avgLatency
        }
      } else if (prevPoint !== null && prevPoint.avgLatency !== null) {
        processedData[i].avgLatency = prevPoint.avgLatency
      } else if (nextPoint !== null && nextPoint.avgLatency !== null) {
        processedData[i].avgLatency = nextPoint.avgLatency
      }
    }
  }

  return processedData
}

const formatXAxis = (tickItem: number, range: TimeRange): string => {
  const date = new Date(tickItem * 1000)
  switch (range) {
    case "1h":
      return format(date, "HH:mm")
    case "1d":
      return format(date, "HH:mm")
    case "7d":
      return format(date, "M/d")
    default:
      return format(date, "HH:mm")
  }
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: ProcessedDataPoint
    value: number | string | null
  }>
  label?: number
  range: TimeRange
}

const CustomTooltip = ({
  active,
  payload,
  range,
}: CustomTooltipProps): React.ReactElement | null => {
  if (active && payload && payload.length && payload[0].payload) {
    const data = payload[0].payload
    const date = new Date(data.timeBucket * 1000)
    let formattedTime = ""
    switch (range) {
      case "1h":
        formattedTime = format(date, "HH:mm")
        break
      case "1d":
        formattedTime = format(date, "MMM d, HH:mm")
        break
      case "7d":
        formattedTime = format(date, "MMM d, HH:mm")
        break
      default:
        formattedTime = format(date, "PPpp")
    }

    if (payload[0].value) {
      const value = payload[0].value
      let minLatency = 0
      let maxLatency = 0

      if (Array.isArray(value)) {
        minLatency = Number(value[0] as string)
        maxLatency = Number(value[1] as string)
      } else if (typeof value === "number") {
        minLatency = maxLatency = value
      } else if (typeof value === "string") {
        minLatency = maxLatency = Number(value)
      }

      return (
        <div className="custom-tooltip border border-accent bg-background p-3 shadow-md">
          <p className="label">{`${formattedTime}`}</p>
          {minLatency === maxLatency ? (
            <p className="intro">{`Latency: ${msToHumanReadable(minLatency, true)}`}</p>
          ) : (
            <p className="intro">{`Latency: ${msToHumanReadable(minLatency, true)} — ${msToHumanReadable(maxLatency, true)}`}</p>
          )}
        </div>
      )
    }
  }
  return null
}

interface LatencyRangeChartProps {
  data: z.infer<typeof uptimeChecksSelectSchema>[]
  timeRange: TimeRange
}

const LatencyRangeChart: React.FC<LatencyRangeChartProps> = ({
  data,
  timeRange,
}) => {
  const processedData = useMemo(() => {
    if (data.length === 0) {
      return []
    }

    return processData(data, timeRange)
  }, [data, timeRange])

  const xDomain: [number | "auto", number | "auto"] = useMemo(() => {
    if (processedData.length > 0) {
      let startTime: number
      const endTime = Math.floor(Date.now() / 1000)
      const lastBucketTime =
        processedData[processedData.length - 1]?.timeBucket ?? endTime

      switch (timeRange) {
        case "1h":
          startTime = getUnixTime(subHours(new Date(), 1))
          break
        case "1d":
          startTime = getUnixTime(subDays(new Date(), 1))
          break
        case "7d":
          startTime = getUnixTime(subWeeks(new Date(), 1))
          break
        default:
          startTime = processedData[0]?.timeBucket ?? endTime - 3600
      }

      return [startTime, Math.max(endTime, lastBucketTime)]
    }
    return ["auto", "auto"]
  }, [processedData, timeRange])

  const yDomain: [number | "auto", number | "auto"] = useMemo(() => {
    if (processedData.length === 0) {
      return ["auto", "auto"]
    }

    let minVal = Number.POSITIVE_INFINITY
    let maxVal = Number.NEGATIVE_INFINITY

    for (const p of processedData) {
      if (p.avgLatency !== null) {
        minVal = Math.min(minVal, p.avgLatency)
        maxVal = Math.max(maxVal, p.avgLatency)
      }
      if (p.minLatency !== null) {
        minVal = Math.min(minVal, p.minLatency)
      }
      if (p.maxLatency !== null) {
        maxVal = Math.max(maxVal, p.maxLatency)
      }
    }

    if (
      minVal === Number.POSITIVE_INFINITY ||
      maxVal === Number.NEGATIVE_INFINITY
    ) {
      return [0, 100]
    }

    const padding = 0
    const domainMin = 0
    const domainMax = Math.ceil(maxVal + padding)

    if (domainMin === domainMax) {
      return [Math.max(0, domainMin - 10), domainMax + 10]
    }

    return [domainMin, domainMax]
  }, [processedData])

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart
        data={processedData}
        margin={{
          top: 8,
          left: 16,
          bottom: 16,
        }}
      >
        <XAxis
          dataKey="timeBucket"
          type="number"
          domain={xDomain}
          tickFormatter={(tick) => formatXAxis(tick, timeRange)}
          scale="time"
        />
        <YAxis
          label={{
            value: "Latency",
            angle: -90,
            position: "insideLeft",
            style: { textAnchor: "middle" },
            offset: -8,
          }}
          domain={yDomain}
          allowDecimals={false}
          tickFormatter={(value) => msToHumanReadable(value, true)}
        />
        <Tooltip content={<CustomTooltip range={timeRange} />} />
        <Legend />
        <Area
          type="bump"
          dataKey={(data: ProcessedDataPoint) =>
            data.minLatency !== null && data.maxLatency !== null
              ? [data.minLatency, data.maxLatency]
              : null
          }
          stroke="#8884d8"
          strokeWidth={2}
          fill="#8884d8"
          fillOpacity={0.2}
          name="Min/Max Range"
          connectNulls={true}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default LatencyRangeChart
