"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Calendar, GraduationCap, Filter, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ContentCrudModal } from "@/components/admin/content-crud-modal"
import { useToast } from "@/hooks/use-toast"
import { Navigation } from "@/components/navigation"

interface EducationalContent {
  id: string
  title: string
  content: string
  category: string
  status: "draft" | "published" | "archived"
  tags: string[]
  points?: number
  co2_impact?: number
  created_at: string
  updated_at: string
  type?: "educational"
}

export default function EducationPage() {
  const [educationalContent, setEducationalContent] = useState<EducationalContent[]>([])
  const [filteredContent, setFilteredContent] = useState<EducationalContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<EducationalContent | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create")

  const supabase = createClient()
  const { toast } = useToast()

  const loadEducationalContent = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authData?.user) {
        const { data: profile } = await supabase.from("users").select("*").eq("id", authData.user.id).single()

        if (profile?.is_admin && profile?.is_active) {
          setIsAdmin(true)
          setUserProfile(profile)
        } else {
          setUserProfile(profile)
        }
      }

      const response = await fetch("/api/education?status=published")
      if (!response.ok) {
        throw new Error("Failed to fetch educational content")
      }

      const result = await response.json()
      const data = result.data || []

      setEducationalContent(data)
      setFilteredContent(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEducationalContent()
  }, [])

  useEffect(() => {
    if (selectedCategory === "all") {
      setFilteredContent(educationalContent)
    } else {
      setFilteredContent(educationalContent.filter((content) => content.category === selectedCategory))
    }
  }, [selectedCategory, educationalContent])

  const handleCreateContent = () => {
    setSelectedContent(null)
    setModalMode("create")
    setModalOpen(true)
  }

  const handleSaveContent = async (contentData: any) => {
    loadEducationalContent()
    setModalOpen(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Energy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Transportation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Waste: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Water: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
      Food: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      General: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    }
    return colors[category] || colors.General
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Energy":
        return "⚡"
      case "Transportation":
        return "🚗"
      case "Waste":
        return "♻️"
      case "Water":
        return "💧"
      case "Food":
        return "🍃"
      default:
        return "📚"
    }
  }

  const categories = [...new Set(educationalContent.map((content) => content.category))].sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={userProfile} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading educational content...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={userProfile} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-destructive">Error loading educational content: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={userProfile} />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-full">
                <GraduationCap className="h-6 w-6 text-accent" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Educational Resources</h1>
            </div>
            {isAdmin && (
              <Button onClick={handleCreateContent}>
                <Plus className="h-4 w-4 mr-2" />
                Create Educational Content
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            Learn about sustainability practices and environmental impact through our curated educational content.
          </p>
        </div>

        {categories.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by category:</span>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {getCategoryIcon(category)} {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {filteredContent.length > 0 ? (
            filteredContent.map((content) => (
              <Card key={content.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2 flex items-center gap-2">
                        <span className="text-2xl">{getCategoryIcon(content.category)}</span>
                        {content.title}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(content.created_at)}
                        </div>
                        <Badge className={getCategoryColor(content.category)}>{content.category}</Badge>
                        {content.points && content.points > 0 && (
                          <Badge variant="secondary">{content.points} points</Badge>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-accent/10 rounded-full">
                      <BookOpen className="h-5 w-5 text-accent" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{content.content}</p>
                  </div>

                  {content.co2_impact && content.co2_impact > 0 && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                        <span className="font-medium">Environmental Impact:</span>
                        <span>Learn how to save {content.co2_impact}kg CO₂</span>
                      </div>
                    </div>
                  )}

                  {content.tags && content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {content.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-muted/50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {selectedCategory === "all" ? "No Educational Content Yet" : `No ${selectedCategory} Content`}
              </h3>
              <p className="text-muted-foreground mb-4">
                {selectedCategory === "all"
                  ? "There are currently no educational resources to display. Check back later for new content!"
                  : `No educational content found for the ${selectedCategory} category. Try selecting a different category.`}
              </p>
              <div className="flex gap-2 justify-center">
                {selectedCategory !== "all" && (
                  <Button variant="outline" onClick={() => setSelectedCategory("all")}>
                    View All Content
                  </Button>
                )}
                {isAdmin && (
                  <Button onClick={handleCreateContent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Educational Content
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <ContentCrudModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveContent}
          content={selectedContent ? { ...selectedContent, type: "educational" as const } : null}
          mode={modalMode}
          currentAdminId={userProfile?.id}
          restrictedType="educational"
        />
      )}
    </div>
  )
}
