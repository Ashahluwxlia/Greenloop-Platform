import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: userProfile } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

  if (!userProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
  }

  try {
    // Get comprehensive analytics data
    const { data: totalUsers } = await supabase.from("users").select("id", { count: "exact" })
    const { data: activeUsers } = await supabase
      .from("users")
      .select("id", { count: "exact" })
      .gte("last_login", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    const { data: totalActions } = await supabase.from("user_actions").select("id", { count: "exact" })
    const { data: totalTeams } = await supabase.from("teams").select("id", { count: "exact" }).eq("is_active", true)
    const { data: activeChallenges } = await supabase
      .from("challenges")
      .select("id", { count: "exact" })
      .eq("is_active", true)

    // Get user engagement data
    const { data: userEngagement } = await supabase
      .from("users")
      .select("created_at, last_login, points, total_co2_saved")
      .order("created_at", { ascending: true })

    // Get action trends
    const { data: actionTrends } = await supabase
      .from("user_actions")
      .select(`
        created_at,
        sustainability_actions (
          category,
          co2_impact,
          points_value
        )
      `)
      .order("created_at", { ascending: true })

    // Get team performance
    const { data: teamPerformance } = await supabase
      .from("teams")
      .select("name, total_points, total_co2_saved, created_at")
      .eq("is_active", true)
      .order("total_points", { ascending: false })
      .limit(10)

    return NextResponse.json({
      metrics: {
        totalUsers: totalUsers?.length || 0,
        activeUsers: activeUsers?.length || 0,
        totalActions: totalActions?.length || 0,
        totalTeams: totalTeams?.length || 0,
        activeChallenges: activeChallenges?.length || 0,
      },
      userEngagement,
      actionTrends,
      teamPerformance,
    })
  } catch (error) {
    console.error("Error fetching admin analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
