"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

interface TrendData {
  month: string
  users: number
  actions: number
}

interface CategoryData {
  name: string
  value: number
  color?: string
}

interface WeeklyData {
  day: string
  actions: number
}

interface UserStatsData {
  total_users: number
  active_users: number
  admin_users: number
  avg_points: number
  total_co2_saved: number
}

interface ChallengeStatsData {
  total_challenges: number
  active_challenges: number
  avg_completion_rate: number
  total_participants: number
}

interface TeamStatsData {
  total_teams: number
  active_teams: number
  avg_team_size: number
  top_performing_teams: Array<{
    name: string
    total_points: number
    total_co2_saved: number
  }>
}

interface DashboardChartsProps {
  trendData: TrendData[]
  categoryData: CategoryData[]
  weeklyData: WeeklyData[]
  userStats?: UserStatsData
  challengeStats?: ChallengeStatsData
  teamStats?: TeamStatsData
}

export function DashboardCharts({
  trendData,
  categoryData,
  weeklyData,
  userStats,
  challengeStats,
  teamStats,
}: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      {(userStats || challengeStats || teamStats) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {userStats && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">User Statistics</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Total Users:</span>
                  <span className="font-medium">{userStats.total_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active Users:</span>
                  <span className="font-medium text-green-600">{userStats.active_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg Points:</span>
                  <span className="font-medium">{Math.round(userStats.avg_points)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total CO₂ Saved:</span>
                  <span className="font-medium text-green-600">{userStats.total_co2_saved}kg</span>
                </div>
              </div>
            </div>
          )}

          {challengeStats && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Challenge Statistics</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Total Challenges:</span>
                  <span className="font-medium">{challengeStats.total_challenges}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active:</span>
                  <span className="font-medium text-blue-600">{challengeStats.active_challenges}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Completion Rate:</span>
                  <span className="font-medium">{Math.round(challengeStats.avg_completion_rate)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Participants:</span>
                  <span className="font-medium">{challengeStats.total_participants}</span>
                </div>
              </div>
            </div>
          )}

          {teamStats && (
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Team Statistics</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Total Teams:</span>
                  <span className="font-medium">{teamStats.total_teams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active Teams:</span>
                  <span className="font-medium text-purple-600">{teamStats.active_teams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg Team Size:</span>
                  <span className="font-medium">{Math.round(teamStats.avg_team_size)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#0088FE" strokeWidth={2} />
              <Line type="monotone" dataKey="actions" stroke="#00C49F" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Action Categories Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Action Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Activity Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="actions" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {teamStats?.top_performing_teams && teamStats.top_performing_teams.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Top Performing Teams</h3>
          <div className="space-y-3">
            {teamStats.top_performing_teams.slice(0, 5).map((team, index) => (
              <div key={team.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{team.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {team.total_points} points • {team.total_co2_saved}kg CO₂ saved
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
