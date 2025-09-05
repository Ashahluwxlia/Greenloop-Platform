import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Target,
  Search,
  Car,
  Zap,
  Droplets,
  Recycle,
  Leaf,
  Utensils,
  Building2,
  Users,
  Laptop,
  Clock,
  Award,
} from "lucide-react"
import Link from "next/link"

const categoryIcons = {
  Transportation: Car,
  Energy: Zap,
  "Water Conservation": Droplets,
  "Waste Reduction": Recycle,
  "Food & Diet": Utensils,
  "Office Practices": Building2,
  Community: Users,
  Digital: Laptop,
}

const difficultyColors = {
  1: "bg-green-100 text-green-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-orange-100 text-orange-800",
  4: "bg-red-100 text-red-800",
  5: "bg-purple-100 text-purple-800",
}

export default async function ActionsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: userProfile } = await supabase.from("users").select("*").eq("id", data.user.id).single()

  // Get action categories
  const { data: categories } = await supabase.from("action_categories").select("*").eq("is_active", true).order("name")

  // Get all actions with categories
  const { data: actions } = await supabase
    .from("sustainability_actions")
    .select(`
      *,
      action_categories (*)
    `)
    .eq("is_active", true)
    .order("points_value", { ascending: false })

  // Get user's completed actions for this week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data: userActions } = await supabase
    .from("user_actions")
    .select("action_id")
    .eq("user_id", data.user.id)
    .gte("completed_at", oneWeekAgo.toISOString())

  const completedActionIds = new Set(userActions?.map((ua) => ua.action_id) || [])

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={userProfile} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              Sustainability Actions
            </h1>
            <p className="text-muted-foreground text-balance">
              Choose from our library of sustainability actions to make a positive environmental impact and earn points.
            </p>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search actions..." className="pl-10" />
                </div>
                <Button variant="outline">Filter by Category</Button>
              </div>
            </CardContent>
          </Card>

          {/* Categories Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
              <TabsTrigger value="all">All Actions</TabsTrigger>
              {categories?.slice(0, 4).map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {actions?.map((action) => {
                  const IconComponent =
                    categoryIcons[action.action_categories?.name as keyof typeof categoryIcons] || Leaf
                  const isCompleted = completedActionIds.has(action.id)

                  return (
                    <Card key={action.id} className={`relative ${isCompleted ? "bg-muted/50" : ""}`}>
                      {isCompleted && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Completed
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${action.action_categories?.color}20` }}
                          >
                            <IconComponent className="h-5 w-5" style={{ color: action.action_categories?.color }} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg leading-tight">{action.title}</CardTitle>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {action.action_categories?.name}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <CardDescription className="text-sm leading-relaxed">{action.description}</CardDescription>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4 text-primary" />
                              <span className="font-medium text-primary">+{action.points_value} pts</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Leaf className="h-4 w-4 text-accent" />
                              <span className="text-accent">{action.co2_impact}kg CO₂</span>
                            </div>
                          </div>

                          <Badge
                            className={`text-xs ${difficultyColors[action.difficulty_level as keyof typeof difficultyColors]}`}
                            variant="secondary"
                          >
                            Level {action.difficulty_level}
                          </Badge>
                        </div>

                        {action.estimated_time_minutes && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>~{action.estimated_time_minutes} minutes</span>
                          </div>
                        )}

                        <Button className="w-full" variant={isCompleted ? "outline" : "default"} asChild>
                          <Link href={`/actions/log/${action.id}`}>{isCompleted ? "Log Again" : "Log Action"}</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            {/* Category-specific tabs */}
            {categories?.slice(0, 4).map((category) => (
              <TabsContent key={category.id} value={category.id} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {actions
                    ?.filter((action) => action.action_categories?.id === category.id)
                    .map((action) => {
                      const IconComponent =
                        categoryIcons[action.action_categories?.name as keyof typeof categoryIcons] || Leaf
                      const isCompleted = completedActionIds.has(action.id)

                      return (
                        <Card key={action.id} className={`relative ${isCompleted ? "bg-muted/50" : ""}`}>
                          {isCompleted && (
                            <div className="absolute top-3 right-3">
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Completed
                              </Badge>
                            </div>
                          )}

                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <div
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: `${action.action_categories?.color}20` }}
                              >
                                <IconComponent className="h-5 w-5" style={{ color: action.action_categories?.color }} />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-lg leading-tight">{action.title}</CardTitle>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <CardDescription className="text-sm leading-relaxed">{action.description}</CardDescription>

                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Award className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-primary">+{action.points_value} pts</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Leaf className="h-4 w-4 text-accent" />
                                  <span className="text-accent">{action.co2_impact}kg CO₂</span>
                                </div>
                              </div>

                              <Badge
                                className={`text-xs ${difficultyColors[action.difficulty_level as keyof typeof difficultyColors]}`}
                                variant="secondary"
                              >
                                Level {action.difficulty_level}
                              </Badge>
                            </div>

                            {action.estimated_time_minutes && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>~{action.estimated_time_minutes} minutes</span>
                              </div>
                            )}

                            <Button className="w-full" variant={isCompleted ? "outline" : "default"} asChild>
                              <Link href={`/actions/log/${action.id}`}>{isCompleted ? "Log Again" : "Log Action"}</Link>
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  )
}
