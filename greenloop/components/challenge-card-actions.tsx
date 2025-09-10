"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Target, UserMinus, Loader2, Eye, CheckCircle, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface ChallengeCardActionsProps {
  challengeId: string
  isParticipating: boolean
  isCompleted: boolean
  challengeEnded: boolean
  challengeType?: string
  userProgress?: number
  targetValue?: number
  progressPercentage?: number
}

export function ChallengeCardActions({
  challengeId,
  isParticipating,
  isCompleted,
  challengeEnded,
  challengeType = "individual",
  userProgress = 0,
  targetValue = 0,
  progressPercentage = 0,
}: ChallengeCardActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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

      toast.success("Successfully joined challenge!", {
        description: "You can now start making progress!",
      })

      router.refresh()
    } catch (error) {
      console.error("Error joining challenge:", error)
      toast.error(error instanceof Error ? error.message : "Failed to join challenge")
    } finally {
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
      router.refresh()
    } catch (error) {
      console.error("Error leaving challenge:", error)
      toast.error(error instanceof Error ? error.message : "Failed to leave challenge")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {isParticipating && !challengeEnded && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Your Progress</span>
          <div className="flex items-center gap-2">
            <Badge variant={isCompleted ? "default" : "secondary"} className="text-xs">
              {Math.round(progressPercentage)}%
            </Badge>
            {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button className="flex-1" asChild>
          <Link href={`/challenges/${challengeId}`}>
            <Eye className="h-4 w-4 mr-2" />
            View
          </Link>
        </Button>

        {challengeEnded ? (
          <Button variant="secondary" disabled className="flex-1 gap-2">
            <Clock className="h-4 w-4" />
            Ended
          </Button>
        ) : isCompleted ? (
          <Button variant="default" disabled className="flex-1 gap-2 bg-green-600">
            <CheckCircle className="h-4 w-4" />
            Done
          </Button>
        ) : isParticipating ? (
          <Button
            variant="outline"
            onClick={handleLeaveChallenge}
            disabled={isLoading}
            className="flex-1 bg-transparent gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
            Leave
          </Button>
        ) : (
          <Button onClick={handleJoinChallenge} disabled={isLoading} className="flex-1 gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
            Join
          </Button>
        )}
      </div>
    </div>
  )
}
