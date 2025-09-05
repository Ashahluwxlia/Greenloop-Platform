import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Trophy, Target } from "lucide-react"

export default function CreateChallengePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-balance mb-2">Create New Challenge</h1>
        <p className="text-muted-foreground text-pretty">
          Design a sustainability challenge to engage employees and drive positive environmental impact.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Challenge Details
          </CardTitle>
          <CardDescription>Set up your challenge parameters and goals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Challenge Title</Label>
              <Input id="title" placeholder="e.g., Zero Waste Week Challenge" className="w-full" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Challenge Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select challenge type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="company">Company-wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the challenge goals, rules, and expected outcomes..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <div className="relative">
                <Input id="start-date" type="date" className="w-full" />
                <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <div className="relative">
                <Input id="end-date" type="date" className="w-full" />
                <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Points Reward</Label>
              <Input id="points" type="number" placeholder="100" className="w-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="energy">Energy Conservation</SelectItem>
                  <SelectItem value="waste">Waste Reduction</SelectItem>
                  <SelectItem value="transport">Sustainable Transport</SelectItem>
                  <SelectItem value="water">Water Conservation</SelectItem>
                  <SelectItem value="general">General Sustainability</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-participants">Max Participants</Label>
              <Input id="max-participants" type="number" placeholder="Leave empty for unlimited" className="w-full" />
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <Button className="flex-1">
              <Target className="mr-2 h-4 w-4" />
              Create Challenge
            </Button>
            <Button variant="outline">Save as Draft</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
