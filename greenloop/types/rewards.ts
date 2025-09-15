export interface RewardClaim {
  id: string
  user_id: string
  level: number
  level_reward_id: string
  claim_status: "pending" | "approved" | "rejected" | "delivered"
  claimed_at: string
  approved_at?: string
  approved_by?: string
  admin_notes?: string
  user_email: string
  user_name: string
  created_at: string
  updated_at: string
  level_rewards?: {
    reward_title: string
    reward_description: string
    reward_type: string
  }
  users?: {
    full_name: string
    email: string
  }
}

export interface LevelReward {
  id: string
  level: number
  reward_title: string
  reward_description: string
  reward_type: "physical" | "digital" | "experience" | "privilege"
  is_active: boolean
  created_at: string
  updated_at: string
}
