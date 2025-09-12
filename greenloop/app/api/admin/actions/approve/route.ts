import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, requireAdmin, createErrorResponse, ApiException } from "@/lib/api-utils"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await authenticateUser()
    await requireAdmin(user.id, supabase)

    const { actionId, actionLogId, pointsValue, co2Impact, isSubmission } = await request.json()

    if (isSubmission) {
      // Handle user-submitted action approval
      const { data: action, error: actionError } = await supabase
        .from("sustainability_actions")
        .select("*, users!submitted_by(*)")
        .eq("id", actionId)
        .eq("is_user_created", true)
        .single()

      if (actionError || !action) {
        return createErrorResponse({
          message: "Action submission not found",
          code: "ACTION_NOT_FOUND",
          status: 404,
        })
      }

      // Update the action to be active and approved
      const { error: updateError } = await supabase
        .from("sustainability_actions")
        .update({
          is_active: true,
          points_value: pointsValue,
          co2_impact: co2Impact,
          auto_logged_for_submitter: true,
        })
        .eq("id", actionId)

      if (updateError) {
        return createErrorResponse({
          message: "Failed to approve action",
          code: "DATABASE_ERROR",
          status: 500,
        })
      }

      // Auto-log the action for the submitter
      const adminSupabase = createAdminClient()

      const { data: userActionLog, error: logError } = await adminSupabase
        .from("user_actions")
        .insert({
          user_id: action.submitted_by,
          action_id: actionId,
          points_earned: pointsValue,
          co2_saved: co2Impact,
          verification_status: "approved",
          notes: "Auto-logged upon action approval",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (logError) {
        return createErrorResponse({
          message: "Failed to auto-log action for submitter",
          code: "DATABASE_ERROR",
          status: 500,
        })
      }

      // Update user points and CO2 totals
      const { data: userProfile } = await supabase
        .from("users")
        .select("points, total_co2_saved")
        .eq("id", action.submitted_by)
        .single()

      if (userProfile) {
        await adminSupabase
          .from("users")
          .update({
            points: userProfile.points + pointsValue,
            total_co2_saved: userProfile.total_co2_saved + co2Impact,
          })
          .eq("id", action.submitted_by)

        // Create points transaction
        await adminSupabase.from("point_transactions").insert({
          user_id: action.submitted_by,
          points: pointsValue,
          transaction_type: "earned",
          reference_type: "action",
          reference_id: userActionLog.id,
          description: `Completed: ${action.title}`,
        })
      }

      return NextResponse.json({
        success: true,
        message: "Action approved and auto-logged for submitter",
      })
    } else {
      // Handle regular action log approval
      const { data: actionLog, error: logError } = await supabase
        .from("user_actions")
        .select("*, users(*), sustainability_actions(*)")
        .eq("id", actionLogId)
        .single()

      if (logError || !actionLog) {
        return createErrorResponse({
          message: "Action log not found",
          code: "ACTION_LOG_NOT_FOUND",
          status: 404,
        })
      }

      // Update verification status
      const { error: updateError } = await supabase
        .from("user_actions")
        .update({
          verification_status: "approved",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", actionLogId)

      if (updateError) {
        return createErrorResponse({
          message: "Failed to approve action log",
          code: "DATABASE_ERROR",
          status: 500,
        })
      }

      // Award points and update CO2 totals
      const adminSupabase = createAdminClient()

      const { data: userProfile } = await supabase
        .from("users")
        .select("points, total_co2_saved")
        .eq("id", actionLog.user_id)
        .single()

      if (userProfile) {
        await adminSupabase
          .from("users")
          .update({
            points: userProfile.points + actionLog.points_earned,
            total_co2_saved: userProfile.total_co2_saved + actionLog.co2_saved,
          })
          .eq("id", actionLog.user_id)

        // Create points transaction
        await adminSupabase.from("point_transactions").insert({
          user_id: actionLog.user_id,
          points: actionLog.points_earned,
          transaction_type: "earned",
          reference_type: "action",
          reference_id: actionLogId,
          description: `Completed: ${actionLog.sustainability_actions.title}`,
        })
      }

      return NextResponse.json({
        success: true,
        message: "Action log approved and points awarded",
      })
    }
  } catch (error) {
    if (error instanceof ApiException) {
      return createErrorResponse(error.error)
    }

    console.error("Unexpected error in action approval:", error)
    return createErrorResponse({
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}
