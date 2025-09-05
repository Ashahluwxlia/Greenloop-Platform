import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "recharts"
import { Users, Trophy, Target, TrendingUp, Activity, CheckCircle } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  if (!userProfile?.is_admin) {
    redirect("/dashboard")
  }

  // Get dashboard statistics
  const { data: totalUsers } = await supabase.from("users").select("id", { count: "exact" })
  const { data: activeUsers } = await supabase
    .from("users")
    .select("id", { count: "exact" })
    .gte("last_login", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  const { data: totalTeams } = await supabase.from("teams").select("id", { count: "exact" }).eq("is_active", true)
  const { data: activeChallenges } = await supabase
    .from("challenges")
    .select("id", { count: "exact" })
    .eq("is_active", true)
  const { data: totalActions } = await supabase.from("user_actions").select("id", { count: "exact" })

  // Get recent activity
  const { data: recentActions } = await supabase
    .from("user_actions")
    .select(`
      *,
      users (first_name, last_name),
      sustainability_actions (title, category)
    `)
    .order("created_at", { ascending: false })
    .limit(10)

  // Get top performers
  const { data: topUsers } = await supabase
    .from("users")
    .select("first_name, last_name, points, total_co2_saved")
    .order("points", { ascending: false })
    .limit(5)

  // Get monthly data for charts
  const { data: monthlyActions } = await supabase
    .from("user_actions")
    .select("created_at, sustainability_actions(co2_impact, points_value)")
    .gte("created_at", new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true })

  const { data: monthlyUsers } = await supabase
    .from("users")
    .select("created_at")
    .gte("created_at", new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true })

  // Process monthly data
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    const monthActions =
      monthlyActions?.filter((action) => {
        const actionDate = new Date(action.created_at)
        return actionDate >= monthStart && actionDate <= monthEnd
      }) || []

    const monthUserSignups =
      monthlyUsers?.filter((user) => {
        const userDate = new Date(user.created_at)
        return userDate >= monthStart && userDate <= monthEnd
      }) || []

    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      users: monthUserSignups.length,
      actions: monthActions.length,
      co2: Math.round(monthActions.reduce((sum, action) => sum + (action.sustainability_actions?.co2_impact || 0), 0)),
    }
  })

  // Get category distribution
  const { data: categoryActions } = await supabase
    .from("user_actions")
    .select("sustainability_actions(category)")
    .not("sustainability_actions", "is", null)

  const categoryCount =
    categoryActions?.reduce(
      (acc, action) => {
        const category = action.sustainability_actions?.category
        if (category) {
          acc[category] = (acc[category] || 0) + 1
        }
        return acc
      },
      {} as Record<string, number>,
    ) || {}

  const categoryData = Object.entries(categoryCount).map(([name, value], index) => ({
    name,
    value,
    color: ["#0891b2", "#d97706", "#34d399", "#fbbf24", "#f87171"][index % 5],
  }))

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor platform performance, manage users, and track sustainability impact.
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-primary">+{activeUsers?.length || 0}</span> active this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTeams?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Teams collaborating on sustainability</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Challenges</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeChallenges?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Ongoing sustainability challenges</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalActions?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Sustainability actions logged</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>User engagement and environmental impact over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="var(--color-primary)" strokeWidth={2} />
                    <Line type="monotone" dataKey="actions" stroke="var(--color-accent)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Action Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Action Categories</CardTitle>
                <CardDescription>Distribution of sustainability actions by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest sustainability actions logged by users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActions?.slice(0, 8).map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {action.users?.first_name} {action.users?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{action.sustainability_actions?.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {action.sustainability_actions?.category}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(action.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground text-center py-4">No recent activity</p>}
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Performers
                </CardTitle>
                <CardDescription>Users with highest sustainability impact</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topUsers?.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{user.total_co2_saved}kg CO₂ saved</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{user.points}</div>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground text-center py-4">No user data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
