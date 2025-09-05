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

  try {
    // Get user's actions with categories
    const { data: userActions } = await supabase
      .from("user_actions")
      .select(`
        *,
        sustainability_actions (
          title,
          category,
          co2_impact,
          points_value
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // Get user's challenge participations
    const { data: challengeParticipations } = await supabase
      .from("challenge_participants")
      .select(`
        *,
        challenges (
          title,
          category,
          points_reward
        )
      `)
      .eq("user_id", user.id)

    // Get user's badges
    const { data: userBadges } = await supabase
      .from("user_badges")
      .select(`
        *,
        badges (
          name,
          description,
          icon_url
        )
      `)
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false })

    // Get user profile
    const { data: userProfile } = await supabase
      .from("users")
      .select("points, total_co2_saved, level")
      .eq("id", user.id)
      .single()

    return NextResponse.json({
      actions: userActions,
      challenges: challengeParticipations,
      badges: userBadges,
      profile: userProfile,
    })
  } catch (error) {
    console.error("Error fetching user analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
