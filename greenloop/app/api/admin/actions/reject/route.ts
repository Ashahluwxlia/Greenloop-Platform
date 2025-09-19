import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, requireAdmin, createErrorResponse, ApiException } from "@/lib/api-utils"
import { NotificationHelpers } from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await authenticateUser()
    await requireAdmin(user.id, supabase)

    const { actionId, actionLogId, rejectionReason, isSubmission } = await request.json()

    if (isSubmission) {
      const { data: action, error: actionError } = await supabase
        .from("sustainability_actions")
        .select("*, submitted_by")
        .eq("id", actionId)
        .single()

      if (actionError || !action) {
        return createErrorResponse({
          message: "Action submission not found",
          code: "ACTION_NOT_FOUND",
          status: 404,
        })
      }

      // Handle user-submitted action rejection
      const { error: updateError } = await supabase
        .from("sustainability_actions")
        .update({
          rejection_reason: rejectionReason,
        })
        .eq("id", actionId)

      if (updateError) {
        return createErrorResponse({
          message: "Failed to reject action submission",
          code: "DATABASE_ERROR",
          status: 500,
        })
      }

      try {
        await NotificationHelpers.actionRejected(action.submitted_by, action.title, rejectionReason)
      } catch (notificationError) {
        console.error("Failed to send rejection notification:", notificationError)
        // Don't fail the entire request if notification fails
      }

      return NextResponse.json({
        success: true,
        message: "Action submission rejected",
      })
    } else {
      const { data: actionLog, error: logError } = await supabase
        .from("user_actions")
        .select("*, sustainability_actions(title)")
        .eq("id", actionLogId)
        .single()

      if (logError || !actionLog) {
        return createErrorResponse({
          message: "Action log not found",
          code: "ACTION_LOG_NOT_FOUND",
          status: 404,
        })
      }

      // Handle regular action log rejection
      const { error: updateError } = await supabase
        .from("user_actions")
        .update({
          verification_status: "rejected",
          notes: rejectionReason,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", actionLogId)

      if (updateError) {
        return createErrorResponse({
          message: "Failed to reject action log",
          code: "DATABASE_ERROR",
          status: 500,
        })
      }

      try {
        await NotificationHelpers.actionRejected(
          actionLog.user_id,
          actionLog.sustainability_actions?.title || "Sustainability Action",
          rejectionReason,
        )
      } catch (notificationError) {
        console.error("Failed to send rejection notification:", notificationError)
        // Don't fail the entire request if notification fails
      }

      return NextResponse.json({
        success: true,
        message: "Action log rejected",
      })
    }
  } catch (error) {
    if (error instanceof ApiException) {
      return createErrorResponse(error.error)
    }

    console.error("Unexpected error in action rejection:", error)
    return createErrorResponse({
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}
