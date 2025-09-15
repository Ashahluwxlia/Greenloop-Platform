import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { sendRewardApproved, sendRewardDelivered } from "@/lib/supabase-email"

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
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const { data: rewardClaims } = await supabase
      .from("user_level_rewards")
      .select(`
        *,
        level_rewards (
          reward_title,
          reward_description,
          reward_type
        ),
        users (
          first_name,
          last_name,
          email
        )
      `)
      .order("claimed_at", { ascending: false })

    return NextResponse.json({ rewardClaims })
  } catch (error) {
    console.error("Error fetching reward claims:", error)
    return NextResponse.json({ error: "Failed to fetch reward claims" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: userProfile } = await supabase
    .from("users")
    .select("is_admin, first_name, last_name")
    .eq("id", user.id)
    .single()

  if (!userProfile?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  try {
    const { rewardClaimId, status, adminNotes } = await request.json()

    if (!rewardClaimId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["approved", "rejected", "delivered"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Get the reward claim details
    const { data: rewardClaim } = await supabase
      .from("user_level_rewards")
      .select(`
        *,
        level_rewards (
          reward_title,
          reward_description
        )
      `)
      .eq("id", rewardClaimId)
      .single()

    if (!rewardClaim) {
      return NextResponse.json({ error: "Reward claim not found" }, { status: 404 })
    }

    const updateData: any = {
      claim_status: status,
      admin_notes: adminNotes,
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    }

    if (status === "approved") {
      updateData.approved_at = new Date().toISOString()
    }

    const { data: updatedClaim, error: updateError } = await supabase
      .from("user_level_rewards")
      .update(updateData)
      .eq("id", rewardClaimId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating reward claim:", updateError)
      return NextResponse.json({ error: "Failed to update reward claim" }, { status: 500 })
    }

    if (status === "approved") {
      await sendRewardApproved(
        rewardClaim.user_email,
        rewardClaim.user_name,
        rewardClaim.level,
        rewardClaim.level_rewards.reward_title,
        rewardClaim.level_rewards.reward_description,
        adminNotes,
      )
    } else if (status === "delivered") {
      await sendRewardDelivered(
        rewardClaim.user_email,
        rewardClaim.user_name,
        rewardClaim.level,
        rewardClaim.level_rewards.reward_title,
        rewardClaim.level_rewards.reward_description,
        adminNotes,
      )
    }

    return NextResponse.json({
      message: `Reward claim ${status} successfully`,
      rewardClaim: updatedClaim,
    })
  } catch (error) {
    console.error("Error updating reward claim:", error)
    return NextResponse.json({ error: "Failed to update reward claim" }, { status: 500 })
  }
}
