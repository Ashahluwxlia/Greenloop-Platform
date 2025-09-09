"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SettingsIcon, Bell, Mail, Shield, Trash2, Download, AlertCircle, CheckCircle, Eye } from "lucide-react"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    weekly_digest: true,
    achievement_alerts: true,
    leaderboard_updates: false,
    team_invitations: true,
    profile_visibility: "public",
    leaderboard_participation: true,
    analytics_sharing: true,
  })
  const [accountInfo, setAccountInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData?.user) {
          router.push("/auth/login")
          return
        }

        const response = await fetch("/api/settings", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch settings")
        }

        const data = await response.json()
        const { preferences: userPreferences, account } = data

        // Get user profile for navigation
        const { data: userProfile } = await supabase.from("users").select("*").eq("id", userData.user.id).single()
        setUser(userProfile)

        if (userPreferences) {
          setPreferences(userPreferences)
        }

        setAccountInfo(account)
      } catch (err) {
        setError("Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [router, supabase])

  const handleSettingChange = (key: string, value: boolean | string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings")
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/settings/export", {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Failed to export data")
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get("Content-Disposition")
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `greenloop-data-export-${new Date().toISOString().split("T")[0]}.json`

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || "Failed to export data")
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    if (deleteConfirmText !== "DELETE MY ACCOUNT") {
      setError("Please type 'DELETE MY ACCOUNT' to confirm")
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch("/api/settings/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationText: deleteConfirmText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account")
      }

      // Redirect to login after successful deletion
      router.push("/auth/login")
    } catch (err: any) {
      setError(err.message || "Failed to delete account")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading settings...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-primary" />
              Settings
            </h1>
            <p className="text-muted-foreground">Manage your account preferences and privacy settings.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Settings Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose what notifications you'd like to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={preferences.email_notifications}
                      onCheckedChange={(checked) => handleSettingChange("email_notifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="weeklyDigest">Weekly Digest</Label>
                      <p className="text-sm text-muted-foreground">Weekly summary of your sustainability progress</p>
                    </div>
                    <Switch
                      id="weeklyDigest"
                      checked={preferences.weekly_digest}
                      onCheckedChange={(checked) => handleSettingChange("weekly_digest", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="achievementAlerts">Achievement Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when you earn badges or reach milestones
                      </p>
                    </div>
                    <Switch
                      id="achievementAlerts"
                      checked={preferences.achievement_alerts}
                      onCheckedChange={(checked) => handleSettingChange("achievement_alerts", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="leaderboardUpdates">Leaderboard Updates</Label>
                      <p className="text-sm text-muted-foreground">Notifications about your ranking changes</p>
                    </div>
                    <Switch
                      id="leaderboardUpdates"
                      checked={preferences.leaderboard_updates}
                      onCheckedChange={(checked) => handleSettingChange("leaderboard_updates", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="teamInvitations">Team Invitations</Label>
                      <p className="text-sm text-muted-foreground">Receive invitations to join teams and challenges</p>
                    </div>
                    <Switch
                      id="teamInvitations"
                      checked={preferences.team_invitations}
                      onCheckedChange={(checked) => handleSettingChange("team_invitations", checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Privacy & Security */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy & Security Controls
                  </CardTitle>
                  <CardDescription>Control your privacy and data sharing preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Profile Visibility</Label>
                      <p className="text-sm text-muted-foreground">Control who can see your profile and achievements</p>
                    </div>
                    <Select
                      value={preferences.profile_visibility}
                      onValueChange={(value) => handleSettingChange("profile_visibility", value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Public
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Private
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Leaderboard Participation</Label>
                      <p className="text-sm text-muted-foreground">Include your data in company leaderboards</p>
                    </div>
                    <Switch
                      checked={preferences.leaderboard_participation}
                      onCheckedChange={(checked) => handleSettingChange("leaderboard_participation", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Analytics Sharing</Label>
                      <p className="text-sm text-muted-foreground">Share anonymized data for sustainability insights</p>
                    </div>
                    <Switch
                      checked={preferences.analytics_sharing}
                      onCheckedChange={(checked) => handleSettingChange("analytics_sharing", checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>Export or delete your account data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-medium">Export Your Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Download a complete copy of all your sustainability data
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
                      <Download className="h-4 w-4 mr-2" />
                      {isExporting ? "Exporting..." : "Export"}
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <div>
                        <h4 className="font-medium text-destructive">Delete Account</h4>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated data
                        </p>
                      </div>
                      <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? "Deleting..." : showDeleteConfirm ? "Confirm Delete" : "Delete"}
                      </Button>
                    </div>

                    {showDeleteConfirm && (
                      <div className="space-y-4">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            This action cannot be undone. All your sustainability data, achievements, and progress will
                            be permanently deleted. Type "DELETE MY ACCOUNT" below to confirm.
                          </AlertDescription>
                        </Alert>
                        <Input
                          placeholder="Type DELETE MY ACCOUNT to confirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="border-destructive focus:border-destructive"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">Settings saved successfully!</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full md:w-auto">
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </div>

            {/* Info Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account Type</span>
                    <span className="font-medium">{accountInfo?.type || "Employee"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium">
                      {accountInfo?.memberSince ? new Date(accountInfo.memberSince).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Data Usage</span>
                    <span className="font-medium">Normal</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    If you have questions about your account or need assistance with settings, contact your IT
                    administrator or support team.
                  </p>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
