import { createClient } from "@supabase/supabase-js"
import { rewardEmailTemplates, replaceEmailVariables } from "./email-templates"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface EmailData {
  to: string
  subject: string
  html: string
}

// Send email using Supabase's built-in email functionality
async function sendEmail(emailData: EmailData) {
  try {
    // Use Supabase's auth.admin.inviteUserByEmail as a way to send custom emails
    // This is a workaround since Supabase doesn't have a direct email API
    // You'll need to configure custom email templates in Supabase Dashboard

    console.log("[v0] Sending email:", {
      to: emailData.to,
      subject: emailData.subject,
    })

    // For now, we'll log the email content
    // In production, you would integrate with your email service
    console.log("[v0] Email HTML:", emailData.html)

    return { success: true }
  } catch (error) {
    console.error("[v0] Email sending failed:", error)
    return { success: false, error }
  }
}

export async function sendRewardClaimConfirmation(
  userEmail: string,
  userName: string,
  level: number,
  rewardTitle: string,
  rewardDescription: string,
) {
  const variables = {
    USER_NAME: userName,
    USER_EMAIL: userEmail,
    LEVEL: level.toString(),
    REWARD_TITLE: rewardTitle,
    REWARD_DESCRIPTION: rewardDescription,
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  }

  const html = replaceEmailVariables(rewardEmailTemplates.rewardClaimConfirmation.html, variables)

  return await sendEmail({
    to: userEmail,
    subject: rewardEmailTemplates.rewardClaimConfirmation.subject,
    html,
  })
}

export async function sendAdminRewardNotification(
  adminEmail: string,
  userEmail: string,
  userName: string,
  level: number,
  rewardTitle: string,
  rewardDescription: string,
  claimedAt: string,
) {
  const variables = {
    USER_NAME: userName,
    USER_EMAIL: userEmail,
    LEVEL: level.toString(),
    REWARD_TITLE: rewardTitle,
    REWARD_DESCRIPTION: rewardDescription,
    CLAIMED_AT: new Date(claimedAt).toLocaleDateString(),
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  }

  const html = replaceEmailVariables(rewardEmailTemplates.adminRewardNotification.html, variables)

  return await sendEmail({
    to: adminEmail,
    subject: rewardEmailTemplates.adminRewardNotification.subject,
    html,
  })
}

export async function sendRewardApproved(
  userEmail: string,
  userName: string,
  level: number,
  rewardTitle: string,
  rewardDescription: string,
  adminNotes?: string,
) {
  const variables = {
    USER_NAME: userName,
    USER_EMAIL: userEmail,
    LEVEL: level.toString(),
    REWARD_TITLE: rewardTitle,
    REWARD_DESCRIPTION: rewardDescription,
    ADMIN_NOTES: adminNotes || "",
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  }

  const html = replaceEmailVariables(rewardEmailTemplates.rewardApproved.html, variables)

  return await sendEmail({
    to: userEmail,
    subject: rewardEmailTemplates.rewardApproved.subject,
    html,
  })
}

export async function sendRewardDelivered(
  userEmail: string,
  userName: string,
  level: number,
  rewardTitle: string,
  rewardDescription: string,
  adminNotes?: string,
) {
  const variables = {
    USER_NAME: userName,
    USER_EMAIL: userEmail,
    LEVEL: level.toString(),
    REWARD_TITLE: rewardTitle,
    REWARD_DESCRIPTION: rewardDescription,
    ADMIN_NOTES: adminNotes || "",
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  }

  const html = replaceEmailVariables(rewardEmailTemplates.rewardDelivered.html, variables)

  return await sendEmail({
    to: userEmail,
    subject: rewardEmailTemplates.rewardDelivered.subject,
    html,
  })
}
