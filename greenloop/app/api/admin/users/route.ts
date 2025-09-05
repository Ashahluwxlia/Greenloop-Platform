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

  // Check if user is admin
  const { data: userProfile } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

  if (!userProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
  }

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        *,
        team_members (
          teams (id, name)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
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

  // Check if user is admin
  const { data: userProfile } = await supabase.from("users").select("is_admin").eq("id", user.id).single()

  if (!userProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { email, firstName, lastName, department, isAdmin } = body

    // Create user in auth
    const { data: authUser, error: authCreateError } = await supabase.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-8), // Temporary password
      email_confirm: true,
    })

    if (authCreateError) throw authCreateError

    // Create user profile
    const { data: newUser, error: profileError } = await supabase
      .from("users")
      .insert({
        id: authUser.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        department,
        is_admin: isAdmin || false,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) throw profileError

    return NextResponse.json({ user: newUser })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
