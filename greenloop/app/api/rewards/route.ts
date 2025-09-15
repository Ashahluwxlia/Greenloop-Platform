import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendRewardClaimConfirmation, sendAdminRewardNotification } from "@/lib/supabase-email"

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
    // Get user's current level and points
    const { data: userProfile } = await supabase.from("users").select("total_points").eq("id", user.id).single()

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Get all level rewards
    const { data: levelRewards } = await supabase.from("level_rewards").select("*").order("level", { ascending: true })

    const { data: userRewards } = await supabase
      .from("user_level_rewards")
      .select(`
        *,
        level_rewards (
          reward_title,
          reward_description,
          reward_type
        )
      `)
      .eq("user_id", user.id)
      .order("claimed_at", { ascending: false })

    // Calculate current level based on points
    const currentLevel = calculateLevel(userProfile.total_points)

    return NextResponse.json({
      currentLevel,
      totalPoints: userProfile.total_points,
      levelRewards,
      userRewards,
    })
  } catch (error) {
    console.error("Error fetching rewards:", error)
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { levelRewardId } = await request.json()

    if (!levelRewardId) {
      return NextResponse.json({ error: "Invalid reward ID provided" }, { status: 400 })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from("users")
      .select("total_points, first_name, last_name, email")
      .eq("id", user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Get reward details
    const { data: levelReward } = await supabase.from("level_rewards").select("*").eq("id", levelRewardId).single()

    if (!levelReward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 })
    }

    // Check if user has reached this level
    const currentLevel = calculateLevel(userProfile.total_points)
    if (currentLevel < levelReward.level) {
      return NextResponse.json({ error: "You haven't reached this level yet" }, { status: 400 })
    }

    // Check if reward already claimed
    const { data: existingClaim } = await supabase
      .from("user_level_rewards")
      .select("id")
      .eq("user_id", user.id)
      .eq("level_reward_id", levelRewardId)
      .single()

    if (existingClaim) {
      return NextResponse.json({ error: "Reward already claimed" }, { status: 400 })
    }

    const { data: rewardClaim, error: claimError } = await supabase
      .from("user_level_rewards")
      .insert({
        user_id: user.id,
        level: levelReward.level,
        level_reward_id: levelRewardId,
        claim_status: "pending",
        claimed_at: new Date().toISOString(),
        user_email: userProfile.email,
        user_name: `${userProfile.first_name} ${userProfile.last_name}`,
      })
      .select()
      .single()

    if (claimError) {
      console.error("Error creating reward claim:", claimError)
      return NextResponse.json({ error: "Failed to claim reward" }, { status: 500 })
    }

    const userName = `${userProfile.first_name} ${userProfile.last_name}`

    // Send confirmation email to user
    await sendRewardClaimConfirmation(
      userProfile.email,
      userName,
      levelReward.level,
      levelReward.reward_title,
      levelReward.reward_description,
    )

    // Send notification to admin (you can configure admin email in env vars)
    const adminEmail = process.env.ADMIN_EMAIL || "admin@greenloop.com"
    await sendAdminRewardNotification(
      adminEmail,
      userProfile.email,
      userName,
      levelReward.level,
      levelReward.reward_title,
      levelReward.reward_description,
      rewardClaim.claimed_at,
    )

    return NextResponse.json({
      message: "Reward claimed successfully! You will receive an email from an administrator within 24-48 hours.",
      rewardClaim,
    })
  } catch (error) {
    console.error("Error claiming reward:", error)
    return NextResponse.json({ error: "Failed to claim reward" }, { status: 500 })
  }
}

function calculateLevel(points: number): number {
  if (points >= 100000) return 10
  if (points >= 50000) return 9
  if (points >= 20000) return 8
  if (points >= 10000) return 7
  if (points >= 5000) return 6
  if (points >= 2000) return 5
  if (points >= 1000) return 4
  if (points >= 500) return 3
  if (points >= 250) return 2
  if (points >= 100) return 1
  return 0
}
