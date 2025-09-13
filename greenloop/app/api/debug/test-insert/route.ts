import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Test Insert API Route",
    instructions: "Send a POST request to this endpoint to test user_actions table insertion",
    usage: "POST /api/debug/test-insert",
    note: "This will attempt to insert a test record into user_actions table to debug the 'user_id field not found' error",
  })
}

export async function POST() {
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

    console.log("-> User ID:", user.id)

    // Test 1: Try to insert with minimal data
    const testData = {
      user_id: user.id,
      action_id: "4189d418-b57a-417e-9b6e-b93eeb05cb09", // LED bulbs action
      points_earned: 60,
      co2_saved: 3.2,
      notes: "Test insert",
    }

    console.log("-> Attempting insert with data:", testData)

    const { data, error } = await supabase.from("user_actions").insert(testData).select()

    if (error) {
      console.log("-> Insert error:", error)
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      })
    }

    console.log("-> Insert successful:", data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.log("-> Catch error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
