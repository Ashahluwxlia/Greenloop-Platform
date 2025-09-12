"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Megaphone, Calendar, Globe, Plus } from "lucide-react"
import { ContentCrudModal } from "@/components/admin/content-crud-modal"
import { useToast } from "@/hooks/use-toast"
import { Navigation } from "@/components/navigation"

interface Announcement {
  id: string
  title: string
  content: string
  category: string
  status: "draft" | "published" | "archived"
  tags: string[]
  created_at: string
  updated_at: string
  type?: "announcement"
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<Announcement | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create")

  const supabase = createClient()
  const { toast } = useToast()

  const loadAnnouncements = async () => {
    try {
      // Check authentication and admin status
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

      // Use API route to fetch announcements
      const response = await fetch("/api/announcements?status=published")
      if (!response.ok) {
        throw new Error("Failed to fetch announcements")
      }

      const result = await response.json()
      const data = result.data || []

      setAnnouncements(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const handleCreateContent = () => {
    setSelectedContent(null)
    setModalMode("create")
    setModalOpen(true)
  }

  const handleSaveContent = async (contentData: any) => {
    // The ContentCrudModal already handles the API call in its handleSubmit function
    // Just refresh the data after modal completes its save operation
    loadAnnouncements()
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
      Energy: "bg-yellow-100 text-yellow-800",
      Transportation: "bg-blue-100 text-blue-800",
      Waste: "bg-green-100 text-green-800",
      Water: "bg-cyan-100 text-cyan-800",
      Food: "bg-orange-100 text-orange-800",
      General: "bg-gray-100 text-gray-800",
    }
    return colors[category] || colors.General
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={userProfile} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading announcements...</p>
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
            <p className="text-destructive">Error loading announcements: {error}</p>
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
              <div className="p-2 bg-primary/10 rounded-full">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Announcements</h1>
            </div>
            {isAdmin && (
              <Button onClick={handleCreateContent}>
                <Plus className="h-4 w-4 mr-2" />
                Create Announcement
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            Stay updated with the latest news and important information from GreenLoop.
          </p>
        </div>

        <div className="space-y-6">
          {announcements.length > 0 ? (
            announcements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{announcement.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(announcement.created_at)}
                        </div>
                        <Badge className={getCategoryColor(announcement.category)}>{announcement.category}</Badge>
                      </div>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
                  </div>

                  {announcement.tags && announcement.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {announcement.tags.map((tag, index) => (
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
                <Megaphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Announcements Yet</h3>
              <p className="text-muted-foreground mb-4">
                There are currently no announcements to display. Check back later for updates!
              </p>
              <div className="flex gap-2 justify-center">
                {isAdmin && (
                  <Button onClick={handleCreateContent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Announcement
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
          content={selectedContent ? { ...selectedContent, type: "announcement" as const } : null}
          mode={modalMode}
          currentAdminId={userProfile?.id}
          restrictedType="announcement"
        />
      )}
    </div>
  )
}
