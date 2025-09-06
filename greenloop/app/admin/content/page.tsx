"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { InteractiveSearch } from "@/components/admin/interactive-search"
import { ContentCrudModal } from "@/components/admin/content-crud-modal"
import { ActionDropdown } from "@/components/admin/action-dropdown"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Plus, Calendar, Globe } from "lucide-react"

interface ContentItem {
  id: string
  title: string
  content?: string
  description?: string
  type: "action" | "announcement" | "educational" | "challenge"
  category: string
  status: "draft" | "published" | "archived"
  points?: number
  co2_impact?: number
  tags: string[]
  is_active?: boolean
  points_value?: number
  created_at: string
  updated_at?: string
  created_by?: string
}

export default function AdminContentPage() {
  const [sustainabilityActions, setSustainabilityActions] = useState<ContentItem[]>([])
  const [announcements, setAnnouncements] = useState<ContentItem[]>([])
  const [educationalContent, setEducationalContent] = useState<ContentItem[]>([])
  const [filteredActions, setFilteredActions] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create")
  const [activeTab, setActiveTab] = useState("actions")

  const supabase = createClient()

  const loadData = async () => {
    try {
      // Check authentication
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData?.user) {
        window.location.href = "/auth/login"
        return
      }

      // Check if user is admin
      const { data: profile } = await supabase.from("users").select("*").eq("id", authData.user.id).single()

      if (!profile?.is_admin) {
        window.location.href = "/dashboard"
        return
      }

      setUserProfile(profile)

      // Get sustainability actions
      const { data: actionsData } = await supabase
        .from("sustainability_actions")
        .select("*")
        .order("created_at", { ascending: false })

      // Transform actions data to match ContentItem interface
      const transformedActions =
        actionsData?.map((action) => ({
          ...action,
          type: "action" as const,
          status: action.is_active ? ("published" as const) : ("draft" as const),
          points: action.points_value,
          tags: action.tags || [],
        })) || []

      setSustainabilityActions(transformedActions)
      setFilteredActions(transformedActions)

      // Get announcements from content_items table
      const { data: announcementsData } = await supabase
        .from("content_items")
        .select("*")
        .eq("type", "announcement")
        .order("created_at", { ascending: false })

      setAnnouncements(announcementsData || [])

      // Get educational content from content_items table
      const { data: educationalData } = await supabase
        .from("content_items")
        .select("*")
        .eq("type", "educational")
        .order("created_at", { ascending: false })

      setEducationalContent(educationalData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateContent = () => {
    setSelectedContent(null)
    setModalMode("create")
    setModalOpen(true)
  }

  const handleEditContent = (content: ContentItem) => {
    setSelectedContent(content)
    setModalMode("edit")
    setModalOpen(true)
  }

  const handleViewContent = (content: ContentItem) => {
    setSelectedContent(content)
    setModalMode("view")
    setModalOpen(true)
  }

  const handleSaveContent = async (contentData: ContentItem) => {
    try {
      if (modalMode === "create") {
        if (contentData.type === "action") {
          await supabase.from("sustainability_actions").insert({
            title: contentData.title,
            description: contentData.content,
            category: contentData.category,
            points_value: contentData.points,
            co2_impact: contentData.co2_impact,
            is_active: contentData.status === "published",
            tags: contentData.tags,
          })
        } else {
          await supabase.from("content_items").insert({
            ...contentData,
            created_by: userProfile?.id, // Use current admin's ID
          })
        }
      } else if (modalMode === "edit" && selectedContent) {
        if (contentData.type === "action") {
          await supabase
            .from("sustainability_actions")
            .update({
              title: contentData.title,
              description: contentData.content,
              category: contentData.category,
              points_value: contentData.points,
              co2_impact: contentData.co2_impact,
              is_active: contentData.status === "published",
              tags: contentData.tags,
            })
            .eq("id", selectedContent.id)
        } else {
          await supabase.from("content_items").update(contentData).eq("id", selectedContent.id)
        }
      }
      loadData()
    } catch (error) {
      console.error("Error saving content:", error)
    }
  }

  const handleContentAction = async (action: string, content: ContentItem) => {
    switch (action) {
      case "view":
        handleViewContent(content)
        break
      case "edit":
        handleEditContent(content)
        break
      case "toggle-status":
        if (content.type === "action") {
          await supabase
            .from("sustainability_actions")
            .update({
              is_active: !content.is_active,
            })
            .eq("id", content.id)
        } else {
          await supabase
            .from("content_items")
            .update({
              status: content.status === "published" ? "draft" : "published",
            })
            .eq("id", content.id)
        }
        loadData()
        break
      case "duplicate":
        const { id, ...duplicateData } = content
        const newContent = {
          ...duplicateData,
          title: `${content.title} (Copy)`,
        }
        await handleSaveContent(newContent)
        break
      case "delete":
        if (confirm(`Are you sure you want to delete "${content.title}"?`)) {
          if (content.type === "action") {
            await supabase.from("sustainability_actions").delete().eq("id", content.id)
          } else {
            await supabase.from("content_items").delete().eq("id", content.id)
          }
          loadData()
        }
        break
    }
  }

  const handleExport = () => {
    const csvContent = [
      ["Title", "Type", "Category", "Status", "Points", "CO2 Impact", "Created"].join(","),
      ...filteredActions.map((item) =>
        [
          `"${item.title}"`,
          item.type,
          item.category,
          item.status,
          item.points || 0,
          item.co2_impact || 0,
          new Date(item.created_at).toLocaleDateString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `content-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filterOptions = [
    {
      key: "category",
      label: "Category",
      values: [...new Set(sustainabilityActions.map((item) => item.category).filter(Boolean))].sort(),
    },
    {
      key: "status",
      label: "Status",
      values: ["published", "draft", "archived"],
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 p-8">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 p-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                Content Management
              </h1>
              <p className="text-muted-foreground">
                Manage platform content, sustainability actions, announcements, and educational resources.
              </p>
            </div>
            <Button onClick={handleCreateContent}>
              <Plus className="h-4 w-4 mr-2" />
              Create Content
            </Button>
          </div>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="actions">Sustainability Actions</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="educational">Educational Content</TabsTrigger>
              <TabsTrigger value="settings">Content Settings</TabsTrigger>
            </TabsList>

            {/* Sustainability Actions Tab */}
            <TabsContent value="actions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Sustainability Actions</CardTitle>
                  <CardDescription>
                    Find and filter sustainability actions by title, category, or status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InteractiveSearch
                    data={sustainabilityActions}
                    onFilteredData={setFilteredActions}
                    searchFields={["title", "description", "category"]}
                    filterOptions={filterOptions}
                    placeholder="Search by title, description, or category..."
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>

              {/* Actions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Sustainability Actions ({filteredActions.length})</CardTitle>
                  <CardDescription>Manage available sustainability actions for users</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>CO₂ Impact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActions.map((action) => (
                        <TableRow key={action.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{action.title}</p>
                              <p className="text-sm text-muted-foreground">{action.description || action.content}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{action.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{action.points || action.points_value}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{action.co2_impact}kg</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={action.status === "published" || action.is_active ? "default" : "secondary"}
                            >
                              {action.status === "published" || action.is_active ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(action.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <ActionDropdown
                              type="content"
                              onView={() => handleViewContent(action)}
                              onEdit={() => handleEditContent(action)}
                              onToggleStatus={() => handleContentAction("toggle-status", action)}
                              onDelete={() => handleContentAction("delete", action)}
                              isActive={action.status === "published" || action.is_active}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Announcements Tab */}
            <TabsContent value="announcements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Announcements ({announcements.length})</CardTitle>
                  <CardDescription>Manage announcements and notifications for users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {announcements.length ? (
                      announcements.map((announcement) => (
                        <div
                          key={announcement.id}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <Globe className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{announcement.title}</p>
                              <p className="text-sm text-muted-foreground">{announcement.content}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={announcement.status === "published" ? "default" : "secondary"}>
                              {announcement.status === "published" ? "Published" : "Draft"}
                            </Badge>
                            <ActionDropdown
                              type="content"
                              onView={() => handleViewContent(announcement)}
                              onEdit={() => handleEditContent(announcement)}
                              onDelete={() => handleContentAction("delete", announcement)}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No announcements found</p>
                        <Button className="mt-4" onClick={handleCreateContent}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create First Announcement
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Educational Content Tab */}
            <TabsContent value="educational" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Educational Resources ({educationalContent.length})</CardTitle>
                  <CardDescription>Manage educational content and sustainability guides</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {educationalContent.length ? (
                      educationalContent.map((content) => (
                        <div key={content.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/10 rounded-full">
                              <FileText className="h-4 w-4 text-accent" />
                            </div>
                            <div>
                              <p className="font-medium">{content.title}</p>
                              <p className="text-sm text-muted-foreground">{content.content}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{content.category}</Badge>
                            <ActionDropdown
                              type="content"
                              onView={() => handleViewContent(content)}
                              onEdit={() => handleEditContent(content)}
                              onDelete={() => handleContentAction("delete", content)}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No educational content found</p>
                        <Button className="mt-4" onClick={handleCreateContent}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Educational Content
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Content Moderation</CardTitle>
                    <CardDescription>Configure content approval and moderation settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto-approve content</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically approve new sustainability actions
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Content review queue</p>
                        <p className="text-sm text-muted-foreground">Require admin approval for new content</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Content Categories</CardTitle>
                    <CardDescription>Manage content categories and tags</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Energy</Badge>
                      <Badge variant="secondary">Transportation</Badge>
                      <Badge variant="secondary">Waste</Badge>
                      <Badge variant="secondary">Water</Badge>
                      <Badge variant="secondary">Food</Badge>
                    </div>
                    <Button variant="outline" className="w-full bg-transparent">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <ContentCrudModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveContent}
        content={selectedContent}
        mode={modalMode}
        currentAdminId={userProfile?.id} // Pass current admin ID to modal
      />
    </div>
  )
}
