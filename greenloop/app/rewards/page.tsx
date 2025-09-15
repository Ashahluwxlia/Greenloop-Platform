"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Gift, Trophy, Clock, CheckCircle, Mail, Leaf } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface LevelReward {
  level: number
  reward_id: string
  reward_title: string
  reward_description: string
  reward_type: "physical" | "digital" | "experience" | "privilege"
  already_claimed: boolean
}

interface UserStats {
  total_points: number
  current_level: number
  next_level_points: number
  points_to_next_level: number
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]

export default function RewardsPage() {
  const [rewards, setRewards] = useState<LevelReward[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchRewardsAndStats()
  }, [])

  const fetchRewardsAndStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get user's available rewards
      const { data: rewardsData, error: rewardsError } = await supabase.rpc("get_user_available_rewards", {
        user_uuid: user.id,
      })

      if (rewardsError) throw rewardsError

      // Get user's total points
      const { data: pointsData, error: pointsError } = await supabase
        .from("point_transactions")
        .select("points")
        .eq("user_id", user.id)

      if (pointsError) throw pointsError

      const totalPoints = pointsData?.reduce((sum, transaction) => sum + transaction.points, 0) || 0

      // Calculate current level and progress
      let currentLevel = 0
      for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (totalPoints >= LEVEL_THRESHOLDS[i]) {
          currentLevel = i
          break
        }
      }

      const nextLevelPoints = LEVEL_THRESHOLDS[currentLevel + 1] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]
      const pointsToNextLevel = Math.max(0, nextLevelPoints - totalPoints)

      setRewards(rewardsData || [])
      setUserStats({
        total_points: totalPoints,
        current_level: currentLevel,
        next_level_points: nextLevelPoints,
        points_to_next_level: pointsToNextLevel,
      })
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

  const claimReward = async (rewardId: string, level: number, rewardTitle: string) => {
    try {
      setClaiming(rewardId)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get user profile for email and name
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email, first_name, last_name")
        .eq("user_id", user.id)
        .single()

      const userEmail = profile?.email || user.email || ""
      const userName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "User"

      // Create reward claim
      const { error } = await supabase.from("user_level_rewards").insert({
        user_id: user.id,
        level: level,
        level_reward_id: rewardId,
        user_email: userEmail,
        user_name: userName,
        claim_status: "pending",
      })

      if (error) throw error

      toast({
        title: "Reward Claimed!",
        description: `Your claim for "${rewardTitle}" has been submitted. You'll receive an email from our admin team within 24-48 hours.`,
      })

      // Refresh rewards to show updated claim status
      fetchRewardsAndStats()
    } catch (error) {
      console.error("Error claiming reward:", error)
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
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

  const availableRewards = rewards.filter((r) => !r.already_claimed)
  const claimedRewards = rewards.filter((r) => r.already_claimed)

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
      {userStats && (
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
                <p className="text-2xl font-bold text-cyan-900">{userStats.total_points} Points</p>
                <p className="text-cyan-700">Level {userStats.current_level}</p>
              </div>
              {userStats.current_level < 10 && (
                <div className="text-right">
                  <p className="text-sm text-cyan-600">Next Level</p>
                  <p className="font-semibold text-cyan-800">{userStats.points_to_next_level} points to go</p>
                </div>
              )}
            </div>

            {userStats.current_level < 10 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-cyan-600">
                  <span>Level {userStats.current_level}</span>
                  <span>Level {userStats.current_level + 1}</span>
                </div>
                <div className="w-full bg-cyan-200 rounded-full h-2">
                  <div
                    className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        ((userStats.total_points - LEVEL_THRESHOLDS[userStats.current_level]) /
                          (userStats.next_level_points - LEVEL_THRESHOLDS[userStats.current_level])) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Rewards */}
      {availableRewards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Available Rewards</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableRewards.map((reward) => (
              <Card key={reward.reward_id} className="hover:shadow-lg transition-shadow">
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
                    onClick={() => claimReward(reward.reward_id, reward.level, reward.reward_title)}
                    disabled={claiming === reward.reward_id}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {claiming === reward.reward_id ? (
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

      {/* Claimed Rewards */}
      {claimedRewards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Claimed Rewards</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {claimedRewards.map((reward) => (
              <Card key={reward.reward_id} className="opacity-75">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg text-gray-600">{reward.reward_title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Level {reward.level}
                        </Badge>
                        <Badge className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Claimed
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-gray-500">{reward.reward_description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Rewards Available */}
      {availableRewards.length === 0 && claimedRewards.length === 0 && (
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
