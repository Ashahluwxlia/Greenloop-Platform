"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { BarChart3, Users, TrendingUp, Download, CalendarIcon, Target, Award, Activity } from "lucide-react"
import type { DateRange } from "react-day-picker"

interface AnalyticsChartsProps {
  totalUsersCount: number
  activeUsersCount: number
  totalActionsCount: number
  totalTeamsCount: number
  activeChallengesCount: number
  totalCO2Saved: number
  totalPointsEarned: number
  monthlyUserGrowth: any[]
  monthlyActionTrends: any[]
  categoryBreakdown: any[]
  teamPerformance: any[]
}

export default function AnalyticsCharts({
  totalUsersCount,
  activeUsersCount,
  totalActionsCount,
  totalTeamsCount,
  activeChallengesCount,
  totalCO2Saved,
  totalPointsEarned,
  monthlyUserGrowth,
  monthlyActionTrends,
  categoryBreakdown,
  teamPerformance,
}: AnalyticsChartsProps) {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1), // Default to last 3 months
    to: new Date(),
  })
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const handleExportReport = () => {
    const reportData = {
      dateRange: {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString(),
      },
      metrics: {
        totalUsers: totalUsersCount,
        activeUsers: activeUsersCount,
        totalActions: totalActionsCount,
        totalTeams: totalTeamsCount,
        activeChallenges: activeChallengesCount,
        totalCO2Saved: totalCO2Saved,
        totalPointsEarned: totalPointsEarned,
      },
      categoryBreakdown,
      topPerformers: teamPerformance,
    }

    const csvContent = [
      ["Metric", "Value"],
      ["Total Users", totalUsersCount],
      ["Active Users", activeUsersCount],
      ["Total Actions", totalActionsCount],
      ["Total Teams", totalTeamsCount],
      ["Active Challenges", activeChallengesCount],
      ["Total CO2 Saved (kg)", Math.round(totalCO2Saved)],
      ["Total Points Earned", Math.round(totalPointsEarned)],
      [""],
      ["Category Breakdown", ""],
      ...categoryBreakdown.map((cat) => [cat.name, `${cat.value} actions, ${Math.round(cat.co2)}kg CO2`]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `analytics-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <main className="flex-1 p-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              Analytics & Reports
            </h1>
            <p className="text-muted-foreground">
              Comprehensive insights into platform performance, user engagement, and environmental impact.
            </p>
          </div>
          <div className="flex gap-3">
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[280px] justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range: DateRange | undefined) => {
                    if (range) {
                      setDateRange({
                        from: range.from,
                        to: range.to,
                      })
                      if (range.from && range.to) {
                        setIsDatePickerOpen(false)
                      }
                    } else {
                      setDateRange({ from: undefined, to: undefined })
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsersCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-primary">+{activeUsersCount || 0}</span> active this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalActionsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Verified sustainability actions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CO₂ Saved</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(totalCO2Saved)}kg</div>
              <p className="text-xs text-muted-foreground">Total environmental impact</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTeamsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Collaborative teams</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(totalPointsEarned)}</div>
              <p className="text-xs text-muted-foreground">Total platform points</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Analytics</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="impact">Environmental Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth */}
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>New user registrations over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyUserGrowth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="newUsers" stroke="#0891b2" fill="#0891b2" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Action Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Action Categories</CardTitle>
                  <CardDescription>Distribution of sustainability actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${percent ? Math.round(percent * 100) : 0}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Activity Trends</CardTitle>
                <CardDescription>Actions, points, and CO₂ impact over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyActionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="actions" stroke="#0891b2" strokeWidth={2} name="Actions" />
                    <Line type="monotone" dataKey="points" stroke="#d97706" strokeWidth={2} name="Points" />
                    <Line type="monotone" dataKey="co2" stroke="#34d399" strokeWidth={2} name="CO₂ Saved (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Top Performing Users */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Users</CardTitle>
                <CardDescription>Users with highest sustainability impact</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamPerformance && teamPerformance.length > 0 ? (
                    teamPerformance.map((user, index) => (
                      <div
                        key={user.user_id || index}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                            <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(user.total_co2_saved || 0)}kg CO₂ saved • {user.verified_actions || 0} actions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {Math.round(user.points || user.total_points || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No user data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {activeUsersCount && totalUsersCount ? Math.round((activeUsersCount / totalUsersCount) * 100) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Users active this week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Avg Actions/User</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {totalUsersCount && totalActionsCount
                      ? Math.round((totalActionsCount / totalUsersCount) * 10) / 10
                      : 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Actions per user</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Challenge Participation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{activeChallengesCount || 0}</div>
                  <p className="text-sm text-muted-foreground">Active challenges</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="impact" className="space-y-6">
            {/* Environmental Impact Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {categoryBreakdown.length > 0 ? (
                categoryBreakdown.map((category) => (
                  <Card key={category.name}>
                    <CardHeader>
                      <CardTitle className="text-sm">{category.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold" style={{ color: category.color }}>
                        {Math.round(category.co2)}kg
                      </div>
                      <p className="text-xs text-muted-foreground">CO₂ saved</p>
                      <p className="text-xs text-muted-foreground">{category.value} actions</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-4">
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No environmental impact data available yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
