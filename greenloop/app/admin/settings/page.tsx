"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Settings, Save, Globe, Loader2 } from "lucide-react"

interface SystemSettings {
  platform_name: string
  company_name: string
  challenge_creation_enabled: boolean
  points_per_level: number
  max_team_size: number
  team_creation_enabled: boolean
  user_registration_enabled: boolean
}

const DEFAULT_SETTINGS: SystemSettings = {
  platform_name: "GreenLoop",
  company_name: "GreenLoop",
  challenge_creation_enabled: true,
  points_per_level: 1000,
  max_team_size: 10,
  team_creation_enabled: true,
  user_registration_enabled: true,
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
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

        console.log("[v0] Loading settings via API...")
        const response = await fetch("/api/admin/settings")

        if (response.ok) {
          const result = await response.json()
          console.log("[v0] Loaded settings from API:", result)

          if (result.settings) {
            const transformedSettings: Partial<SystemSettings> = {}

            result.settings.forEach((setting: any) => {
              const key = setting.key as keyof SystemSettings
              let value = setting.setting_value

              // Convert data types based on the data_type field
              if (setting.data_type === "boolean") {
                value = value === "true" || value === true
              } else if (setting.data_type === "number") {
                value = Number.parseInt(value) || 0
              }

              transformedSettings[key] = value
            })

            console.log("[v0] Transformed settings:", transformedSettings)

            setSettings({
              ...DEFAULT_SETTINGS,
              ...transformedSettings,
            })
          }
        } else {
          console.error("[v0] Failed to load settings from API")
          // Keep default settings if API fails
        }
      } catch (error) {
        console.error("[v0] Error loading settings:", error)
        // Keep default settings on error
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      console.log("[v0] Starting to save settings via API:", settings)

      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      })

      const result = await response.json()
      console.log("[v0] API response:", result)

      if (!response.ok) {
        throw new Error(result.error || "Failed to save settings")
      }

      console.log("[v0] Settings saved successfully via API")
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      })
    } catch (error: any) {
      console.error("[v0] Error saving settings:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

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
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-4">
                <Settings className="h-10 w-10 text-primary" />
                System Settings
              </h1>
              <p className="text-lg text-muted-foreground mt-2">Configure basic platform settings and preferences.</p>
            </div>
            <Button onClick={handleSaveSettings} disabled={saving} size="lg" className="px-8 py-3 text-lg">
              {saving ? <Loader2 className="h-5 w-5 mr-3 animate-spin" /> : <Save className="h-5 w-5 mr-3" />}
              Save Changes
            </Button>
          </div>

          <div className="w-full space-y-8">
            {/* Platform Configuration Card */}
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Globe className="h-7 w-7 text-primary" />
                  Platform Configuration
                </CardTitle>
                <CardDescription className="text-lg">Basic platform identity and branding settings</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="platform-name" className="text-lg font-semibold text-foreground">
                      Platform Name
                    </Label>
                    <Input
                      id="platform-name"
                      value={settings?.platform_name || ""}
                      onChange={(e) => updateSetting("platform_name", e.target.value)}
                      className="h-14 text-lg border-2 focus:border-primary transition-colors"
                      placeholder="Enter platform name"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="company-name" className="text-lg font-semibold text-foreground">
                      Company Name
                    </Label>
                    <Input
                      id="company-name"
                      value={settings?.company_name || ""}
                      onChange={(e) => updateSetting("company_name", e.target.value)}
                      className="h-14 text-lg border-2 focus:border-primary transition-colors"
                      placeholder="Enter company name"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Configuration Card */}
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-6 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Settings className="h-7 w-7 text-blue-600" />
                  System Configuration
                </CardTitle>
                <CardDescription className="text-lg">Core system parameters and limits</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="points-per-level" className="text-lg font-semibold text-foreground">
                      Points Required Per Level
                    </Label>
                    <Input
                      id="points-per-level"
                      type="number"
                      value={settings?.points_per_level || 1000}
                      onChange={(e) => updateSetting("points_per_level", Number.parseInt(e.target.value) || 1000)}
                      className="h-14 text-lg border-2 focus:border-primary transition-colors"
                      placeholder="1000"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="max-team-size" className="text-lg font-semibold text-foreground">
                      Maximum Team Size
                    </Label>
                    <Input
                      id="max-team-size"
                      type="number"
                      value={settings?.max_team_size || 10}
                      onChange={(e) => updateSetting("max_team_size", Number.parseInt(e.target.value) || 10)}
                      className="h-14 text-lg border-2 focus:border-primary transition-colors"
                      placeholder="10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature Controls Card */}
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-6 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Settings className="h-7 w-7 text-green-600" />
                  Feature Controls
                </CardTitle>
                <CardDescription className="text-lg">
                  Enable or disable platform features and user capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="flex items-center justify-between p-6 bg-card border-2 rounded-lg hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <Label htmlFor="user-registration" className="text-lg font-semibold text-foreground">
                        User Registration
                      </Label>
                      <p className="text-base text-muted-foreground">Allow new user registrations</p>
                    </div>
                    <Switch
                      id="user-registration"
                      checked={settings?.user_registration_enabled ?? true}
                      onCheckedChange={(checked) => updateSetting("user_registration_enabled", checked)}
                      className="scale-150"
                    />
                  </div>

                  <div className="flex items-center justify-between p-6 bg-card border-2 rounded-lg hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <Label htmlFor="team-creation" className="text-lg font-semibold text-foreground">
                        Team Creation
                      </Label>
                      <p className="text-base text-muted-foreground">Allow users to create their own teams</p>
                    </div>
                    <Switch
                      id="team-creation"
                      checked={settings?.team_creation_enabled ?? true}
                      onCheckedChange={(checked) => updateSetting("team_creation_enabled", checked)}
                      className="scale-150"
                    />
                  </div>

                  <div className="flex items-center justify-between p-6 bg-card border-2 rounded-lg hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <Label htmlFor="challenge-creation" className="text-lg font-semibold text-foreground">
                        Challenge Creation
                      </Label>
                      <p className="text-base text-muted-foreground">Allow users to create their own challenges</p>
                    </div>
                    <Switch
                      id="challenge-creation"
                      checked={settings?.challenge_creation_enabled ?? true}
                      onCheckedChange={(checked) => updateSetting("challenge_creation_enabled", checked)}
                      className="scale-150"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
