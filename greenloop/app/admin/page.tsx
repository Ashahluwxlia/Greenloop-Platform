import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { DashboardCharts } from "@/components/admin/dashboard-charts"
import {
  Users,
  Trophy,
  Target,
  TrendingUp,
  Activity,
  CheckCircle,
  RefreshCw,
  Calendar,
  Leaf,
  Award,
  ArrowUpRight,
} from "lucide-react"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: dashboardStats } = await supabase.from("admin_dashboard_stats").select("*").single()

  const { data: monthlyTrends } = await supabase
    .from("admin_monthly_trends")
    .select("*")
    .order("month", { ascending: true })

  const { data: categoryBreakdown } = await supabase
    .from("admin_category_breakdown")
    .select("*")
    .order("action_count", { ascending: false })

  const { data: weeklyActivity } = await supabase
    .from("admin_weekly_activity")
    .select("*")
    .order("day", { ascending: true })

  const { data: recentActivity } = await supabase
    .from("admin_audit_log_view")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10)

  const { data: topTeams } = await supabase.rpc("get_top_performers", { p_limit: 5 })

  const monthlyData =
    monthlyTrends?.map((trend) => ({
      month: new Date(trend.month).toLocaleDateString("en-US", { month: "short" }),
      users: trend.new_users || 0,
      actions: trend.actions_completed || 0,
    })) || []

  const categoryData =
    categoryBreakdown?.map((category, index) => ({
      name: category.category_name,
      value: category.percentage || 0,
      color: [
        "#0891b2",
        "#d97706",
        "#34d399",
        "#fbbf24",
        "#f87171",
        "#8b5cf6",
        "#06b6d4",
        "#10b981",
        "#f59e0b",
        "#ef4444",
      ][index % 10],
    })) || []

  const weeklyData =
    weeklyActivity?.map((day) => ({
      day: day.day_name,
      actions: day.actions || 0,
    })) || []

  const userGrowth = dashboardStats?.new_users_30d || 0
  const actionGrowth = dashboardStats?.actions_30d || 0
  const activeUserPercentage =
    dashboardStats?.active_users && dashboardStats?.active_users > 0
      ? Math.round((dashboardStats.active_users_7d / dashboardStats.active_users) * 100)
      : 0

  const enhancedUserStats = dashboardStats
    ? {
        total_users: dashboardStats.active_users || 0,
        active_users: dashboardStats.active_users_7d || 0,
        admin_users: dashboardStats.total_verified_actions || 0,
        avg_points: Math.round(dashboardStats.total_points_awarded / Math.max(dashboardStats.active_users, 1)) || 0,
        total_co2_saved: dashboardStats.total_co2_saved || 0,
      }
    : undefined

  const enhancedChallengeStats = dashboardStats
    ? {
        total_challenges: dashboardStats.active_challenges || 0,
        active_challenges: dashboardStats.active_challenges || 0,
        avg_completion_rate: dashboardStats.completed_challenges || 0,
        total_participants: dashboardStats.completed_challenges || 0,
      }
    : undefined

  const enhancedTeamStats = dashboardStats
    ? {
        total_teams: dashboardStats.active_teams || 0,
        active_teams: dashboardStats.active_teams || 0,
        avg_team_size: dashboardStats.avg_team_points || 0,
        top_performing_teams: topTeams || [],
      }
    : undefined

  return (
    <div className="p-8">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor platform performance, manage users, and track sustainability impact.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleTimeString()}</div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.active_users || 0}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center text-xs text-emerald-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />+{userGrowth} this month
                </div>
              </div>
              <Progress value={activeUserPercentage} className="mt-3" />
              <p className="text-xs text-muted-foreground mt-1">{activeUserPercentage}% active this week</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.active_teams || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">Teams collaborating on sustainability</p>
              <div className="mt-3">
                <Badge variant="secondary" className="text-xs">
                  <Award className="h-3 w-3 mr-1" />
                  High Engagement
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats?.active_challenges || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">Ongoing sustainability challenges</p>
              <div className="mt-3">
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  This Month
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CO₂ Impact</CardTitle>
              <Leaf className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {Math.round(dashboardStats?.total_co2_saved || 0)}kg
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center text-xs text-emerald-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />+{actionGrowth} actions this month
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total CO₂ saved by platform</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform Analytics</CardTitle>
            <CardDescription>Comprehensive view of user engagement and environmental impact</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardCharts
              trendData={monthlyData}
              categoryData={categoryData}
              weeklyData={weeklyData}
              userStats={enhancedUserStats}
              challengeStats={enhancedChallengeStats}
              teamStats={enhancedTeamStats}
            />
          </CardContent>
        </Card>

        {/* Recent Activity & Admin Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Admin Activity
              </CardTitle>
              <CardDescription>Latest administrative actions and system changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity?.slice(0, 8).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{activity.admin_name}</p>
                        <p className="text-xs text-muted-foreground">{activity.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {activity.resource_type}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )) || <p className="text-muted-foreground text-center py-4">No recent admin activity</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Performing Users
              </CardTitle>
              <CardDescription>Users with highest sustainability impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topTeams?.map((user, index) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                              ? "bg-gray-100 text-gray-700"
                              : index === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-primary/10 text-primary"
                        }`}
                      >
                        <span className="text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(user.total_co2_saved || 0)}kg CO₂ saved • {user.verified_actions} actions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{user.points || 0}</div>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                )) || <p className="text-muted-foreground text-center py-4">No user data available</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
