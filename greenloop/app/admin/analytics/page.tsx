import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AnalyticsCharts from "@/components/admin/analytics-charts"

export default async function AdminAnalyticsPage() {
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

  const { data: dashboardStats } = await supabase.from("admin_dashboard_stats").select("*").single()

  const { data: monthlyTrends } = await supabase
    .from("admin_monthly_trends")
    .select("*")
    .order("month", { ascending: true })

  const { data: categoryBreakdown } = await supabase
    .from("admin_category_breakdown")
    .select("*")
    .order("action_count", { ascending: false })

  const { data: topPerformers } = await supabase.rpc("get_top_performers", { p_limit: 10 })

  const monthlyUserGrowth =
    monthlyTrends?.map((trend) => ({
      month: new Date(trend.month).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      newUsers: trend.new_users || 0,
    })) || []

  const monthlyActionTrends =
    monthlyTrends?.map((trend) => ({
      month: new Date(trend.month).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      actions: trend.actions_completed || 0,
      co2: Math.round((trend.actions_completed || 0) * 2.5), // Estimated CO2 per action
      points: Math.round((trend.actions_completed || 0) * 10), // Estimated points per action
    })) || []

  const realCategoryBreakdown =
    categoryBreakdown?.map((category, index) => ({
      name: category.category_name,
      value: category.action_count || 0,
      co2: Math.round(category.total_co2_impact || 0),
      color: getCategoryColor(category.category_name),
      percent: (category.percentage || 0) / 100,
    })) || []

  function getCategoryColor(category: string) {
    const colors: { [key: string]: string } = {
      Energy: "#0891b2", // cyan-600
      Transportation: "#d97706", // amber-600
      Waste: "#34d399", // emerald-400
      Water: "#fbbf24", // amber-400
      Food: "#f87171", // red-400
      "Food & Diet": "#ef4444", // red-500
      "Office Practices": "#8b5cf6", // violet-500
      Office: "#8b5cf6", // violet-500
      "Home & Garden": "#10b981", // emerald-500
      Community: "#f59e0b", // amber-500
      Digital: "#06b6d4", // cyan-500
      Shopping: "#ec4899", // pink-500
      "Health & Wellness": "#84cc16", // lime-500
      Other: "#9ca3af", // gray-400
    }
    return colors[category] || colors["Other"]
  }

  return (
    <AnalyticsCharts
      totalUsersCount={dashboardStats?.active_users || 0}
      activeUsersCount={dashboardStats?.active_users_7d || 0}
      totalActionsCount={dashboardStats?.total_verified_actions || 0}
      totalTeamsCount={dashboardStats?.active_teams || 0}
      activeChallengesCount={dashboardStats?.active_challenges || 0}
      totalCO2Saved={dashboardStats?.total_co2_saved || 0}
      totalPointsEarned={dashboardStats?.total_points_awarded || 0}
      monthlyUserGrowth={monthlyUserGrowth}
      monthlyActionTrends={monthlyActionTrends}
      categoryBreakdown={realCategoryBreakdown}
      teamPerformance={topPerformers || []}
    />
  )
}
