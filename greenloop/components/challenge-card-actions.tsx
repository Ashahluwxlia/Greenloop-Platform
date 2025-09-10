"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Target, UserMinus, Loader2, Eye } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

interface ChallengeCardActionsProps {
  challengeId: string
  isParticipating: boolean
  isCompleted: boolean
  challengeEnded: boolean
}

export function ChallengeCardActions({
  challengeId,
  isParticipating,
  isCompleted,
  challengeEnded,
}: ChallengeCardActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleJoinChallenge = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch(`/api/challenges/${challengeId}/join`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to join challenge")
      }

      toast.success("Successfully joined challenge!")
      window.location.reload()
    } catch (error) {
      console.error("Error joining challenge:", error)
      toast.error(error instanceof Error ? error.message : "Failed to join challenge")
      setIsLoading(false)
    }
  }

  const handleLeaveChallenge = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch(`/api/challenges/${challengeId}/leave`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to leave challenge")
      }

      toast.success("Successfully left challenge!")
      window.location.reload()
    } catch (error) {
      console.error("Error leaving challenge:", error)
      toast.error(error instanceof Error ? error.message : "Failed to leave challenge")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button className="flex-1" asChild>
        <Link href={`/challenges/${challengeId}`}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Link>
      </Button>

      {!challengeEnded && !isCompleted && (
        <>
          {isParticipating ? (
            <Button
              variant="outline"
              onClick={handleLeaveChallenge}
              disabled={isLoading}
              className="flex-1 bg-transparent"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserMinus className="mr-2 h-4 w-4" />}
              Leave
            </Button>
          ) : (
            <Button onClick={handleJoinChallenge} disabled={isLoading} className="flex-1">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
              Join
            </Button>
          )}
        </>
      )}
    </div>
  )
}
