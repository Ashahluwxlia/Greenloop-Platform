"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { UserActionSubmissionModal } from "@/components/user-action-submission-modal"
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
  Filter,
  Plus,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
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

export default function ActionsPage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [filteredActions, setFilteredActions] = useState<any[]>([])
  const [personalActions, setPersonalActions] = useState<any[]>([])
  const [completedActionIds, setCompletedActionIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  const loadPersonalActions = async (userId: string) => {
    const { data: personalActionsData } = await supabase
      .from("sustainability_actions")
      .select(`
        *,
        action_categories (*)
      `)
      .eq("is_user_created", true)
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false })

    setPersonalActions(personalActionsData || [])
  }

  useEffect(() => {
    async function loadData() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData?.user) {
          router.push("/auth/login")
          return
        }

        // Get user profile
        const { data: profile } = await supabase.from("users").select("*").eq("id", userData.user.id).single()
        setUserProfile(profile)

        // Get action categories
        const { data: categoriesData } = await supabase
          .from("action_categories")
          .select("*")
          .eq("is_active", true)
          .order("name")
        setCategories(categoriesData || [])

        // Get all active actions with categories (admin-created only)
        const { data: actionsData } = await supabase
          .from("sustainability_actions")
          .select(`
            *,
            action_categories (*)
          `)
          .eq("is_active", true)
          .eq("is_user_created", false)
          .order("points_value", { ascending: false })
        setActions(actionsData || [])
        setFilteredActions(actionsData || [])

        await loadPersonalActions(userData.user.id)

        // Get user's completed actions for this week
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

        const { data: userActions } = await supabase
          .from("user_actions")
          .select("action_id")
          .eq("user_id", userData.user.id)
          .gte("completed_at", oneWeekAgo.toISOString())

        setCompletedActionIds(new Set(userActions?.map((ua) => ua.action_id) || []))
      } catch (err) {
        console.error("Failed to load data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleCategoryFilter = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const clearFilters = () => {
    setSelectedCategories([])
    setSearchTerm("")
  }

  const handleSubmissionSuccess = async () => {
    if (userProfile?.id) {
      await loadPersonalActions(userProfile.id)
    }
  }

  const getStatusBadge = (action: any) => {
    if (action.is_active) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      )
    } else if (action.rejection_reason) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={userProfile} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading actions...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={userProfile} />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Target className="h-8 w-8 text-primary" />
                Sustainability Actions
              </h1>
              <p className="text-muted-foreground text-balance">
                Choose from our library of sustainability actions to make a positive environmental impact and earn
                points.
              </p>
            </div>
            <div className="flex gap-3">
              <UserActionSubmissionModal onSubmissionSuccess={handleSubmissionSuccess} />
              {userProfile?.is_admin && (
                <Button asChild>
                  <Link href="/admin/actions/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Action
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search actions..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter by Category
                      {selectedCategories.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedCategories.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {categories.map((category) => (
                      <DropdownMenuItem
                        key={category.id}
                        onClick={() => handleCategoryFilter(category.id)}
                        className="flex items-center justify-between"
                      >
                        <span>{category.name}</span>
                        {selectedCategories.includes(category.id) && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    {selectedCategories.length > 0 && (
                      <>
                        <div className="border-t my-1" />
                        <DropdownMenuItem onClick={clearFilters}>Clear Filters</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {(selectedCategories.length > 0 || searchTerm) && (
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {searchTerm && <Badge variant="secondary">Search: "{searchTerm}"</Badge>}
                  {selectedCategories.map((categoryId) => {
                    const category = categories.find((c) => c.id === categoryId)
                    return (
                      <Badge key={categoryId} variant="secondary">
                        {category?.name}
                      </Badge>
                    )
                  })}
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="all">All Actions</TabsTrigger>
              <TabsTrigger value="personal">
                <User className="h-4 w-4 mr-1" />
                Personal
              </TabsTrigger>
              {categories?.slice(0, 4).map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="personal" className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {personalActions.length} personal action{personalActions.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {personalActions.map((action) => {
                  const IconComponent =
                    categoryIcons[action.action_categories?.name as keyof typeof categoryIcons] || Leaf

                  return (
                    <Card key={action.id} className="relative">
                      <div className="absolute top-3 right-3">{getStatusBadge(action)}</div>

                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${action.action_categories?.color}20` }}
                          >
                            <IconComponent className="h-5 w-5" style={{ color: action.action_categories?.color }} />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg leading-tight pr-20">{action.title}</CardTitle>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {action.action_categories?.name}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <CardDescription className="text-sm leading-relaxed">{action.description}</CardDescription>

                        {action.rejection_reason && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                              <strong>Rejection Reason:</strong> {action.rejection_reason}
                            </p>
                          </div>
                        )}

                        {action.is_active && (
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
                          </div>
                        )}

                        {action.is_active && (
                          <Button className="w-full" asChild>
                            <Link href={`/actions/log/${action.id}`}>Log Action</Link>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {personalActions.length === 0 && (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No personal actions yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Submit your first sustainability action for admin review.
                  </p>
                  <UserActionSubmissionModal onSubmissionSuccess={handleSubmissionSuccess} />
                </div>
              )}
            </TabsContent>

            <TabsContent value={activeTab} className="space-y-6">
              {activeTab !== "personal" && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredActions.length} of {actions.length} actions
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredActions.map((action) => {
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

                  {filteredActions.length === 0 && (
                    <div className="text-center py-12">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">No actions found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Try adjusting your search terms or filters to find more actions.
                      </p>
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
