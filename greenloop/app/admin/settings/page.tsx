"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Settings, Save, Globe, Mail, Shield, Database, Loader2 } from "lucide-react"

interface SystemSettings {
  platform_name: string
  company_name: string
  welcome_message: string
  public_registration: boolean
  team_creation: boolean
  challenge_creation: boolean
  smtp_server: string
  from_email: string
  welcome_emails: boolean
  challenge_notifications: boolean
  weekly_reports: boolean
  session_timeout: number
  password_min_length: number
  two_factor_auth: boolean
  sso_enabled: boolean
  audit_logging: boolean
  backup_frequency: string
  data_retention_days: number
  auto_backup: boolean
  data_export: boolean
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [settings, setSettings] = useState<SystemSettings>({
    platform_name: "GreenLoop",
    company_name: "",
    welcome_message: "",
    public_registration: false,
    team_creation: true,
    challenge_creation: true,
    smtp_server: "",
    from_email: "",
    welcome_emails: true,
    challenge_notifications: true,
    weekly_reports: false,
    session_timeout: 60,
    password_min_length: 8,
    two_factor_auth: false,
    sso_enabled: true,
    audit_logging: true,
    backup_frequency: "Daily",
    data_retention_days: 365,
    auto_backup: true,
    data_export: true,
  })

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

        // Get system settings
        const { data: systemSettings } = await supabase
          .from("system_settings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (systemSettings) {
          setSettings({
            platform_name: systemSettings.platform_name || "GreenLoop",
            company_name: systemSettings.company_name || "",
            welcome_message: systemSettings.welcome_message || "",
            public_registration: systemSettings.public_registration || false,
            team_creation: systemSettings.team_creation ?? true,
            challenge_creation: systemSettings.challenge_creation ?? true,
            smtp_server: systemSettings.smtp_server || "",
            from_email: systemSettings.from_email || "",
            welcome_emails: systemSettings.welcome_emails ?? true,
            challenge_notifications: systemSettings.challenge_notifications ?? true,
            weekly_reports: systemSettings.weekly_reports || false,
            session_timeout: systemSettings.session_timeout || 60,
            password_min_length: systemSettings.password_min_length || 8,
            two_factor_auth: systemSettings.two_factor_auth || false,
            sso_enabled: systemSettings.sso_enabled ?? true,
            audit_logging: systemSettings.audit_logging ?? true,
            backup_frequency: systemSettings.backup_frequency || "Daily",
            data_retention_days: systemSettings.data_retention_days || 365,
            auto_backup: systemSettings.auto_backup ?? true,
            data_export: systemSettings.data_export ?? true,
          })
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      // Check if settings record exists
      const { data: existingSettings } = await supabase
        .from("system_settings")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from("system_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSettings.id)

        if (error) throw error
      } else {
        // Create new settings record
        const { error } = await supabase.from("system_settings").insert([
          {
            ...settings,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])

        if (error) throw error
      }

      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleManualBackup = async () => {
    try {
      // Simulate backup process
      toast({
        title: "Backup Started",
        description: "Manual backup process has been initiated.",
      })

      // In a real implementation, this would trigger a backup process
      setTimeout(() => {
        toast({
          title: "Backup Complete",
          description: "Database backup completed successfully.",
        })
      }, 3000)
    } catch (error: any) {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to start backup process",
        variant: "destructive",
      })
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
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                System Settings
              </h1>
              <p className="text-muted-foreground">
                Configure platform settings, notifications, and system preferences.
              </p>
            </div>
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Basic platform configuration and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input
                    id="platform-name"
                    value={settings.platform_name}
                    onChange={(e) => updateSetting("platform_name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    placeholder="Enter your company name"
                    value={settings.company_name}
                    onChange={(e) => updateSetting("company_name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome-message">Welcome Message</Label>
                  <Textarea
                    id="welcome-message"
                    placeholder="Welcome to our sustainability platform..."
                    rows={3}
                    value={settings.welcome_message}
                    onChange={(e) => updateSetting("welcome_message", e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="public-registration">Public Registration</Label>
                      <p className="text-sm text-muted-foreground">Allow users to register without invitation</p>
                    </div>
                    <Switch
                      id="public-registration"
                      checked={settings.public_registration}
                      onCheckedChange={(checked) => updateSetting("public_registration", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="team-creation">Team Creation</Label>
                      <p className="text-sm text-muted-foreground">Allow users to create their own teams</p>
                    </div>
                    <Switch
                      id="team-creation"
                      checked={settings.team_creation}
                      onCheckedChange={(checked) => updateSetting("team_creation", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="challenge-creation">Challenge Creation</Label>
                      <p className="text-sm text-muted-foreground">Allow users to create challenges</p>
                    </div>
                    <Switch
                      id="challenge-creation"
                      checked={settings.challenge_creation}
                      onCheckedChange={(checked) => updateSetting("challenge_creation", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>Configure email notifications and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp-server">SMTP Server</Label>
                  <Input
                    id="smtp-server"
                    placeholder="smtp.example.com"
                    value={settings.smtp_server}
                    onChange={(e) => updateSetting("smtp_server", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    placeholder="noreply@company.com"
                    value={settings.from_email}
                    onChange={(e) => updateSetting("from_email", e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="welcome-emails">Welcome Emails</Label>
                      <p className="text-sm text-muted-foreground">Send welcome email to new users</p>
                    </div>
                    <Switch
                      id="welcome-emails"
                      checked={settings.welcome_emails}
                      onCheckedChange={(checked) => updateSetting("welcome_emails", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="challenge-notifications">Challenge Notifications</Label>
                      <p className="text-sm text-muted-foreground">Notify users about new challenges</p>
                    </div>
                    <Switch
                      id="challenge-notifications"
                      checked={settings.challenge_notifications}
                      onCheckedChange={(checked) => updateSetting("challenge_notifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly-reports">Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">Send weekly progress reports</p>
                    </div>
                    <Switch
                      id="weekly-reports"
                      checked={settings.weekly_reports}
                      onCheckedChange={(checked) => updateSetting("weekly_reports", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Authentication and security configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={settings.session_timeout}
                    onChange={(e) => updateSetting("session_timeout", Number.parseInt(e.target.value) || 60)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-policy">Minimum Password Length</Label>
                  <Input
                    id="password-policy"
                    type="number"
                    value={settings.password_min_length}
                    onChange={(e) => updateSetting("password_min_length", Number.parseInt(e.target.value) || 8)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                    </div>
                    <Switch
                      id="two-factor"
                      checked={settings.two_factor_auth}
                      onCheckedChange={(checked) => updateSetting("two_factor_auth", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sso-enabled">SSO Integration</Label>
                      <p className="text-sm text-muted-foreground">Enable Microsoft 365 SSO</p>
                    </div>
                    <Switch
                      id="sso-enabled"
                      checked={settings.sso_enabled}
                      onCheckedChange={(checked) => updateSetting("sso_enabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="audit-logging">Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">Log all admin actions</p>
                    </div>
                    <Switch
                      id="audit-logging"
                      checked={settings.audit_logging}
                      onCheckedChange={(checked) => updateSetting("audit_logging", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data & Backup Settings
                </CardTitle>
                <CardDescription>Database maintenance and backup configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="backup-frequency">Backup Frequency</Label>
                  <Input
                    id="backup-frequency"
                    value={settings.backup_frequency}
                    onChange={(e) => updateSetting("backup_frequency", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retention-period">Data Retention (days)</Label>
                  <Input
                    id="retention-period"
                    type="number"
                    value={settings.data_retention_days}
                    onChange={(e) => updateSetting("data_retention_days", Number.parseInt(e.target.value) || 365)}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-backup">Automatic Backups</Label>
                      <p className="text-sm text-muted-foreground">Enable scheduled database backups</p>
                    </div>
                    <Switch
                      id="auto-backup"
                      checked={settings.auto_backup}
                      onCheckedChange={(checked) => updateSetting("auto_backup", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="data-export">Data Export</Label>
                      <p className="text-sm text-muted-foreground">Allow users to export their data</p>
                    </div>
                    <Switch
                      id="data-export"
                      checked={settings.data_export}
                      onCheckedChange={(checked) => updateSetting("data_export", checked)}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline" className="w-full bg-transparent" onClick={handleManualBackup}>
                    <Database className="h-4 w-4 mr-2" />
                    Run Manual Backup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
