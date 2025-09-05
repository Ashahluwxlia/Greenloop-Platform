import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Target, Search, Plus, MoreHorizontal, Calendar, Users } from "lucide-react"

export default async function AdminChallengesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  if (!userProfile?.is_admin) {
    redirect("/dashboard")
  }

  // Get all challenges with their stats
  const { data: challenges } = await supabase
    .from("challenges")
    .select(`
      *,
      challenge_participants (
        id,
        completed,
        current_progress
      ),
      users!challenges_created_by_fkey (
        first_name,
        last_name
      )
    `)
    .order("created_at", { ascending: false })

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Target className="h-8 w-8 text-primary" />
                Challenge Management
              </h1>
              <p className="text-muted-foreground">
                Create, monitor, and manage sustainability challenges across the organization.
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Search Challenges</CardTitle>
              <CardDescription>Find and filter challenges by title, category, or status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by challenge title or category..." className="pl-10" />
                </div>
                <Button variant="outline">Filter</Button>
                <Button variant="outline">Export</Button>
              </div>
            </CardContent>
          </Card>

          {/* Challenges Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Challenges ({challenges?.length || 0})</CardTitle>
              <CardDescription>Complete list of challenges with participation and completion metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challenge</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challenges?.map((challenge) => {
                    const participants = challenge.challenge_participants?.length || 0
                    const completed = challenge.challenge_participants?.filter((p) => p.completed).length || 0
                    const completionRate = participants > 0 ? (completed / participants) * 100 : 0
                    const isActive = challenge.is_active && new Date(challenge.end_date) > new Date()

                    return (
                      <TableRow key={challenge.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{challenge.title}</p>
                            <p className="text-sm text-muted-foreground">{challenge.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{challenge.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{challenge.challenge_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {participants} / {challenge.max_participants || "∞"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={completionRate} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {Math.round(completionRate)}% ({completed}/{participants})
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Ended"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(challenge.start_date).toLocaleDateString()} -{" "}
                              {new Date(challenge.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
