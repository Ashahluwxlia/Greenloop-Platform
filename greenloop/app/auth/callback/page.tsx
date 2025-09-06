"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Leaf, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function AuthCallbackPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get("code")
        const type = searchParams.get("type")

        if (type === "invite") {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get("access_token")
          const refreshToken = hashParams.get("refresh_token")
          const expiresAt = hashParams.get("expires_at")

          if (accessToken && refreshToken) {
            // Set the session using the tokens from the fragment
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (error) {
              throw new Error("Failed to authenticate invitation")
            }

            // Redirect to password setup for invitations
            router.push("/auth/accept-invitation")
            setSuccess(true)
            return
          }

          // Fallback: check if user is already authenticated
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser()

          if (userError || !user) {
            throw new Error("Failed to authenticate invitation")
          }

          // Redirect to password setup for invitations
          router.push("/auth/accept-invitation")
          setSuccess(true)
          return
        }

        if (!code) {
          throw new Error("No authorization code found")
        }

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          throw error
        }

        if (type === "recovery") {
          // For password recovery, redirect to reset password
          router.push("/auth/reset-password")
        } else {
          // Default redirect to dashboard
          router.push("/dashboard")
        }

        setSuccess(true)
      } catch (error: any) {
        console.error("Auth callback error:", error)
        setError(error.message || "Authentication failed")
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router, searchParams, supabase.auth])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Leaf className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">GreenLoop</h1>
            </div>
            <div className="mx-auto p-3 bg-accent/10 rounded-full w-fit">
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
            </div>
            <CardTitle className="text-xl">Processing Authentication</CardTitle>
            <CardDescription>Please wait while we verify your credentials...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 bg-primary rounded-lg">
                <Leaf className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">GreenLoop</h1>
            </div>
            <div className="mx-auto p-3 bg-destructive/10 rounded-full w-fit">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Authentication Failed</CardTitle>
            <CardDescription className="text-balance">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/auth/login">Back to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 bg-primary rounded-lg">
              <Leaf className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">GreenLoop</h1>
          </div>
          <div className="mx-auto p-3 bg-green-100 rounded-full w-fit">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-xl">Authentication Successful</CardTitle>
          <CardDescription>Redirecting you to the appropriate page...</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
