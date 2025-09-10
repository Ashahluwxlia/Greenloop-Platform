"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Target, UserMinus, Loader2, CheckCircle, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface ChallengeActionsProps {
  challengeId: string
  isParticipating: boolean
  isCompleted: boolean
  challengeEnded: boolean
  challengeType?: string
  userProgress?: number
  targetValue?: number
  targetMetric?: string
}

export function ChallengeActions({
  challengeId,
  isParticipating,
  isCompleted,
  challengeEnded,
  challengeType = "individual",
  userProgress = 0,
  targetValue = 0,
  targetMetric = "actions",
}: ChallengeActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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

      toast.success("Successfully joined challenge!", {
        description: "You can now start logging actions to make progress.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error joining challenge:", error)
      toast.error(error instanceof Error ? error.message : "Failed to join challenge")
    } finally {
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
      router.refresh()
    } catch (error) {
      console.error("Error leaving challenge:", error)
      toast.error(error instanceof Error ? error.message : "Failed to leave challenge")
    } finally {
      setIsLoading(false)
    }
  }

  if (challengeEnded) {
    return (
      <div className="flex flex-col gap-2">
        <Button size="lg" disabled variant="secondary" className="gap-2">
          <Clock className="h-4 w-4" />
          Challenge Ended
        </Button>
        {isParticipating && (
          <p className="text-sm text-muted-foreground text-center">
            Final progress: {userProgress}/{targetValue} {targetMetric}
          </p>
        )}
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="flex flex-col gap-2">
        <Button size="lg" disabled variant="default" className="gap-2 bg-green-600 hover:bg-green-600">
          <CheckCircle className="h-4 w-4" />
          Completed!
        </Button>
        <p className="text-sm text-green-600 text-center font-medium">🎉 Challenge completed successfully!</p>
      </div>
    )
  }

  if (isParticipating) {
    const progressPercentage = targetValue > 0 ? Math.round((userProgress / targetValue) * 100) : 0

    return (
      <div className="flex flex-col gap-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{progressPercentage}%</div>
          <p className="text-sm text-muted-foreground">
            {userProgress} / {targetValue} {targetMetric}
          </p>
        </div>
        <Button
          size="lg"
          variant="outline"
          onClick={handleLeaveChallenge}
          disabled={isLoading}
          className="gap-2 bg-transparent"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
          Leave Challenge
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" onClick={handleJoinChallenge} disabled={isLoading} className="gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
        Join Challenge
      </Button>
      <p className="text-sm text-muted-foreground text-center">
        {challengeType === "team" ? "Join with your team" : "Start your sustainability journey"}
      </p>
    </div>
  )
}
