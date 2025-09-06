import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get sustainability actions with categories
    const { data: actions, error } = await supabase
      .from("sustainability_actions")
      .select(`
        *,
        action_categories!inner(
          name,
          description,
          color
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching sustainability actions:", error)
      return NextResponse.json({ error: "Failed to fetch actions" }, { status: 500 })
    }

    return NextResponse.json({ data: actions })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userProfile } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

    if (!userProfile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      instructions,
      category_id,
      points_value,
      co2_impact,
      difficulty_level,
      estimated_time_minutes,
      verification_required,
      is_active,
    } = body

    // Validate required fields
    if (!title || !description || !category_id || !points_value || co2_impact === undefined) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, description, category_id, points_value, co2_impact",
        },
        { status: 400 },
      )
    }

    // Validate data types and ranges
    if (typeof points_value !== "number" || points_value < 1 || points_value > 1000) {
      return NextResponse.json(
        {
          error: "Points value must be a number between 1 and 1000",
        },
        { status: 400 },
      )
    }

    if (typeof co2_impact !== "number" || co2_impact < 0) {
      return NextResponse.json(
        {
          error: "CO2 impact must be a non-negative number",
        },
        { status: 400 },
      )
    }

    // Verify category exists
    const { data: category } = await supabase
      .from("action_categories")
      .select("id")
      .eq("id", category_id)
      .eq("is_active", true)
      .single()

    if (!category) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })
    }

    const actionData = {
      title: title.trim(),
      description: description.trim(),
      instructions: instructions?.trim() || null,
      category_id,
      points_value: Number(points_value),
      co2_impact: Number(co2_impact),
      difficulty_level: Number(difficulty_level) || 1,
      estimated_time_minutes: estimated_time_minutes ? Number(estimated_time_minutes) : null,
      verification_required: Boolean(verification_required),
      is_active: Boolean(is_active),
    }

    const { data: newAction, error: insertError } = await supabase
      .from("sustainability_actions")
      .insert([actionData])
      .select()
      .single()

    if (insertError) {
      console.error("Error creating sustainability action:", insertError)
      return NextResponse.json({ error: "Failed to create action" }, { status: 500 })
    }

    // Log admin activity
    await supabase.rpc("log_admin_activity", {
      p_admin_user_id: user.id,
      p_action: "sustainability_action_created",
      p_resource_type: "sustainability_actions",
      p_resource_id: newAction.id,
      p_details: {
        title: actionData.title,
        category_id: actionData.category_id,
        points_value: actionData.points_value,
      },
    })

    return NextResponse.json(
      {
        data: newAction,
        message: "Sustainability action created successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
