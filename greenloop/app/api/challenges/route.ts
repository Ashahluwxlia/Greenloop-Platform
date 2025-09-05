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
    const { data: challenges, error } = await supabase
      .from("challenges")
      .select(`
        *,
        challenge_participants (
          id,
          user_id,
          team_id,
          current_progress,
          completed
        )
      `)
      .eq("is_active", true)
      .gte("end_date", new Date().toISOString())
      .order("start_date", { ascending: false })

    if (error) throw error

    return NextResponse.json({ challenges })
  } catch (error) {
    console.error("Error fetching challenges:", error)
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 })
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
    const body = await request.json()
    const {
      title,
      description,
      challengeType,
      category,
      startDate,
      endDate,
      pointsReward,
      targetValue,
      maxParticipants,
    } = body

    const { data: challenge, error } = await supabase
      .from("challenges")
      .insert({
        title,
        description,
        challenge_type: challengeType,
        category,
        start_date: startDate,
        end_date: endDate,
        points_reward: pointsReward,
        target_value: targetValue,
        max_participants: maxParticipants,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ challenge })
  } catch (error) {
    console.error("Error creating challenge:", error)
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 })
  }
}
