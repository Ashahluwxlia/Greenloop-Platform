"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Gift, Trophy, Clock, CheckCircle, Mail, Leaf, XCircle, Truck } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface LevelReward {
  level: number
  reward_title: string
  reward_description: string
  reward_type: "physical" | "digital" | "experience" | "privilege"
}

interface UserReward {
  id: string
  level: number
  status: "pending" | "approved" | "denied" | "delivered"
  claimed_at: string
  admin_notes?: string
  level_rewards: {
    level: number
    reward_title: string
    reward_description: string
  }
}

interface RewardsData {
  currentLevel: number
  totalPoints: number
  levelRewards: LevelReward[]
  userRewards: UserReward[]
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]

export default function RewardsPage() {
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<number | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchRewardsData()
  }, [])

  const fetchRewardsData = async () => {
    try {
      const response = await fetch("/api/rewards")
      if (!response.ok) throw new Error("Failed to fetch rewards")

      const data = await response.json()
      setRewardsData(data)
    } catch (error) {
      console.error("Error fetching rewards:", error)
      toast({
        title: "Error",
        description: "Failed to load rewards. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const claimReward = async (level: number) => {
    try {
      setClaiming(level)

      const response = await fetch("/api/rewards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ level }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to claim reward")
      }

      toast({
        title: "Reward Claimed!",
        description: result.message,
      })

      // Refresh rewards data
      fetchRewardsData()
    } catch (error: any) {
      console.error("Error claiming reward:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to claim reward. Please try again.",
        variant: "destructive",
      })
    } finally {
      setClaiming(null)
    }
  }

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case "physical":
        return <Gift className="h-4 w-4" />
      case "digital":
        return <Trophy className="h-4 w-4" />
      case "experience":
        return <Leaf className="h-4 w-4" />
      case "privilege":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Gift className="h-4 w-4" />
    }
  }

  const getRewardTypeColor = (type: string) => {
    switch (type) {
      case "physical":
        return "bg-blue-100 text-blue-800"
      case "digital":
        return "bg-purple-100 text-purple-800"
      case "experience":
        return "bg-green-100 text-green-800"
      case "privilege":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "denied":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "delivered":
        return <Truck className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "denied":
        return "bg-red-100 text-red-800"
      case "delivered":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!rewardsData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Unable to load rewards</h1>
          <Button onClick={fetchRewardsData}>Try Again</Button>
        </div>
      </div>
    )
  }

  const claimedLevels = new Set(rewardsData.userRewards.map((r) => r.level))
  const availableRewards = rewardsData.levelRewards.filter(
    (reward) => reward.level <= rewardsData.currentLevel && !claimedLevels.has(reward.level),
  )
  const upcomingRewards = rewardsData.levelRewards.filter((reward) => reward.level > rewardsData.currentLevel)

  const nextLevelPoints = LEVEL_THRESHOLDS[rewardsData.currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
  const pointsToNextLevel = Math.max(0, nextLevelPoints - rewardsData.totalPoints)

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Level Rewards</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Complete levels by earning points through sustainability actions and unlock amazing rewards!
        </p>
      </div>

      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-800">
            <Trophy className="h-5 w-5" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-cyan-900">{rewardsData.totalPoints} Points</p>
              <p className="text-cyan-700">Level {rewardsData.currentLevel}</p>
            </div>
            {rewardsData.currentLevel < 10 && (
              <div className="text-right">
                <p className="text-sm text-cyan-600">Next Level</p>
                <p className="font-semibold text-cyan-800">{pointsToNextLevel} points to go</p>
              </div>
            )}
          </div>

          {rewardsData.currentLevel < 10 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-cyan-600">
                <span>Level {rewardsData.currentLevel}</span>
                <span>Level {rewardsData.currentLevel + 1}</span>
              </div>
              <div className="w-full bg-cyan-200 rounded-full h-2">
                <div
                  className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      ((rewardsData.totalPoints - LEVEL_THRESHOLDS[rewardsData.currentLevel - 1]) /
                        (nextLevelPoints - LEVEL_THRESHOLDS[rewardsData.currentLevel - 1])) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Rewards */}
      {availableRewards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Available Rewards</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableRewards.map((reward) => (
              <Card key={reward.level} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{reward.reward_title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Level {reward.level}
                        </Badge>
                        <Badge className={`text-xs ${getRewardTypeColor(reward.reward_type)}`}>
                          <span className="flex items-center gap-1">
                            {getRewardTypeIcon(reward.reward_type)}
                            {reward.reward_type}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm">{reward.reward_description}</CardDescription>

                  <Separator />

                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2 text-sm text-blue-800">
                      <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">How it works:</p>
                        <p className="text-blue-700 mt-1">
                          Click "Claim Reward" and you'll receive an email from our admin team within 24-48 hours with
                          next steps.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => claimReward(reward.level)}
                    disabled={claiming === reward.level}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {claiming === reward.level ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 animate-spin" />
                        Claiming...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Claim Reward
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {rewardsData.userRewards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">My Reward Claims</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rewardsData.userRewards.map((userReward) => (
              <Card key={userReward.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{userReward.level_rewards.reward_title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Level {userReward.level}
                        </Badge>
                        <Badge className={`text-xs ${getStatusColor(userReward.status)} flex items-center gap-1`}>
                          {getStatusIcon(userReward.status)}
                          {userReward.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription className="text-sm">{userReward.level_rewards.reward_description}</CardDescription>

                  <div className="text-xs text-gray-500">
                    Claimed: {new Date(userReward.claimed_at).toLocaleDateString()}
                  </div>

                  {userReward.admin_notes && (
                    <div className="bg-gray-50 p-3 rounded-lg border">
                      <div className="text-xs font-medium text-gray-700 mb-1">Admin Notes:</div>
                      <div className="text-sm text-gray-600">{userReward.admin_notes}</div>
                    </div>
                  )}

                  {userReward.status === "pending" && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-2 text-sm text-yellow-800">
                        <Clock className="h-4 w-4" />
                        <span>Waiting for admin approval (24-48 hours)</span>
                      </div>
                    </div>
                  )}

                  {userReward.status === "approved" && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 text-sm text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <span>Approved! Check your email for next steps.</span>
                      </div>
                    </div>
                  )}

                  {userReward.status === "delivered" && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <Truck className="h-4 w-4" />
                        <span>Delivered! Enjoy your reward.</span>
                      </div>
                    </div>
                  )}

                  {userReward.status === "denied" && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 text-sm text-red-800">
                        <XCircle className="h-4 w-4" />
                        <span>Request denied. See admin notes above.</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Rewards */}
      {upcomingRewards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Upcoming Rewards</h2>
          <p className="text-gray-600">Keep earning points to unlock these rewards!</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingRewards.slice(0, 6).map((reward) => (
              <Card key={reward.level} className="opacity-75 border-dashed">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg text-gray-600">{reward.reward_title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Level {reward.level}
                        </Badge>
                        <Badge className={`text-xs ${getRewardTypeColor(reward.reward_type)}`}>
                          <span className="flex items-center gap-1">
                            {getRewardTypeIcon(reward.reward_type)}
                            {reward.reward_type}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-gray-500">{reward.reward_description}</CardDescription>
                  <div className="mt-3 text-xs text-gray-500">
                    {LEVEL_THRESHOLDS[reward.level - 1] - rewardsData.totalPoints} more points needed
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Rewards Available */}
      {availableRewards.length === 0 && rewardsData.userRewards.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rewards Available Yet</h3>
            <p className="text-gray-600 mb-4">
              Complete more sustainability actions to earn points and unlock level rewards!
            </p>
            <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
              <a href="/actions">Start Earning Points</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
