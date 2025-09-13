import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: tableInfo, error: tableError } = await supabase.rpc("get_table_columns", {
      table_name_param: "user_actions",
      schema_name_param: "public",
    })

    // If RPC doesn't exist, try a simpler approach
    if (tableError) {
      const { data: actionsData, error: actionsError } = await supabase.from("user_actions").select("*").limit(0)

      return NextResponse.json({
        tableExists: !actionsError,
        tableStructure: null,
        canQuery: !actionsError,
        queryError: actionsError,
        sampleData: [],
        note: "Could not check table structure, but tested table access directly",
      })
    }

    // Check if we can query the user_actions table
    const { data: actionsData, error: actionsError } = await supabase.from("user_actions").select("*").limit(1)

    return NextResponse.json({
      tableExists: tableInfo && tableInfo.length > 0,
      tableStructure: tableInfo,
      canQuery: !actionsError,
      queryError: actionsError,
      sampleData: actionsData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Database connection failed",
        details: error,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Try to insert a test record
    const testData = {
      user_id: user.id,
      action_id: "00000000-0000-0000-0000-000000000001", // dummy UUID
      points_earned: 10,
      co2_saved: 1.5,
      notes: "Test action log",
      verification_status: "approved",
    }

    console.log("-> Attempting to insert test data:", testData)

    const { data, error } = await supabase.from("user_actions").insert(testData).select()

    if (error) {
      console.log("-> Insert error:", error)
      return NextResponse.json(
        {
          error: "Failed to insert test record",
          details: error,
          testData,
        },
        { status: 500 },
      )
    }

    console.log("-> Insert successful:", data)

    return NextResponse.json({
      success: true,
      insertedData: data,
      testData,
    })
  } catch (error) {
    console.log("-> Catch error:", error)
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error,
      },
      { status: 500 },
    )
  }
}
