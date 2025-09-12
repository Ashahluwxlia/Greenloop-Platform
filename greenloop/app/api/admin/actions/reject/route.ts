import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, requireAdmin, createErrorResponse, ApiException } from "@/lib/api-utils"

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await authenticateUser()
    await requireAdmin(user.id, supabase)

    const { actionId, actionLogId, rejectionReason, isSubmission } = await request.json()

    if (isSubmission) {
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

      return NextResponse.json({
        success: true,
        message: "Action submission rejected",
      })
    } else {
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
