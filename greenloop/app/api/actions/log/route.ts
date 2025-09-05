import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { action_id, notes } = body

    if (!action_id) {
      return NextResponse.json({ error: "Action ID is required" }, { status: 400 })
    }

    // Get action details
    const { data: action, error: actionError } = await supabase
      .from("sustainability_actions")
      .select("*")
      .eq("id", action_id)
      .single()

    if (actionError || !action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 })
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase.from("users").select("*").eq("id", user.id).single()

    if (userError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Check if user already logged this action recently (prevent duplicates)
    const { data: existingAction } = await supabase
      .from("user_actions")
      .select("id")
      .eq("user_id", user.id)
      .eq("action_id", action_id)
      .gte("completed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
      .single()

    if (existingAction) {
      return NextResponse.json({ error: "You've already logged this action recently" }, { status: 409 })
    }

    console.log("[v0] Attempting to insert user action:", {
      user_id: user.id,
      action_id: action.id,
      points_earned: action.points_value,
      co2_saved: action.co2_impact,
    })

    const { data: actionLog, error: logError } = await supabase
      .from("user_actions")
      .insert({
        user_id: user.id,
        action_id: action.id,
        points_earned: action.points_value,
        co2_saved: action.co2_impact,
        notes: notes?.trim() || null,
        verification_status: action.verification_required ? "pending" : "approved",
      })
      .select()
      .single()

    if (logError) {
      console.error("[v0] Action log error details:", {
        code: logError.code,
        message: logError.message,
        details: logError.details,
        hint: logError.hint,
      })
      return NextResponse.json(
        {
          error: "Failed to log action",
          details: logError.message,
          code: logError.code,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Action logged successfully:", actionLog)

    const { error: pointsError } = await supabase.from("point_transactions").insert({
      user_id: user.id,
      points: action.points_value,
      transaction_type: "earned",
      reference_type: "action",
      description: `Completed: ${action.title}`,
    })

    if (pointsError) {
      console.error("[v0] Points transaction error:", pointsError)
      // Don't fail the whole request if points fail, just log it
    }

    try {
      const { error: co2UpdateError } = await supabase
        .from("users")
        .update({
          total_co2_saved: userProfile.total_co2_saved + action.co2_impact,
        })
        .eq("id", user.id)

      if (co2UpdateError) {
        console.error("[v0] CO2 update error:", co2UpdateError)
      }
    } catch (co2Error) {
      console.error("[v0] CO2 update fallback error:", co2Error)
    }

    return NextResponse.json({
      success: true,
      action_log: actionLog,
      points_earned: action.points_value,
      co2_saved: action.co2_impact,
      verification_required: action.verification_required,
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
