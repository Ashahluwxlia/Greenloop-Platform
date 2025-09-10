"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Target, UserMinus, Loader2 } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"

interface ChallengeActionsProps {
  challengeId: string
  isParticipating: boolean
  isCompleted: boolean
  challengeEnded: boolean
}

export function ChallengeActions({ challengeId, isParticipating, isCompleted, challengeEnded }: ChallengeActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleJoinChallenge = async () => {
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

  const handleLeaveChallenge = async () => {
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

  if (challengeEnded) {
    return (
      <Button size="lg" disabled>
        Challenge Ended
      </Button>
    )
  }

  if (isCompleted) {
    return (
      <Button size="lg" disabled variant="secondary">
        Completed
      </Button>
    )
  }

  if (isParticipating) {
    return (
      <Button size="lg" variant="outline" onClick={handleLeaveChallenge} disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserMinus className="mr-2 h-4 w-4" />}
        Leave Challenge
      </Button>
    )
  }

  return (
    <Button size="lg" onClick={handleJoinChallenge} disabled={isLoading}>
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
      Join Challenge
    </Button>
  )
}
